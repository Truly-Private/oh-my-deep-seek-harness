# Agent Note: 在整个 Web 界面使用自有产品 Logo

Status: implemented

[English](2026-08-20-owned-product-logo.md) | 中文

## 问题

Web 侧边栏、空状态主视觉、favicon 和安装 manifest 使用上游 DeepSeek 鲸鱼图案。该图案无法标识本发行版，而且分别维护内联 SVG 提取会让浏览器外观与应用渲染结果发生漂移。

## 决策

Web 应用将用户提供的牛仔骑鲸图案作为 `apps/web/public/omdsh-logo.jpg` 提供。居中的机械裁剪会去除未使用的纸张边缘，但不会重绘图案。`@truly-private/omdsh-client-ui-primitives` 中的 `BrandLogo` 负责渲染该资源。`@truly-private/omdsh-client-ui-brand-official` 会用该 Logo 和 oh-my-deepseek-harness 名称填充通用侧边栏与空状态主视觉 slot。位于 `apps/web/public/omdsh-icon.jpg` 的方形填充衍生图用于 favicon 和安装 manifest 图标。

该图像在带标签的控件中以及主视觉标题旁均为装饰，因此使用空替代文本和 `aria-hidden`。可见图像与浏览器图标均源自同一份用户提供的图案。

## 曾考虑的替代方案

**在紧凑位置保留上游鲸鱼图案。** 两个无关标记会让产品标识继续取决于布局宽度，并保留品牌歧义。

**生成或描摹新的矢量版本。** AI 重绘或手动描摹可能改变用户提供的线条图案。原始位图是权威图稿。

**在每个组件中嵌入 JPEG。** 重复的数据 URL 会增大 JavaScript 包，并产生多个需要同步的副本。Web 公共资源为每个客户端组件提供一个稳定 URL。

## 后果

渲染后的应用、浏览器标签页和已安装应用的元数据共享同一个产品标记。Web 组合必须提供 `/omdsh-logo.jpg` 和 `/omdsh-icon.jpg`；在该组合之外使用客户端 primitive 时，也必须提供相同的公共资源 URL。组件测试固定图像来源与宽高比，浏览器测试验证已发布图像可见。
