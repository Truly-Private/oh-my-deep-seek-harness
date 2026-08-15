# oh-my-deep-seek-harness

[English](README.md) | 中文

`oh-my-deep-seek-harness` 是优先安全审查的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 下游发行版，主要面向英语用户与集成维护者。安全审查需要更多时间时，本发行版会有意落后于上游。

本发行版优先关注 Pi 与 Oh My Pi（OMP）、Hermes Agent、OpenClaw 和 9Router 的互操作性。[当前集成状态](docs/fork/integrations.md)会明确区分可用路径与兼容性目标。

> [!IMPORTANT]
>
> “已审查”版本表示其锁定的上游提交通过了本仓库记录的检查，并不表示软件不存在漏洞。详见[安全政策](SECURITY.md)与[上游接收政策](docs/fork/upstream-intake.md)。

DeepSeek Harness（`dsh`）是由 [DeepSeek AI](https://deepseek.com) 开发的开源 agent harness（智能体框架）。面向 Hermes 的产品和插件思路受到 [Yuan Chenglu 的 `oh-my-deepseek-harness`](https://github.com/yuanchenglu/oh-my-deepseek-harness) 启发。完整署名见 [CREDITS.md](CREDITS.md)。本下游项目独立维护，未获任一上游项目背书。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 开发者预览

DeepSeek Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

## 运行

### 通过 `npm` 运行

安装 `Node.js`，然后运行：

```sh
npx @deepseek-ai/dsh web
```

该命令会启动 Web UI，默认地址为 `http://127.0.0.1:3080`。详见 [Web UI 指南](docs/user/guide/index.md)。

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/trulyprivate/oh-my-deep-seek-harness.git
cd oh-my-deep-seek-harness
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
