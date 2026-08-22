# oh-my-deep-seek-harness

[English](README.md) | 中文

<p align="center">
  <img src="assets/omdsh-readme-hero.jpg" alt="oh-my-deep-seek-harness 骑鲸者徽章" width="1000">
</p>

`oh-my-deep-seek-harness` 是优先安全审查的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 下游发行版，主要面向英语用户与集成维护者。安全审查需要更多时间时，本发行版会有意落后于上游。

本发行版优先关注 Pi 与 Oh My Pi（OMP）、Hermes Agent、OpenClaw 和 9Router 的互操作性。[当前集成状态](docs/fork/integrations.zh.md)会明确区分可用路径与兼容性目标。

> [!IMPORTANT]
>
> “已审查”版本表示其锁定的上游提交通过了本仓库记录的检查，并不表示软件不存在漏洞。详见[安全政策](SECURITY.md)与[上游接收政策](docs/fork/upstream-intake.zh.md)。

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。面向 Hermes 的产品和插件思路受到 [Yuan Chenglu 的 `oh-my-deepseek-harness`](https://github.com/yuanchenglu/oh-my-deepseek-harness) 启发。完整署名见 [CREDITS.md](CREDITS.md)。本下游项目独立维护，未获任一上游项目背书。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

<a id="run"></a>

## 快速上手

> [!NOTE]
>
> 已评审的下游包是 `@truly-private/omdsh`。npm 包名必须小写，因此即使 GitHub 组织名是 `Truly-Private`，也要使用此拼写。如需锁定首次发布的准确版本，请使用 `@0.0.1`。

### 通过 9Router 使用 DeepSeek Harness

此路径通过 [9Router](https://github.com/decolua/9router) 发送模型请求。DeepSeek Harness 不需要 `DEEPSEEK_API_KEY`；9Router 持有你所连接上游提供方与账号的凭据。

#### 1. 安装前置条件

安装 Node.js `^22.19.0` 或 `>=24.0.0`，然后确认 npm 能解析此发行版：

```sh
npx @truly-private/omdsh web
```

该命令默认会在 `http://127.0.0.1:3080` 启动 Web UI，本机启动时还会用默认浏览器打开页面。通过 SSH 启动时只打印宿主机 URL，因为本地转发地址由 SSH 客户端或编辑器持有。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

<a id="run-from-source"></a>

### 从源码运行

当 harness 仓库本身就是工作区时，使用源码启动器：

```sh
git clone https://github.com/Truly-Private/oh-my-deepseek-harness.git
cd oh-my-deepseek-harness
pnpm install
pnpm dsh web
```

`pnpm run build` 会准备仓库产物。`pnpm dsh web` 会直接使用这些已构建产物，不会重新构建。

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
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-assistant.png" alt="DeepSeek Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.deepseek.com/harness/readme/community-wecom-survey.png" alt="DeepSeek Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.deepseek.com/harness/readme/community-wechat-official-account.png" alt="DeepSeek Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
