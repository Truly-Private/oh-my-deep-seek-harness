# Hermes Agent ACP 插件

[English](README.md) | 中文

这个可选候选插件在 Hermes Agent 中注册 `dsh_delegate`，并通过 Python 标准库驱动配置好的 DeepSeek Harness ACP 服务器。模型只能提供 `prompt`；启动器、工作区、环境变量与权限设置仍由部署方拥有。

## 安装

Hermes 支持安装 Git 仓库中的插件子目录：

```bash
hermes plugins install Truly-Private/oh-my-deepseek-harness/integrations/hermes-dsh --no-enable
hermes plugins enable dsh-bridge
```

启用插件之前应固定或检查仓库提交。本地开发时，启用项目插件，并把此目录放置或链接到 `.hermes/plugins/dsh-bridge/`。

## 配置

使用[共享桥接包](../host-bridge/README.zh.md)记录的同一组 `DSH_BRIDGE_COMMAND`、`DSH_BRIDGE_ARGS_JSON`、`DSH_BRIDGE_WORKSPACE_ROOT` 与 `DSH_BRIDGE_ENV_ALLOWLIST` 设置。Hermes 0.16.0 不会向插件工具处理函数传递交互式审批回调或中止信号，因此插件默认拒绝 ACP 权限请求。已经执行等效审批的外部部署可以设置 `DSH_BRIDGE_PERMISSION=allow`；模型永远不能调用这个预设。

Python 客户端还接受 `DSH_BRIDGE_REQUEST_TIMEOUT_SECONDS` 和 `DSH_BRIDGE_CANCEL_GRACE_SECONDS`，默认值分别为 30 秒和 3 秒。其取消与进程树行为已通过内部事件完成一致性测试，但 Hermes 0.16.0 的插件处理函数无法提供该事件。

ACP 子进程不会继承主目录变量或凭证。请把每个必需的变量名称明确加入 `DSH_BRIDGE_ENV_ALLOWLIST`。

## 验证

运行插件测试前，先通过 Moonrepo proto 安装仓库固定的 Python 版本：

```bash
proto install python
python -W error::ResourceWarning -m unittest discover -s integrations/hermes-dsh/tests -v
```

该插件可以用于不会请求新审批的 ACP 任务。在 Hermes 公开相应能力，并且仓库通过真实插件处理函数证明交互式审批与主机取消之前，完整主机桥接仍是兼容性目标。
