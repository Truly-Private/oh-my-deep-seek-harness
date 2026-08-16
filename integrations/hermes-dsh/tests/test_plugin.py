from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor


PLUGIN_ROOT = Path(__file__).parents[1]
FIXTURE_ROOT = Path(__file__).parents[2] / "host-bridge" / "conformance"


def load_plugin():
    spec = importlib.util.spec_from_file_location(
        "hermes_dsh",
        PLUGIN_ROOT / "__init__.py",
        submodule_search_locations=[str(PLUGIN_ROOT)],
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class FakeContext:
    def __init__(self):
        self.tools = []

    def register_tool(self, **kwargs):
        self.tools.append(kwargs)


class HermesPluginTests(unittest.TestCase):
    def setUp(self):
        self.previous = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.previous)

    def configure(self, scenario: str):
        workspace = tempfile.mkdtemp(prefix="dsh-hermes-")
        self.addCleanup(shutil.rmtree, workspace, True)
        os.environ.pop("DSH_BRIDGE_ENV_ALLOWLIST", None)
        os.environ.pop("DSH_BRIDGE_PERMISSION", None)
        fake = Path(__file__).parents[2] / "host-bridge" / "test-support" / "fake-acp-server.ts"
        tsx = Path(__file__).parents[2] / "host-bridge" / "node_modules" / "tsx" / "dist" / "esm" / "index.mjs"
        if not tsx.exists():
            tsx = Path(__file__).parents[3] / "node_modules" / "tsx" / "dist" / "esm" / "index.mjs"
        os.environ.update({
            "DSH_BRIDGE_COMMAND": os.environ.get("NODE", "node"),
            "DSH_BRIDGE_ARGS_JSON": json.dumps(["--import", str(tsx), str(fake), scenario]),
            "DSH_BRIDGE_WORKSPACE_ROOT": workspace,
            "TERMINAL_CWD": workspace,
            "DSH_BRIDGE_CANCEL_GRACE_SECONDS": "1",
            "DSH_BRIDGE_REQUEST_TIMEOUT_SECONDS": "2",
        })

    def test_registers_prompt_only_tool(self):
        plugin = load_plugin()
        context = FakeContext()
        plugin.register(context)
        self.assertEqual([tool["name"] for tool in context.tools], ["dsh_delegate"])
        properties = context.tools[0]["schema"]["parameters"]["properties"]
        self.assertEqual(list(properties), ["prompt"])

    def test_utf8_success(self):
        plugin = load_plugin()
        self.configure("success")
        result = plugin.acp_client.run("你好, Hermes 👋", "hermes-1")
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["content"][0]["text"], "fixture: 你好, Hermes 👋")

    def test_noisy_child_stderr_cannot_block_protocol_progress(self):
        plugin = load_plugin()
        self.configure("noisy-stderr")
        result = plugin.acp_client.run("stderr", "hermes-stderr")
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["content"][0]["text"], "fixture: stderr")

    def test_internal_cancel_event_reaches_acp_and_reaps_the_child(self):
        plugin = load_plugin()
        for scenario, expected_cleanup in (("hang", "clean"), ("ignore-cancel", "forced")):
            with self.subTest(scenario=scenario):
                self.configure(scenario)
                canceled = threading.Event()
                timer = threading.Timer(0.1, canceled.set)
                timer.start()
                self.addCleanup(timer.cancel)
                result = plugin.acp_client.run("cancel", f"hermes-{scenario}", canceled)
                self.assertEqual(result["status"], "canceled")
                self.assertEqual(result["error"]["code"], "BRIDGE_CANCELED")
                self.assertEqual(result["meta"]["cleanup"], expected_cleanup)

    def test_permission_is_fail_closed_without_host_ui(self):
        plugin = load_plugin()
        self.configure("permission")
        result = plugin.acp_client.run("permission", "hermes-2")
        self.assertEqual(result["status"], "incompatible")
        self.assertEqual(result["error"]["code"], "BRIDGE_APPROVAL_UNAVAILABLE")

    def test_rejects_terminal_workspace_outside_configured_root(self):
        plugin = load_plugin()
        with tempfile.TemporaryDirectory(prefix="dsh-hermes-root-") as root:
            with tempfile.TemporaryDirectory(prefix="dsh-hermes-outside-") as outside:
                os.environ["DSH_BRIDGE_WORKSPACE_ROOT"] = root
                os.environ["TERMINAL_CWD"] = outside
                result = plugin.acp_client.run("outside", "hermes-3")
        self.assertEqual(result["status"], "denied")
        self.assertEqual(result["error"]["code"], "BRIDGE_WORKSPACE_OUTSIDE_ROOT")

    def test_rejects_malformed_configuration_without_starting_a_child(self):
        plugin = load_plugin()
        with tempfile.TemporaryDirectory(prefix="dsh-hermes-root-") as root:
            os.environ.update({
                "DSH_BRIDGE_COMMAND": "definitely-not-a-real-command",
                "DSH_BRIDGE_ARGS_JSON": "not-json",
                "DSH_BRIDGE_WORKSPACE_ROOT": root,
                "TERMINAL_CWD": root,
            })
            result = plugin.acp_client.run("malformed", "hermes-4")
        self.assertEqual(result["status"], "incompatible")
        self.assertEqual(result["error"]["code"], "BRIDGE_PROTOCOL")

    def test_executes_the_shared_conformance_inventory(self):
        plugin = load_plugin()
        fixtures = {
            item["name"]: item
            for item in (json.loads(path.read_text(encoding="utf-8")) for path in sorted(FIXTURE_ROOT.glob("*.json")))
        }
        self.assertEqual(len(fixtures), 14)
        for name, fixture in fixtures.items():
            with self.subTest(name=name):
                if name == "host-version-mismatch":
                    with self.assertRaisesRegex(RuntimeError, "BRIDGE_HOST_VERSION"):
                        plugin.register(object())
                    status, error_code = "incompatible", "BRIDGE_HOST_VERSION"
                elif name == "workspace-outside-root":
                    with tempfile.TemporaryDirectory(prefix="dsh-hermes-root-") as root:
                        with tempfile.TemporaryDirectory(prefix="dsh-hermes-outside-") as outside:
                            os.environ["DSH_BRIDGE_WORKSPACE_ROOT"] = root
                            os.environ["TERMINAL_CWD"] = outside
                            result = plugin.acp_client.run("outside", "conformance-workspace-outside")
                    status, error_code = result["status"], result["error"]["code"]
                elif name == "workspace-unavailable":
                    with tempfile.TemporaryDirectory(prefix="dsh-hermes-root-") as root:
                        os.environ["DSH_BRIDGE_WORKSPACE_ROOT"] = root
                        os.environ["TERMINAL_CWD"] = str(Path(root) / "missing")
                        result = plugin.acp_client.run("missing", "conformance-workspace-missing")
                    status, error_code = result["status"], result["error"]["code"]
                else:
                    self.configure("success" if fixture["scenario"] in {"environment", "host-loader"} else fixture["scenario"])
                    if name == "env-disallowed":
                        os.environ["DSH_BRIDGE_ENV_ALLOWLIST"] = "not-allowed"
                    elif name == "permission-allow":
                        os.environ["DSH_BRIDGE_PERMISSION"] = "allow"
                    elif name == "permission-deny":
                        os.environ["DSH_BRIDGE_PERMISSION"] = "reject"
                    canceled = None
                    if name in {"cancel-ack", "cancel-force-reap"}:
                        canceled = threading.Event()
                        timer = threading.Timer(0.1, canceled.set)
                        timer.start()
                        self.addCleanup(timer.cancel)
                    if name == "concurrent-isolation":
                        with ThreadPoolExecutor(max_workers=2) as executor:
                            first, second = [future.result() for future in (
                                executor.submit(plugin.acp_client.run, "first", "conformance-a"),
                                executor.submit(plugin.acp_client.run, "second", "conformance-b"),
                            )]
                        self.assertNotEqual(first["sessionId"], second["sessionId"])
                        result = first
                    else:
                        result = plugin.acp_client.run("你好, conformance 👋", f"conformance-{name}", canceled)
                    status = result["status"]
                    error_code = None if result["error"] is None else result["error"]["code"]
                self.assertEqual(status, fixture["expectedStatus"])
                self.assertEqual(error_code, fixture["expectedError"])


if __name__ == "__main__":
    unittest.main()
