from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest


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
        fake = Path(__file__).parents[2] / "host-bridge" / "test-support" / "fake-acp-server.ts"
        tsx = Path(__file__).parents[2] / "host-bridge" / "node_modules" / "tsx" / "dist" / "esm" / "index.mjs"
        if not tsx.exists():
            tsx = Path(__file__).parents[3] / "node_modules" / "tsx" / "dist" / "esm" / "index.mjs"
        os.environ.update({
            "DSH_BRIDGE_COMMAND": os.environ.get("NODE", "node"),
            "DSH_BRIDGE_ARGS_JSON": json.dumps(["--import", str(tsx), str(fake), scenario]),
            "DSH_BRIDGE_WORKSPACE_ROOT": workspace,
            "TERMINAL_CWD": workspace,
            "DSH_BRIDGE_CANCEL_GRACE_SECONDS": "0.25",
            "DSH_BRIDGE_REQUEST_TIMEOUT_SECONDS": "0.25",
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

    def test_consumes_the_shared_conformance_inventory(self):
        fixtures = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(FIXTURE_ROOT.glob("*.json"))]
        self.assertEqual(len(fixtures), 14)
        self.assertEqual(fixtures[0]["name"], "acp-capability-mismatch")


if __name__ == "__main__":
    unittest.main()
