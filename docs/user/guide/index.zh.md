# 使用 Web UI

[English](index.md) | 中文

## 从 npm 启动

在允许 agent 修改的目录中，直接从 npm 运行已评审的下游包：

```sh
npx --yes @truly-private/omdsh@0.0.1 web
```

命令会打印 Web UI 地址；默认地址为 `http://127.0.0.1:3080`。`dsh` 进程会把调用目录作为默认文件系统位置，但新的 Web UI 在添加工作区前不会选中任何工作区。[根目录快速上手](../../../README.md#run)介绍如何用同一 npm 包配置 9Router、运行 headless 任务和可审计的多 agent 编排。

## 配置模型

首次启动时，在**连接 9Router 开始使用**中粘贴端点密钥。随发行版提供的第一方路由已经使用 `http://127.0.0.1:20128/v1`、`openai-completions`、`NINE_ROUTER_API_KEY` 和入门模型 `kr/claude-sonnet-4.5`。如需使用其他模型或 combo，请打开**设置 → 模型 → 9Router → 编辑**，获取可用模型并应用准确的 ID。无需重启服务器。

[模型配置指南](./providers.md)介绍其他提供方和自定义 OpenAI 兼容端点。

## 选择工作区

点击**选择工作区**，添加启动 `dsh` 时所在的项目目录，然后选中它。选中工作区前，会话输入框不可用。

## 运行任务

启动一个会话并发送：

> Summarize this repository and identify its main packages.

agent 可以读取和编辑工作区文件、运行命令、委派工作并维护计划。当操作在当前权限策略下需要审批时，Web UI 会先询问你。

## 继续使用

- [配置模型](./providers.md)
- [使用 Python SDK](./python-sdk.md)
- [使用其他 CLI 模式](../../../apps/cli/README.md)
- [开发插件](../develop/basic/)
