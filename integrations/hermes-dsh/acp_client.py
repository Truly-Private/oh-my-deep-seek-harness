"""Small stdlib-only ACP client and process owner for the Hermes plugin."""

from __future__ import annotations

import json
import os
from pathlib import Path
import queue
import signal
import subprocess
import threading
import time
from typing import Any


VERSION = 1
ADAPTER_VERSION = "0.1.0-candidate.0"
BASE_ENV = {
    "LANG", "LC_ALL", "PATH", "SYSTEMROOT", "TEMP", "TERM", "TMP",
    "TMPDIR", "WINDIR",
}


class AcpFailure(RuntimeError):
    """A typed bridge failure safe to return without child diagnostics."""

    def __init__(self, code: str, message: str, status: str = "failed") -> None:
        super().__init__(message)
        self.code = code
        self.status = status


def _failure(call_id: str, code: str, message: str, status: str = "failed", cleanup: str = "clean", session_id=None):
    return {
        "version": VERSION,
        "callId": call_id,
        "sessionId": session_id,
        "status": status,
        "content": [],
        "error": {"code": code, "message": message, "retryable": code in {"BRIDGE_CHILD_EXITED", "BRIDGE_REQUEST_TIMEOUT", "BRIDGE_CLEANUP_FAILED"}},
        "meta": {
            "host": "hermes",
            "adapterVersion": ADAPTER_VERSION,
            "acpVersion": None,
            "cleanup": cleanup,
        },
    }


def _workspace() -> str:
    raw_root = os.environ.get("DSH_BRIDGE_WORKSPACE_ROOT")
    raw_cwd = os.environ.get("TERMINAL_CWD") or os.getcwd()
    root = Path(raw_root or raw_cwd)
    cwd = Path(raw_cwd)
    if not root.is_absolute() or not cwd.is_absolute():
        raise AcpFailure("BRIDGE_WORKSPACE_UNAVAILABLE", "Hermes requires an existing absolute workspace directory.", "incompatible")
    try:
        root = root.resolve(strict=True)
        cwd = cwd.resolve(strict=True)
    except OSError as error:
        raise AcpFailure("BRIDGE_WORKSPACE_UNAVAILABLE", "The configured workspace directory is unavailable.", "incompatible") from error
    if not root.is_dir() or not cwd.is_dir():
        raise AcpFailure("BRIDGE_WORKSPACE_UNAVAILABLE", "The configured workspace is not a directory.", "incompatible")
    if cwd != root and root not in cwd.parents:
        raise AcpFailure("BRIDGE_WORKSPACE_OUTSIDE_ROOT", "The Hermes workspace is outside the configured root.", "denied")
    return str(cwd)


def _child_env() -> dict[str, str]:
    result = {name: os.environ[name] for name in BASE_ENV if name in os.environ}
    for name in filter(None, (part.strip() for part in os.environ.get("DSH_BRIDGE_ENV_ALLOWLIST", "").split(","))):
        if not name.replace("_", "A").isalnum() or not (name[0].isalpha() or name[0] == "_") or name.upper() != name:
            raise AcpFailure("BRIDGE_ENV_NOT_ALLOWED", f"Invalid environment allowlist name: {name}", "denied")
        if name in os.environ:
            result[name] = os.environ[name]
    return result


class _Connection:
    def __init__(self, process: subprocess.Popen[str], permission: str) -> None:
        self.process = process
        self.permission = permission
        self.next_id = 1
        self.pending: dict[int, queue.Queue[dict[str, Any]]] = {}
        self.output: list[str] = []
        self.approval_failure: str | None = None
        self.protocol_failure = threading.Event()
        self.lock = threading.Lock()
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _send(self, message: dict[str, Any]) -> None:
        assert self.process.stdin is not None
        with self.lock:
            self.process.stdin.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
            self.process.stdin.flush()

    def _read(self) -> None:
        assert self.process.stdout is not None
        for line in self.process.stdout:
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                self.protocol_failure.set()
                return
            if "id" in message and ("result" in message or "error" in message):
                target = self.pending.get(message["id"])
                if target is not None:
                    target.put(message)
            elif message.get("method") == "session/update":
                update = message.get("params", {}).get("update", {})
                content = update.get("content", {})
                if update.get("sessionUpdate") == "agent_message_chunk" and content.get("type") == "text":
                    self.output.append(content.get("text", ""))
            elif message.get("method") == "session/request_permission" and "id" in message:
                options = message.get("params", {}).get("options", [])
                chosen = next((item for item in options if item.get("kind") in {"allow_once", "allow_always"}), None)
                if self.permission == "allow" and chosen is not None:
                    outcome = {"outcome": "selected", "optionId": chosen["optionId"]}
                else:
                    self.approval_failure = "denied" if self.permission == "reject" else "unavailable"
                    outcome = {"outcome": "cancelled"}
                self._send({"jsonrpc": "2.0", "id": message["id"], "result": {"outcome": outcome}})

    def request(
        self,
        method: str,
        params: dict[str, Any],
        timeout: float = 30.0,
        cancel_event: threading.Event | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        request_id = self.next_id
        self.next_id += 1
        inbox: queue.Queue[dict[str, Any]] = queue.Queue(maxsize=1)
        self.pending[request_id] = inbox
        self._send({"jsonrpc": "2.0", "id": request_id, "method": method, "params": params})
        deadline = time.monotonic() + timeout
        try:
            while True:
                if cancel_event is not None and cancel_event.is_set():
                    if session_id is not None:
                        self._send({"jsonrpc": "2.0", "method": "session/cancel", "params": {"sessionId": session_id}})
                    raise AcpFailure("BRIDGE_CANCELED", "The host canceled the delegated task.", "canceled")
                if self.protocol_failure.is_set():
                    raise AcpFailure("BRIDGE_PROTOCOL", "The ACP child returned malformed JSON.")
                if self.process.poll() is not None:
                    raise AcpFailure("BRIDGE_CHILD_EXITED", f"The ACP child exited during: {method}")
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise AcpFailure("BRIDGE_REQUEST_TIMEOUT", f"ACP request timed out: {method}")
                try:
                    message = inbox.get(timeout=min(0.1, remaining))
                    break
                except queue.Empty:
                    continue
        finally:
            self.pending.pop(request_id, None)
        if "error" in message:
            raise AcpFailure("BRIDGE_PROTOCOL", f"ACP request failed: {method}")
        return message.get("result", {})


def _cleanup(process: subprocess.Popen[str], grace: float) -> str:
    if process.poll() is not None:
        return "clean"
    if process.stdin is not None:
        process.stdin.close()
    try:
        process.wait(timeout=grace)
        return "clean"
    except subprocess.TimeoutExpired:
        pass
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/pid", str(process.pid), "/t", "/f"], check=False, capture_output=True)
        else:
            os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=grace)
        return "forced"
    except (OSError, subprocess.TimeoutExpired):
        try:
            if os.name == "nt":
                process.kill()
            else:
                os.killpg(process.pid, signal.SIGKILL)
            process.wait(timeout=grace)
            return "forced"
        except (OSError, subprocess.TimeoutExpired):
            return "failed"


def run(prompt: str, call_id: str, cancel_event: threading.Event | None = None) -> dict[str, Any]:
    """Run one Hermes ACP delegation and return the version 1 result."""
    try:
        workspace = _workspace()
        command = os.environ.get("DSH_BRIDGE_COMMAND")
        raw_args = os.environ.get("DSH_BRIDGE_ARGS_JSON")
        if not command or raw_args is None:
            raise AcpFailure(
                "BRIDGE_CHILD_NOT_FOUND",
                "DSH_BRIDGE_COMMAND and DSH_BRIDGE_ARGS_JSON must explicitly configure the ACP launcher.",
                "incompatible",
            )
        try:
            args = json.loads(raw_args)
        except json.JSONDecodeError as error:
            raise AcpFailure("BRIDGE_PROTOCOL", "DSH_BRIDGE_ARGS_JSON must be valid JSON.", "incompatible") from error
        if not isinstance(args, list) or not all(isinstance(item, str) for item in args):
            raise AcpFailure("BRIDGE_PROTOCOL", "DSH_BRIDGE_ARGS_JSON must be a JSON array of strings.", "incompatible")
        permission = os.environ.get("DSH_BRIDGE_PERMISSION", "interactive")
        if permission not in {"interactive", "allow", "reject"}:
            raise AcpFailure("BRIDGE_PROTOCOL", "DSH_BRIDGE_PERMISSION must be interactive, allow, or reject.", "incompatible")
        try:
            request_timeout = float(os.environ.get("DSH_BRIDGE_REQUEST_TIMEOUT_SECONDS", "30"))
            cancel_grace = float(os.environ.get("DSH_BRIDGE_CANCEL_GRACE_SECONDS", "3"))
        except ValueError as error:
            raise AcpFailure("BRIDGE_PROTOCOL", "Bridge timeout settings must be positive numbers.", "incompatible") from error
        if request_timeout <= 0 or cancel_grace <= 0:
            raise AcpFailure("BRIDGE_PROTOCOL", "Bridge timeout settings must be positive numbers.", "incompatible")
        process = subprocess.Popen(
            [command, *args],
            cwd=workspace,
            env=_child_env(),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            encoding="utf-8",
            start_new_session=os.name != "nt",
        )
    except FileNotFoundError:
        return _failure(call_id, "BRIDGE_CHILD_NOT_FOUND", "The configured DSH ACP executable was not found.", "incompatible")
    except AcpFailure as error:
        return _failure(call_id, error.code, str(error), error.status)

    connection = _Connection(process, permission)
    session_id = None
    acp_version = None
    result: dict[str, Any]
    try:
        initialized = connection.request(
            "initialize",
            {"protocolVersion": VERSION, "clientCapabilities": {}},
            request_timeout,
            cancel_event,
        )
        acp_version = initialized.get("protocolVersion")
        if acp_version != VERSION:
            raise AcpFailure("BRIDGE_ACP_CAPABILITY", f"Unsupported ACP version: {acp_version}", "incompatible")
        session = connection.request(
            "session/new",
            {"cwd": workspace, "mcpServers": []},
            request_timeout,
            cancel_event,
        )
        session_id = session.get("sessionId")
        if not isinstance(session_id, str) or not session_id:
            raise AcpFailure("BRIDGE_PROTOCOL", "ACP session/new returned no session id.")
        prompted = connection.request(
            "session/prompt",
            {"sessionId": session_id, "prompt": [{"type": "text", "text": prompt}]},
            request_timeout,
            cancel_event,
            session_id,
        )
        if connection.approval_failure == "unavailable":
            raise AcpFailure("BRIDGE_APPROVAL_UNAVAILABLE", "Hermes has no interactive approval callback for plugin tools.", "incompatible")
        if connection.approval_failure == "denied":
            raise AcpFailure("BRIDGE_APPROVAL_DENIED", "The configured Hermes permission preset denied the request.", "denied")
        if prompted.get("stopReason") == "cancelled":
            raise AcpFailure("BRIDGE_CANCELED", "The ACP task ended as canceled.", "canceled")
        if prompted.get("stopReason") != "end_turn":
            raise AcpFailure("BRIDGE_CHILD_EXITED", f"ACP task stopped before completion: {prompted.get('stopReason')}")
        result = {
            "version": VERSION,
            "callId": call_id,
            "sessionId": session_id,
            "status": "completed",
            "content": [{"type": "text", "text": "".join(connection.output)}],
            "error": None,
            "meta": {"host": "hermes", "adapterVersion": ADAPTER_VERSION, "acpVersion": str(acp_version), "cleanup": "clean"},
        }
    except AcpFailure as error:
        result = _failure(call_id, error.code, str(error), error.status, session_id=session_id)
    cleanup = _cleanup(process, cancel_grace)
    for stream in (process.stdin, process.stdout, process.stderr):
        if stream is not None:
            stream.close()
    if cleanup == "failed":
        result = _failure(call_id, "BRIDGE_CLEANUP_FAILED", "The DSH process tree could not be fully reaped.", cleanup=cleanup, session_id=session_id)
    result["meta"]["cleanup"] = cleanup
    result["meta"]["acpVersion"] = None if acp_version is None else str(acp_version)
    return result


def delegate(prompt: str, call_id: str) -> str:
    """Hermes tool handler wrapper returning UTF-8 JSON."""
    return json.dumps(run(prompt, call_id), ensure_ascii=False)
