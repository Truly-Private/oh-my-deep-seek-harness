# 集成状态

[English](integrations.md) | 中文

本参考将模型提供方互操作性与主机智能体互操作性分开说明。共享 OpenAI 兼容端点不会让两个智能体运行时可以互换：主机集成还需要工具、权限、取消、会话与结果语义。

| 目标 | 当前级别 | 支持路径 | 下一兼容性里程碑 |
| --- | --- | --- | --- |
| Pi 提供方库 | 上游可用 | `dsh-llm-pi-ai` 在 DeepSeek Harness 内提供多模型提供方路由。 | 持续测试 DeepSeek 模型与网关特定行为。 |
| Pi 编程智能体 | 候选扩展 | [Pi ACP 扩展](../../integrations/host-bridge/README.md)注册 `dsh_delegate`；真实加载器与无密钥 ACP 约定已在本地通过。 | 针对精确发布提交证明模型驱动工具调用、主机取消与审批会话记录。 |
| Oh My Pi（OMP） | 候选扩展 | [OMP ACP 扩展](../../integrations/host-bridge/README.md)通过独立 OMP 入口注册同一工具；真实加载器与无密钥 ACP 约定已在本地通过。 | 在 Bun 上证明完整 OMP 主机矩阵，并记录与提交匹配的会话记录。 |
| Hermes Agent | 候选插件；完整桥接目标 | [Hermes ACP 插件](../../integrations/hermes-dsh/README.md)执行无需审批的 ACP 任务，并在没有安全回调时拒绝权限请求。 | 在宣称主机桥接完整之前，增加并证明真实 Hermes 审批与取消回调。 |
| OpenClaw | 兼容性目标 | OpenClaw 与 `dsh` 可以各自使用同一个本地 9Router 端点。 | 增加具备明确工作区与审批边界的 OpenClaw 适配器。 |
| 9Router | 第一方提供方 | base bundle 通过 `llm-pi-ai` 提供 `9router` 路由，包括首次引导、本地端点默认值、安全凭据引用、模型发现和下游默认模型。 | 针对固定 9Router 版本增加真实请求路径集成测试。 |

## 配置 9Router

在本地启动 9Router，连接 Kiro AI 或其他上游提供方，然后复制端点密钥。首次启动时，把该密钥粘贴到**连接 9Router 开始使用**中。base bundle 已提供：

| 字段 | 值 |
| --- | --- |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| Credential reference | `NINE_ROUTER_API_KEY` |
| Starter model | `kr/claude-sonnet-4.5` |

该路由会直接以 **9Router** 显示在 Models 页面中，无需使用自定义提供方表单。选择 **Edit**，再选择 **Fetch available models**，即可把入门模型替换为安装返回的任意准确模型或 combo ID。对于文件覆盖，把 [`integrations/9router/settings.yaml.example`](../../integrations/9router/settings.yaml.example) 合并到 `$DSH_HOME/settings.yaml` 的 `llm-pi-ai` 部分，替换模型 ID 占位符，并导出所引用的密钥。除非网关已经为远程访问进行有意加固，否则请保留回环地址。

## 桥接要求

自动化测试证明以下所有条件之前，主机智能体集成都不算完成：

- 主机启动和停止 `dsh` 时不会留下孤儿进程；
- 提示与工具结果保留 UTF-8 和结构化数据；
- 取消请求可以到达正在运行的任务；
- 工作区访问是显式的，并且不会静默扩大；
- 秘密保持为引用，而不会进入提示或日志内容；
- 操作主机的人始终可以看到审批请求；
- 上游兼容性破坏会明确失败，而不会回退到更宽的访问权限。

候选 Pi 与 OMP 扩展已有无密钥约定与加载器证据，但尚未满足完整主机矩阵。Hermes 仍是完整桥接兼容性目标，因为 Hermes 0.16.0 插件处理函数既不公开交互式审批回调，也不公开主机取消。OpenClaw 仍是兼容性目标，本仓库没有提供其适配器。

## 洁净环境安装证据

以 [`just` 为入口的洁净环境测试工具](../../integrations/clean-room/README.md)会在一次性容器中全新安装文档声明的 Pi、OMP 与 Hermes 版本。Pi 与 OMP 从洁净主机项目加载打包后的桥接；Hermes 通过真实插件管理器加载候选插件。测试执行无密钥、离线、非 root、根文件系统只读且不接触凭据，并保留提交与版本清单以及各主机日志。这些证据加强候选路径，但不能满足上文仍缺少的审批、取消与模型驱动里程碑。
