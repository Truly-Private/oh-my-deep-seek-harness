# Pi 对比测试台

[English](README.md) | 中文

此测试台在两个独立的全新 Linux 容器中，把同一项较大型编码任务分别交给两个 Pi 安装：一个 Pi 使用内置编码工具，另一个 Pi 加载候选 `oh-my-deepseek-harness` 扩展并把任务委派给 DeepSeek Harness ACP 运行时。测试台会保留生成的工作区、日志、生产构建结果、界面检查以及桌面端和移动端截图，供并排评审。单次运行只提供对比证据，不构成统计控制下的性能结论，也不能证明候选集成已经完成审核。

## 前置条件

使用 Moonrepo proto 安装仓库锁定的运行时；在 macOS 上启动 9Router 和 OrbStack，选择 OrbStack Docker 上下文；随后把从 9Router 控制面板复制的网关密钥导出为 `NINE_ROUTER_API_KEY`。9Router 必须在 `http://127.0.0.1:20128/v1` 公布 `trifecta` 模型；智能体容器通过 `host.docker.internal` 访问同一实例。仓库 Docker 上下文会排除本地环境文件、包管理器凭据、Pi 认证文件和 Harness 托管凭据文件。测试台不会复制主目录、CLI 登录状态、9Router 数据库或凭据存储；Docker 只把具名的 9Router 密钥转发给每个智能体入口程序。入口程序会在生成代码所执行的命令启动前删除该变量。Harness 路径不在 ACP 环境中转发密钥，而是向 ACP 运行时提供位于可写工作区和 shell 沙箱之外、权限为 0600 的临时凭据文件。

```bash
proto install
9router --no-browser
orb start
docker context use orbstack
export NINE_ROUTER_API_KEY='copy the API key from the 9Router dashboard'
just comparison-doctor
```

真实运行会调用模型 API，并可能产生服务商费用。`just comparison-build` 不需要密钥，可在消耗模型 token 前验证两个智能体镜像和截图评估器能否成功构建。

## 运行测试台

```bash
just comparison-build
just comparison-all
just comparison-report
```

诊断单条路径时可使用 `just comparison-baseline` 或 `just comparison-harness`。正常运行会进行无缓存的全新镜像构建；`COMPARISON_REUSE_BUILD_CACHE=1` 仅用于本地迭代，因为使用缓存的运行不属于全新安装证据。`COMPARISON_PI_VERSION` 可在不改变文档锁定版本的情况下探测另一 Pi 版本。

两条路径使用完全相同的任务文本 [`game-prompt.txt`](game-prompt.txt)。任务要求智能体构建一个原创 Three.js 游戏：把计时下落方块循环与可复现的 6×6 空间拼图结合，包含七个障碍柱、可重新移动的已放置方块、失败动画、无限计时关卡以及本地好友挑战。任务固定可观察的游戏行为和评估要求，同时把美术方向、架构和一个原创特性留给智能体决定。

## 方法参考

两条路径使用锁定的 Pi 版本、`9router/trifecta` 路由、字节完全一致的提示词、空输出目录，以及相同的 CPU、内存、进程数和墙钟时间限制。测试台不会读取或转发 DeepSeek 服务商凭据。基线路径向 Pi 提供 `read`、`bash`、`edit` 和 `write`。Harness 路径加载打包后的 Pi 扩展并直接调用 `dsh_delegate`，不会额外消耗一次 Pi 模型调用来决定是否委派。DeepSeek Harness ACP 服务使用 `workspace-write`，从上文所述的临时文件读取 9Router 凭据，桥接环境允许列表只公开非敏感的 Harness 配置，并从当前仓库提交启动。

智能体容器需要联网调用模型 API，并安装生成应用的依赖。容器以非 root 用户运行，移除 Linux capabilities，启用 `no-new-privileges`，限制资源，使用临时目录，且只有一个用于输出的可写绑定挂载。生成代码所执行的命令不会继承 API 密钥变量。容器不会接触 Docker socket 或宿主凭据路径。

生成结束后，独立的评估器容器只接收工作区和该路径的证据目录。达到墙钟时间限制的路径会记录为 `timed_out`，但评估器仍会检查其部分工作区，后续路径也会继续运行。评估器没有网络或凭据，根文件系统只读；它会在可用时运行项目测试，强制执行 `npm run build`，启动约定的本地开发服务器，检查稳定的 `data-testid` 标记，并使用种子 `314159` 生成 `desktop-start.png`、`desktop-playing.png` 和 `mobile-start.png`。缺少测试命令会记录为对比警告；构建失败、服务不可用、界面标记缺失或截图失败都会使该路径失败。

## 证据与解读

每次运行都会写入 `.artifacts/comparison/<UTC run id>/manifest.json`。清单记录仓库提交和工作树状态、Docker 上下文、精确版本、提示词哈希、路径顺序、资源限制、耗时、可用的 Pi 用量、桥接清理状态、生成文件哈希、界面检查和截图名称。生成文件清单会排除依赖目录和 Playwright 浏览器缓存，因为它们属于执行工具而不是应用输出。各路径目录保留工作区以及构建、测试、服务、智能体、截图和镜像构建日志。

评审生成的游戏时，应检查功能完整性、视觉质量、规则符合度、可维护性以及无效操作后的恢复。服务商负载和模型输出的非确定性会影响单次结果，因此应重复试验并轮换清单中记录的路径顺序，再形成更广泛的结论。此测试台不会提升任何集成状态，不提供好友分数服务，也不会发布任何生成的游戏。
