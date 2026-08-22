# Agent Note: 下游纳入重定作用域与覆盖率修正

Status: implemented

[English](2026-08-22-downstream-intake-rescope-coverage.md) | 中文

## Problem

上游纳入重定作用域把工作区包改为 `@truly-private/omdsh-*`，但动态客户端 bundle 纯度门禁和一项凭据不变量断言仍然选择 `@deepseek-ai/*`。因此，未声明的下游跨插件值导入会绕过构建错误，而不变量测试预期了错误的包标识。纳入适配器还把若干英文预期值改掉，却没有改动显式选择中文的 fixture，导致测试与自身设置矛盾。合并保留了下游 9Router 默认选择，却丢失了让该选择可执行的提供方配置。在完整 Linux 覆盖率工作负载下，真实 PowerShell PTY 套件与无关的插桩套件共用广域测试项目时，可能丢失持久 shell 输出。

## Decision

客户端纯度门禁把 `@truly-private/*` 视为自有工作区作用域，保留对 `@truly-private/omdsh-*` 线路包和生成的 Remote 贡献的显式内联许可，并在应用下游作用域检查之前允许独立入库的 `@deepseek-ai` 库。

凭据不变量测试预期下游包标识。基础 bundle 恢复第一方 9Router 提供方及其凭据引用、回环端点、OpenAI 兼容协议和用户要求的 `trifecta` 模型；配置中不嵌入凭据。

locale 测试断言各 fixture 所选的语言。将 locale 设为 `zh` 的 fixture 保留已交付的中文文案预期；当两套字典都需要验证时，测试会显式切换到 `en`。

真实 `terminal-bash` 本地 PTY 套件放入既有的 process-bound Vitest 项目。它仍属于同一次覆盖率调用及其阈值，但不再与广域项目在聚合插桩下积累的进程状态共存。

## Alternatives considered

**把 fixture 改为英文。** 受影响的客户端界面有意交付中文产品文案，而测试已明确选择中文。改动 fixture 只会隐藏纳入不匹配，不能保留上游行为。

**重定作用域后删除纯度断言。** 这会允许客户端插件内联第二份工作区运行时，或请求它从未声明的模块表行。下游作用域需要与上游作用域相同的强制约束。

**重试 PTY 断言。** 重试会隐藏聚合竞争下持久 shell 边界的丢失。process-bound 项目本就用于真实进程和时序敏感 I/O 套件。

## Consequences

下游浏览器构建会再次拒绝未声明的工作区值导入，同时入库的框架库仍然可用。包标识断言和 locale fixture 与下游运行时保持一致，基础 profile 能解析其选择的 9Router 路由，完整覆盖率门禁会隔离真实 PTY 生命周期，但不会把它从覆盖率中移除。这些修正不会把上游纳入提升到 `candidate` 以上，也不会授权发布。
