# Pi 与 Oh My Pi ACP 扩展

[English](README.md) | 中文

这个候选包让 Pi 或 Oh My Pi（OMP）注册 `dsh_delegate` 工具，并启动单独配置的 DeepSeek Harness ACP 服务器。模型只能提供委派提示；扩展负责可执行文件、参数、工作区根目录、环境变量允许清单、审批路径、取消与进程树清理。

## 配置 ACP 启动器

加载任一扩展之前，必须显式设置启动器。源码检出可以使用仓库中需要密钥的 ACP 演示：

```bash
export DSH_BRIDGE_COMMAND=pnpm
export DSH_BRIDGE_ARGS_JSON='["--dir","/absolute/path/to/oh-my-deep-seek-harness","run","demo:acp"]'
export DSH_BRIDGE_WORKSPACE_ROOT=/absolute/path/to/allowed/workspace
export DSH_BRIDGE_ENV_ALLOWLIST=DEEPSEEK_API_KEY
export DSH_BRIDGE_REQUEST_TIMEOUT_MS=30000
```

`DSH_BRIDGE_PERMISSION=interactive` 是默认值。Pi 与 OMP 通过各自的确认界面显示每个 ACP 权限请求，并在没有界面时保持关闭。`allow` 与 `reject` 是在模型输入之外设置的部署预设；只有外围主机已提供等效审批策略时才使用 `allow`。

子进程默认只接收区域设置、可执行文件搜索、临时目录和 Windows 必需的运行时变量。主目录变量和凭证均会排除；请把每个必需名称（例如 `DEEPSEEK_API_KEY` 或 `DSH_HOME`）明确加入 `DSH_BRIDGE_ENV_ALLOWLIST`。

`DSH_BRIDGE_REQUEST_TIMEOUT_MS` 限制每个 ACP 请求，默认为 30 秒。`DSH_BRIDGE_CANCEL_GRACE_MS` 限制优雅进程清理，默认为 3 秒。请求超时会返回可重试的 `BRIDGE_REQUEST_TIMEOUT` 结果；主机取消仍返回 `BRIDGE_CANCELED`，并会中断启动、审批和提示等待。

## 在 Pi 中加载

从固定到已检查候选证据提交的检出中直接加载 Pi 入口：

```bash
pi --extension /absolute/path/to/oh-my-deep-seek-harness/integrations/host-bridge/src/pi/index.ts
```

该包还在 `pi.extensions` 下声明了 Pi 入口，因此 Pi 包安装可以从仓库中发现它。运行 `/dsh-bridge-status` 确认发现结果。

## 在 Oh My Pi 中加载

OMP 使用独立入口及自身的 schema 与审批元数据：

```bash
omp --extension /absolute/path/to/oh-my-deep-seek-harness/integrations/host-bridge/src/omp/index.ts
```

运行 `/dsh-bridge-status` 确认发现结果。OMP 17.3.4 需要 Bun 1.3.14 或更高版本。

## 验证

```bash
pnpm --filter @truly-private/dsh-host-bridge typecheck
pnpm --filter @truly-private/dsh-host-bridge test
```

无密钥测试套件使用脚本化 ACP 进程，覆盖 UTF-8 结果、权限结果、取消、强制进程树清理、规范工作区检查、环境变量允许清单、协议失败与并发会话。真实提供方执行仍需要配置好的 DSH 凭据，下游仍处于候选状态。
