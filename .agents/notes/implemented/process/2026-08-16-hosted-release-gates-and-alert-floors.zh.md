# Agent Note：托管发布门禁与依赖告警版本下限

Status: implemented

[English](2026-08-16-hosted-release-gates-and-alert-floors.md) | 中文

## 问题

下游仓库继承的拉取请求作业默认使用组织专用 runner 标签。Truly-Private fork 无法使用这些标签，因此原本有用的检查会一直排队，无法保护发布流程。三个跨平台串行参考作业也处于禁用状态。尽管仅生产依赖审计通过，GitHub Dependabot 仍报告文档工具链中的安全公告，因为生产审计范围不包含开发依赖，也不包含清单中仍允许的易受影响版本范围。

## 决策

必需的 Linux 作业和真实 Windows 作业默认使用 GitHub 托管 runner，同时保留现有仓库变量开关，以便切换到私有故障转移池。托管作业的并发度降低，以适配标准 runner。完整的原生 Windows 清单一次只运行一个门禁和一个覆盖率 worker：并发运行两个门禁时，所有测试断言均已完成，但插桩覆盖率期间丢失了一个 Vitest fork；同一份完整清单采用 Windows 串行参考作业的执行方式后通过。Linux、macOS 和 Windows 串行参考作业在拉取请求中运行，并加入 `all checks passed` 汇总；自托管 Linux 和 Windows lane 使用不同的作业标识，继续作为 `master` 推送后的备用演练。

文档工具链为 Mermaid、Vite、DOMPurify 和 esbuild 设置已修复安全公告的版本下限。网站使用 Vite 6.4.3，而仓库测试运行器显式保留 Vite 8.0.16，使 Vitest 在 Node 24 和 Node 26 上保持其源模块运行器行为。pnpm 将 VitePress 保留的 Vite 5 范围覆盖为 Vite 6.4.3，并将传递依赖 DOMPurify 保持在 3.4.13。由于 Vite 5 依赖已移除，生成的锁文件不再包含 esbuild 0.21.5。[`2026-08-16-release-blockers.md`](../../../../security/reviews/2026-08-16-release-blockers.md)记录告警与版本处置的对应关系，并在 GitHub 针对此确切提交完成评估前保留远程验证待办状态。

超时策略保留描述性包名 `@deepseek-ai/dsh-tool-call-timeout-policy`；其位于 `packages/guard/` 并不要求使用含义更弱的 npm 名称。请求的提供方、模型、推理强度和采样值继续作为已记录的 epoch 层级状态，使缓存复用与重放观察到同一配置转换。这些决策移除两处阻塞发布的 `FIXME` 标记，而不改变运行时行为。

## 考虑过的替代方案

**保留自定义标签，以后再添加组织 runner。** 这会使每个拉取请求都无法及时得到结论，并让发布证据依赖尚未配置的基础设施。

**将生产审计视为完整的依赖信号。** 这会漏掉 GitHub 单独正确报告的文档构建与面向浏览器的开发依赖。

**忽略仅开发依赖的告警。** 文档网站会处理仓库内容并发布公开页面，因此在存在兼容的已修复版本时，应优先采用这些版本。

## 后果

拉取请求会使用更多 GitHub 托管计算资源，串行 lane 也需要更长时间，但这个公共 fork 可以获得其结论。原生 Windows 同样优先提供可重复的完整结论，而不是让多个门禁进程重叠运行。私有 runner 仍是可选的故障转移基础设施，而不是前置条件。在 VitePress 采用既修复安全公告又保持源模块运行器的兼容版本线之前，仓库会有意为测试运行器和 VitePress 网站保留不同的 Vite 主版本。直接父依赖采用已修复版本后，依赖版本下限可能需要移除；在此之前，锁文件、源 worker 兼容性测试和网站构建提供兼容性证据。候选状态保持不变：这些门禁通过并不表示提交已评审，也不授权稳定版发布。
