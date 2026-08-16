# Agent Note: 继承历史的秘密扫描处置

Status: implemented

[English](2026-08-16-inherited-secret-scan-dispositions.md) | 中文

## 问题

全历史秘密扫描既覆盖固定的上游祖先历史，也覆盖下游工作。翻译配对 blob hash、形似凭据的脱敏测试 fixture 与普通标识符可能匹配秘密检测器，即使没有下游提交引入这些内容。跳过上游历史会通过移除下游接收政策所需的证据来让检查变绿。

## 决策

安全工作流保留全历史 Gitleaks 扫描。[处置 manifest](../../../../security/gitleaks-dispositions.json)在不存储提取值的情况下对继承的发现进行分类。路径与检测匹配的合取条件只允许把普通 Markdown 基名与 40 字符小写 Git blob hash 配对的翻译记录，其余已审查 fixture 与标识符则使用精确指纹标识。

[`verify-gitleaks-policy.mjs`](../../../../scripts/security/verify-gitleaks-policy.mjs)要求每个精确指纹提交都是 [`upstream-lock.json`](../../../../security/upstream-lock.json) 中主源提交的祖先，把每种分类限制在已审查路径内，并要求扫描器配置与指纹文件和 manifest 完全一致。因此，新出现的内容会失败，直到维护者记录新的处置。本政策扩展[经审查的下游接收决策](2026-08-15-reviewed-downstream-intake.md)，但不改变候选或已审查状态。

## 曾考虑的替代方案

**重写继承的 Git 历史。** 这些发现属于公开的主上游祖先历史，当前树中的翻译记录仍包含 Git blob hash。重写会破坏固定来源关系，却不会消除检测器冲突。

**排除上游范围或所有测试。** 任一排除方式都会隐藏安全敏感历史中后续出现的检测结果。扫描保留每个提交，只使用结构性或精确到单个发现的处置。

**提交 Gitleaks 基线报告。** 报告携带的发现上下文超出政策所需，并可能意外保留敏感材料。manifest 与精确指纹仅保留提交、路径、规则、行号、分类与理由。

## 影响

全历史扫描继续对新的上游与下游发现保持敏感，而已审查的继承噪声不会永久导致每个拉取请求失败。维护者必须分类每个新指纹并确认其祖先关系。精确指纹忽略仍是 Gitleaks 的实验性功能，因此仓库自有验证器会阻止静默扩大范围，并继续作为必需的来源证据。
