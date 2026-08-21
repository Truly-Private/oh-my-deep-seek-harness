# Agent Note: 9Router 是发行版的第一方提供方

Status: implemented

[English](2026-08-20-first-party-9router-provider.md) | 中文

## Problem

npm 快速开始把 9Router 作为首选模型网关，但组装后的产品仍把它当成手工声明的自定义提供方。用户必须了解 pi-ai profile 格式、选择协议、输入本地端点、选择路由 id、提供模型 id，还要避免派生出 `9ROUTER_API_KEY`；该名称以数字开头，不是合法的 POSIX 环境变量名。发行版的默认模型与首次运行凭据提示仍指向 DeepSeek 直连路由，因此只按 9Router 文档操作，并不能让第一个 Web 或 headless 会话可用。

## Decision

基础 bundle 通过 `@truly-private/omdsh-llm-pi-ai` 配置完整的 `9router` 路由：显示名称为 `9Router`，使用 `http://127.0.0.1:20128/v1` 上的 OpenAI Chat Completions，凭据引用为 `NINE_ROUTER_API_KEY`，入门模型为 `kr/claude-sonnet-4.5`。基础 Agent 默认值选择该路由与模型。

`llm-pi-ai` 在 pi-ai 已安装 catalog 之外拥有一份精简的第一方预设清单。该清单中已配置的路由即使不在 pi-ai 中，也会在可配置提供方目录中报告为发行版提供（`declared: false`）。单独挂载的适配器不会因这份清单而激活或提供一条信息不完整的路由；发行版组合必须提供端点、协议、凭据引用与入门模型。这样既让提供方构造继续归既有的多提供方适配器所有，也明确表达发行版支持的设置。

Models 引导步骤以 `llm-pi-ai.providers.9router` 下已配置的 `9router` 条目为目标。它只询问端点密钥，并继续使用共享就绪规则：任何其他可用提供方都会结束该步骤。Models 页面可以查询 9Router 的 OpenAI 兼容模型列表，并在无需重启的情况下替换入门模型。DeepSeek 与每个 pi-ai catalog 提供方仍可作为替代选择。

## Alternatives considered

**继续把 9Router 作为自定义提供方。** 不采用，因为产品会继续询问发行版已经知道的事实，把受支持的设置标为「自定义」，并派生出以数字开头的无效凭据引用；除非用户事先知道需要手工覆盖它。

**创建专用 `llm-9router` 适配器包。** 不采用，因为 9Router 使用的 OpenAI 兼容路由声明、凭据 seam、发现操作、模型元数据、重试策略与 settings 编辑器都已经归 `llm-pi-ai` 所有。第二个适配器会重复这些机制，却没有独立的协议格式或生命周期。

**把 9Router 加入每个单独挂载的 `llm-pi-ai` 目录。** 不采用，因为标为发行版提供的目录条目会隐藏自定义路由所需的端点、协议与显示名称字段。组合没有提供 profile 时，选择该条目无法产出可服务的路由。

**把凭据命名为 `9ROUTER_API_KEY`。** 不采用，因为凭据引用是 POSIX shell 标识符，不能以数字开头。拼写完整的 `NINE_ROUTER_API_KEY` 在环境变量、托管凭据文件与 settings 校验中都保持有效。

## Consequences

新的 npm 安装从首次启动到可路由默认模型只需完成一条仅凭据路径。同一路由会在 Models 与模型选择器中显示为 **9Router**；除非用户选择另一个默认值，headless 会话也会继承它。入门模型假定操作者已在该 id 下连接 Kiro AI；使用其他上游或 combo 的安装必须在发送请求前获取或输入其准确 id。

基础 bundle 测试固定序列化 profile 与默认值；适配器测试固定第一方目录分类与路由元数据；组装 Web 组合固定活跃提供方、入门模型、目录条目与 Agent 默认值；无密钥浏览器引导快照则在不联系 9Router 的情况下覆盖托管凭据写入与模型替换。
