# 集成状态

[English](integrations.md) | 中文

本参考将模型提供方互操作性与主机智能体互操作性分开说明。共享 OpenAI 兼容端点不会让两个智能体运行时可以互换：主机集成还需要工具、权限、取消、会话与结果语义。

| 目标 | 当前级别 | 支持路径 | 下一兼容性里程碑 |
| --- | --- | --- | --- |
| Pi 提供方库 | 上游可用 | `dsh-llm-pi-ai` 在 DeepSeek Harness 内提供多模型提供方路由。 | 持续测试 DeepSeek 模型与网关特定行为。 |
| Pi 编程智能体 | 兼容性目标 | Pi 与 `dsh` 可以作为独立智能体连接同一个模型提供方或网关。 | 增加包含取消、权限与会话记录测试的可执行智能体桥接。 |
| Oh My Pi（OMP） | 兼容性目标 | OMP 与 `dsh` 可以各自使用同一个 DeepSeek 或 9Router 端点。 | 在 OMP 会话中测试委派的 `dsh` 工具或 ACP 桥接。 |
| Hermes Agent | 兼容性目标 | Hermes 可以独立使用 DeepSeek；本仓库尚未提供 Hermes 插件。 | 基于稳定的 `dsh` 自动化接口构建 Hermes 插件，并且不修改 Hermes 核心。 |
| OpenClaw | 兼容性目标 | OpenClaw 与 `dsh` 可以各自使用同一个本地 9Router 端点。 | 增加具备明确工作区与审批边界的 OpenClaw 适配器。 |
| 9Router | 目前可配置 | 通过 `llm-pi-ai` 把 9Router 添加为 OpenAI 兼容自定义提供方。 | 增加无密钥本地网关发现与请求路径集成测试。 |

## 配置 9Router

在本地启动 9Router，并确认其 OpenAI 兼容端点与模型标识符。在 DeepSeek Harness Web UI 中打开 **Settings -> Models -> Add a custom provider**，然后使用：

| 字段 | 值 |
| --- | --- |
| Provider ID | `9router` |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| API key | 9Router 密钥，或本地端点要求的非秘密占位值 |
| Model | 9Router 安装返回的精确模型 ID |

对于文件配置，把 [`integrations/9router/settings.yaml.example`](../../integrations/9router/settings.yaml.example) 合并到 `$DSH_HOME/settings.yaml` 的 `llm-pi-ai` 部分，替换模型 ID 占位符，并导出所引用的密钥。除非网关已经为远程访问进行有意加固，否则请保留回环地址。

## 桥接要求

自动化测试证明以下所有条件之前，主机智能体集成都不算完成：

- 主机启动和停止 `dsh` 时不会留下孤儿进程；
- 提示与工具结果保留 UTF-8 和结构化数据；
- 取消请求可以到达正在运行的任务；
- 工作区访问是显式的，并且不会静默扩大；
- 秘密保持为引用，而不会进入提示或日志内容；
- 操作主机的人始终可以看到审批请求；
- 上游兼容性破坏会明确失败，而不会回退到更宽的访问权限。

这些要求有意让 Hermes、OpenClaw、Pi 与 OMP 保持“兼容性目标”状态，直到其适配器具有可执行证据。
