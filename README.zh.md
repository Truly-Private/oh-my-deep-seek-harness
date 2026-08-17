# oh-my-deepseek-harness

[English](README.md) | 中文

`oh-my-deepseek-harness` 是优先安全审查的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 下游发行版，主要面向英语用户与集成维护者。安全审查需要更多时间时，本发行版会有意落后于上游。

本发行版优先关注 Pi 与 Oh My Pi（OMP）、Hermes Agent、OpenClaw 和 9Router 的互操作性。[当前集成状态](docs/fork/integrations.md)会明确区分可用路径与兼容性目标。

> [!IMPORTANT]
>
> “已审查”版本表示其锁定的上游提交通过了本仓库记录的检查，并不表示软件不存在漏洞。详见[安全政策](SECURITY.md)与[上游接收政策](docs/fork/upstream-intake.md)。

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。面向 Hermes 的产品和插件思路受到 [Yuan Chenglu 的 `oh-my-deepseek-harness`](https://github.com/yuanchenglu/oh-my-deepseek-harness) 启发。完整署名见 [CREDITS.md](CREDITS.md)。本下游项目独立维护，未获任一上游项目背书。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

<a id="run"></a>

## 快速上手

### 与 coding agent 对话

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。详见 [Web UI 指南](docs/user/guide/index.md)。

### 连接 9Router

在另一个终端中安装并启动 [9Router](https://github.com/decolua/9router)，然后在其管理页面中连接上游提供方或账号、创建 9Router 端点密钥，并记下要使用的准确模型或 combo ID：

```sh
npm install -g 9router
9router
```

在 DeepSeek Harness Web UI 中打开 **Settings → Models → Add a custom provider**，并填写：

| 字段 | 值 |
| --- | --- |
| Provider ID | `9router` |
| Base URL | `http://127.0.0.1:20128/v1` |
| API protocol | `openai-completions` |
| API key | 9Router 管理页面中的端点密钥 |
| Model | 准确的 9Router 模型或 combo ID |

保存提供方、创建会话，并选择一次该提供方的模型。Harness 会将凭据存入 `$DSH_HOME`，并把该选择作为新 Web UI 会话和 headless 运行的默认值。如需使用文件配置，请参阅 [`settings.yaml` 示例](integrations/9router/settings.yaml.example)与 [9Router 集成指南](docs/fork/integrations.md#configure-9router)。

### 运行单个编程任务

按上述步骤选择 9Router 模型后，在允许 agent 修改的目录中运行 headless profile：

```sh
npx @deepseek-ai/dsh --profile headless \
  "Inspect this repository, fix the failing tests, and verify the result."
```

该命令会创建并持久化一个新会话，输出最终回复后退出。详见 [headless profile 参考](apps/cli/README.md#entry-modes)；如需在应用中嵌入同一运行时，请参阅 [Python SDK 指南](docs/user/guide/python-sdk.md)。

### 运行可审计的多 agent 编排

如需让多个 agent 在代码中协调调用带类型的工具，请启用 Code Mode 并明确要求使用工作流：

```sh
DSH_TOOLS_MODE=code npx @deepseek-ai/dsh --profile headless \
  "From a run_code program, use the workflow tool to ask independent agents to review security, tests, and architecture. Return one evidence-backed report."
```

工作流会运行由模型编写的 JavaScript 程序，其 `agent()` 调用会将任务分发到子会话；Code Mode 则允许父 agent 用 TypeScript 组合带类型的工具调用。根会话与子会话持久化到 `~/.dsh/sessions` 或 `$DSH_HOME/sessions`。每个事件均携带单调递增的序号和 epoch 毫秒时间戳；日志包含模型可见输入、工具调用与结果、Code Mode 子分发和工作流生命周期。会话头保留父子血缘。使用同一 harness home 启动 Web UI 即可检查保存的运行记录。

运行 `npx @deepseek-ai/dsh --profile headless --dump-config` 可在不启动 profile 的情况下检查生效的插件树。[插件配置目录](https://deepseek-harness.github.io/deepseek-harness/reference/config-catalog)列出了所有可配置插件，[持久化目录](docs/persistence-catalog.md)则定义了记录的事件类型。

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/Truly-Private/oh-my-deepseek-harness.git
cd oh-my-deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

## 社区与支持

- 欢迎通过 [GitHub Discussions](https://github.com/deepseek-ai/deepseek-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 DeepSeek Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="assets/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="assets/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="assets/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开发

请先阅读[开发指南](docs/development.md)与[架构文档](docs/architecture.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
