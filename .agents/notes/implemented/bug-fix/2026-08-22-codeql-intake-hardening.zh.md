# Agent Note: CodeQL intake 加固

Status: implemented

[English](2026-08-22-codeql-intake-hardening.md) | 中文

## Problem

上游纳入引入了在定位 HTML 标签、清理提供方端点尾部斜杠或提取 PowerShell 测试标记时可能消耗超线性时间的正则表达式。动态包预检查还会先通过宿主 realm 的 `Function` 构造器解析模型编写的代码，再用 `node:vm` 重新编译，尽管宿主执行本来就使用 VM 解析器。

## Decision

仓库规模的 HTML 使用有界线性标签扫描，提供方端点规范化从末尾向前遍历 ASCII 斜杠，PowerShell fixture 则依据标记的单一分隔符规则匹配，不再使用嵌套重复。回归用例覆盖长畸形 HTML 与长斜杠后缀，既有持久 shell 测试套件覆盖标记提取。

动态包预检查使用 `vm.Script` 直接编译与执行时相同的 async function 包装层，但不运行代码。这样会移除多余的宿主 realm 编译器，同时保留产品有意提供的可执行插件功能及其已记录的「VM 不是安全边界」信任立场。

## Alternatives considered

**将正则表达式发现项视为继承的上游代码并驳回。** 来源不能降低拒绝服务风险，而线性实现无需排除规则即可保持行为。

**保留 `new Function` 以提供浏览器兼容的预检查。** 浏览器侧不会加载宿主沙箱模块，因此第二套解析器及其不同的语法行为没有兼容性收益。

**为动态代码禁用 CodeQL 查询。** 可执行插件功能仍对分析可见；任何剩余警报都必须依据已记录的信任模型给出发现项专属处置。

## Consequences

标签插入、端点规范化与标记提取的工作量随输入长度线性增长。定义时与运行时的宿主解析现在共享同一解析器和包装层。GitHub 安全证据仍需检查精确 commit 的开放警报清单，并且本变更不会把上游锁从 `candidate` 提升到更高状态。
