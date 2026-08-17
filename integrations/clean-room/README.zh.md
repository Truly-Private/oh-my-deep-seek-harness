# 主机集成洁净环境检查

[English](README.md) | 中文

这个测试工具会在一次性 Linux 容器中全新安装文档声明的 Pi、Oh My Pi（OMP）与 Hermes Agent 兼容版本。它在不使用 API 密钥的情况下测试候选适配器，并保存与提交匹配的日志以供审查。通过该测试不会让下游脱离候选状态，也不能证明完整主机集成矩阵。

## 前置条件

通过 Moonrepo proto 安装仓库固定的运行时。在 macOS 上，启动 OrbStack 并选择其 Docker context。安装 `just` 作为命令运行器；它不会安装语言运行时。

```bash
proto install
orb start
docker context use orbstack
just cleanroom-doctor
```

Linux CI 可以使用兼容 Docker 引擎。在 macOS 上，如果 context 不是 OrbStack，doctor 会拒绝运行；只有操作人员明确设置 `CLEANROOM_ALLOW_NON_ORBSTACK=1` 时才会例外。

## 运行检查

```bash
just cleanroom-all
just cleanroom-pi
just cleanroom-omp
just cleanroom-hermes
just cleanroom-report
```

每次正常检查都会从按摘要固定的 Ubuntu 镜像执行无缓存构建。构建会下载按校验和固定的 proto 二进制文件，通过 proto 安装 Node、Bun 与 Python，然后从公开包注册表安装精确主机版本。Pi 与 OMP 会把候选桥接打成 `npm pack` tarball，并安装到洁净主机项目中。Hermes 会安装其公开 wheel，并从新的临时 Hermes 主目录加载复制进去的候选插件。

测试容器随后以非特权用户运行，使用只读根文件系统，删除全部 Linux capability，启用 `no-new-privileges`，限制 CPU、内存与进程数量，只提供一个临时文件系统，不挂载卷，并使用 `--network none`。主机主目录、凭据存储、环境变量文件、API 密钥与 Docker socket 都不会进入容器。

## 证据

每次运行都会写入 `.artifacts/clean-room/<UTC run id>/manifest.json`，并为每个所选主机分别保存构建日志与测试日志。清单记录仓库提交、工作树是否有修改、Docker context、精确版本、隔离设置与通过或失败状态。`just cleanroom-report` 会输出最新清单及其目录；发布审查截图应捕获该终端输出与三个主机结果行。

默认兼容版本固定在 [`versions.json`](versions.json)。维护者可以通过 `CLEANROOM_PI_VERSION`、`CLEANROOM_OMP_VERSION` 或 `CLEANROOM_HERMES_VERSION` 探测某个较新主机版本。这类探测只构成该次运行的证据，不会更新支持声明。

## 当前覆盖范围

| 主机 | 洁净环境断言 | 有意保留的限制 |
| --- | --- | --- |
| Pi 0.84.2 | 全新真实 Pi SDK 加载打包扩展，并针对无密钥 ACP fixture 执行 `dsh_delegate`，同时保留 UTF-8 与干净子进程清理。 | 不使用真实模型或凭据。 |
| OMP 17.3.4 | 全新真实 OMP RPC 主机加载打包扩展，并公开 `dsh-bridge-status`。 | 容器不会宣称证明了完整模型驱动 OMP 生命周期矩阵。 |
| Hermes 0.16.0 | 全新真实 Hermes 插件管理器加载插件，并针对无密钥 ACP fixture 分派无需审批的 `dsh_delegate` 调用。 | Hermes 0.16.0 仍不会向插件处理函数提供交互式审批回调或主机取消。 |

共享一致性套件仍负责取消、权限结果、工作区限制、环境变量过滤、协议失败、并发隔离与强制清理。已审查发布仍需要与提交匹配的远程检查以及人类维护者批准。
