"""Load and execute the DSH plugin through a fresh Hermes installation."""

from __future__ import annotations

import json
import os
from pathlib import Path
import shutil


home = Path("/tmp/home")
plugin_target = home / ".hermes" / "plugins" / "dsh-bridge"
workspace = Path("/tmp/workspace")
plugin_target.parent.mkdir(parents=True, exist_ok=True)
workspace.mkdir(parents=True, exist_ok=True)
shutil.copytree("/opt/hermes-plugin", plugin_target)
(home / ".hermes" / "config.yaml").write_text(
    "plugins:\n  enabled:\n    - dsh-bridge\n",
    encoding="utf-8",
)

os.environ.update(
    {
        "HOME": str(home),
        "DSH_BRIDGE_COMMAND": "node",
        "DSH_BRIDGE_ARGS_JSON": json.dumps(
            [
                "--import",
                "/opt/harness/node_modules/tsx/dist/esm/index.mjs",
                "/opt/bridge/test-support/fake-acp-server.ts",
                "success",
            ]
        ),
        "DSH_BRIDGE_PERMISSION": "reject",
        "DSH_BRIDGE_WORKSPACE_ROOT": str(workspace),
        "TERMINAL_CWD": str(workspace),
    }
)

from hermes_cli.plugins import discover_plugins, get_plugin_manager  # noqa: E402
from tools.registry import registry  # noqa: E402


discover_plugins(force=True)
plugins = get_plugin_manager().list_plugins()
plugin = next((entry for entry in plugins if entry["name"] == "dsh-bridge"), None)
if plugin is None or not plugin["enabled"] or plugin["tools"] != 1 or plugin["error"]:
    raise RuntimeError(f"Hermes did not activate dsh-bridge: {plugin!r}")

result = registry.dispatch(
    "dsh_delegate",
    {"prompt": "你好 from clean-room Hermes 👋"},
    tool_call_id="hermes-clean-room",
)
if isinstance(result, str):
    result = json.loads(result)
if not isinstance(result, dict) or result.get("status") != "completed":
    raise RuntimeError(f"Unexpected Hermes bridge result: {result!r}")

print(
    json.dumps(
        {
            "host": "hermes",
            "hostVersion": os.environ.get("CLEANROOM_HOST_VERSION"),
            "plugin": plugin["name"],
            "status": result["status"],
            "cleanup": result["meta"]["cleanup"],
            "sessionId": "<session>" if result.get("sessionId") else None,
            "text": result["content"],
        },
        ensure_ascii=False,
    )
)
