# Agent Note: 下游 npm scope 与首次公开发布

Status: implemented

[English](2026-08-20-downstream-npm-scope.md) | 中文

## Problem

下游仓库需要一条指向自身已评审发行版的 npm 命令。它不能向上游的 `@deepseek-ai` namespace 发布，而且只修改 CLI 包会使其运行时依赖图继续指向上游 harness 包。

## Decision

完整的 dsh 发布族一起从 `@truly-private/omdsh*` 迁移到 `@truly-private/omdsh*`。安装入口是 `@truly-private/omdsh`，workspace 根是 `@truly-private/omdsh-root`；`apps/*` 与 `packages/*/*` 下的全部 221 个包使用同一个下游前缀、`0.0.1` 版本、公开 npm access，并在包 metadata 中指向本仓库。

Vendored Cordis 包与 Landlock 包继续使用 `@deepseek-ai`。它们是独立的发布族，已有公开 identity 与各自的版本线。下游 harness 包仍在需要时把这些包声明为依赖。

首次发布使用从一个 commit 构建并经 clean install 验证的 tarball；该 commit 的 pinned upstream intake 在 `security/upstream-lock.json` 中标记为 `reviewed`。registry 凭据保存在仓库之外。发布脚本按依赖顺序发布，并在跳过已有版本前比较 registry integrity，因此重试不会静默替换不同字节。

本决策只取代[发布序列说明](2026-08-10-npm-release-sequences.zh.md)与[公开依赖序列说明](2026-08-13-public-vendor-and-native-sequences.zh.md)中的 npm scope 和 dsh access 陈述。三发布族拓扑、先 pack 后 publish 的流程以及由 manifest 持有 access 的机制仍然有效。

## Alternatives considered

**只重命名 CLI。** 不采用，因为其 packed manifest 仍会要求大量本下游并不拥有的 `@truly-private/omdsh-*` 包。

**把所有运行时依赖打进一个 CLI tarball。** 首次发布不采用，因为这会改变插件解析与包所有权，而不是沿用既有发布族设计。

**保留上游 npm 名称。** 不采用，因为下游不控制上游 scope，也不应把已评审的下游产物呈现成上游包。

## Consequences

- 消费者运行 `npx @truly-private/omdsh`；源码 import、插件名、生成的 reference、fixture 与 TypeScript path 使用下游发布族名称。
- 221 个下游包全部公开，因为公开 CLI 必须能在没有组织凭据的情况下解析完整插件族。
- 包名相对上游形成预发布阶段的破坏性变更，不发布 compatibility alias。
- 对这些包名与字节发布 `0.0.1` 后不可撤销，后续变更必须使用新版本。
- Vendored framework 与 native 包保留既有名称，因此 clean-install 检查必须同时包含或解析两个 namespace。
