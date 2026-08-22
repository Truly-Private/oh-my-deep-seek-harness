# 下游 npm 发行设置

[English](npm-distribution.md) | 中文

本指南记录下游 CLI 如何以 `@truly-private/omdsh` 发布。`0.0.1` 是完整下游包族的首次公开发布。

## 包身份

npm 包名不能包含大写字母，因此下游包名是 `@truly-private/omdsh`，而不是 `@Truly-Private/omdsh`。名为 `truly-private` 的 npm 用户或组织必须先拥有对应的 scope，本仓库才能向其中发布。

身份映射如下：

| 角色 | 上游名称 | 下游名称 |
| --- | --- | --- |
| 私有工作区根包 | `@deepseek-ai/dsh-root` | `@truly-private/omdsh-root` |
| 已安装的 CLI | `@deepseek-ai/dsh` | `@truly-private/omdsh` |
| Harness 包 | `@deepseek-ai/dsh-*` | `@truly-private/omdsh-*` |

CLI 依赖许多工作区包。仅重命名 `apps/cli/package.json` 会让已发布的 CLI 继续依赖上游包族，因此必须一起变更整个发行包族的 scope；除非另行设计打包方案，消除这些运行时包依赖。

## 发布流程

1. 确认 `security/upstream-lock.json` 将准确的 pinned primary commit 标记为 `reviewed`，并链接评审证据。
2. 从该已评审 commit 运行仓库门禁并打包完整发布族：

```sh
pnpm install
pnpm run build
pnpm run hygiene
pnpm run release:verify --family dsh
pnpm run release:pack --family dsh --out dist/npm-omdsh
pnpm run release:pack --family vendor --out dist/npm-vendor
```

3. 使用 packed CLI 与 vendored framework tarball 执行 clean install。发布前，发布检查必须报告 `@truly-private/omdsh 0.0.1`。
4. 使用 `scripts/release/publish.ts` 发布未改变的 dsh tarball。npm 凭据必须保存在仓库之外；切勿把 token 放入本 checkout 下的 `.npmrc`、tracked shell 文件、日志或文档。
5. 在仓库外验证 registry 与 executable：

```sh
npm view @truly-private/omdsh@0.0.1 version
npx --yes @truly-private/omdsh@0.0.1 --profile headless --dump-config
```

[下游 npm scope Agent Note](../../.agents/notes/implemented/process/2026-08-20-downstream-npm-scope.zh.md)记录了完整发布族一起迁移以及 vendored 包保留既有名称的原因。

## 发布停止条件

当 `npm view` 已在目标版本发现不同字节、packed-install 验证仍解析 `@deepseek-ai/dsh-*` harness 包，或发布 commit 缺少已评审的 intake 证据时，不得发布。

## npm 参考资料

- [包名指南](https://docs.npmjs.com/package-name-guidelines/)
- [关于 scope](https://docs.npmjs.com/about-scopes/)
- [通过 OIDC 进行 trusted publishing](https://docs.npmjs.com/trusted-publishers/)
