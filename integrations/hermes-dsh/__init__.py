"""Hermes plugin entrypoint for bounded DeepSeek Harness ACP delegation."""

from . import acp_client

delegate = acp_client.delegate


TOOL_SCHEMA = {
    "name": "dsh_delegate",
    "description": "Delegate one bounded task to the configured DeepSeek Harness ACP runtime.",
    "parameters": {
        "type": "object",
        "additionalProperties": False,
        "required": ["prompt"],
        "properties": {
            "prompt": {
                "type": "string",
                "minLength": 1,
                "description": "The task to delegate to DeepSeek Harness.",
            }
        },
    },
}


def _handle_delegate(args, **kwargs):
    """Run one ACP delegation; Hermes supplies no interactive approval callback."""
    return delegate(
        prompt=args["prompt"],
        call_id=kwargs.get("tool_call_id") or kwargs.get("task_id") or "hermes-call",
    )


def register(ctx) -> None:
    """Register the opt-in ``dsh_delegate`` tool with Hermes."""
    if not callable(getattr(ctx, "register_tool", None)):
        raise RuntimeError("BRIDGE_HOST_VERSION: Hermes register_tool is unavailable")
    ctx.register_tool(
        name="dsh_delegate",
        toolset="dsh",
        schema=TOOL_SCHEMA,
        handler=_handle_delegate,
        description=TOOL_SCHEMA["description"],
        emoji="🔒",
    )
