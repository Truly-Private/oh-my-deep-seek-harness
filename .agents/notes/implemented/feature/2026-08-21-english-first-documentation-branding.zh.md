# Agent Note: 将文档入口设为英文优先

Status: implemented

[English](2026-08-21-english-first-documentation-branding.md) | 中文

## 问题

文档根路径会打开中文指南，并使用上游 DeepSeek 字标，但本发行版以自有产品标识服务英语操作者。因此，首个公开页面传达了错误的受众和所有权信息。

## 决策

文档根路径重定向到 `/en/` 下现有的英文指南。语言菜单继续提供中文路由树，因此该变更会选择公开入口语言，但不会删除已维护的译文。

导航栏组合标识、favicon、站点标题、描述、GitHub 链接和页面编辑链接均标识 Oh My DeepSeek Harness 与 Truly-Private 仓库。VitePress 从文档基础路径提供 `apps/web/public/omdsh-logo.jpg` 及其方形衍生资源 `apps/web/public/omdsh-icon.jpg`。静态页面外观会引用这些权威资源，而不会描摹、重新生成或维护其他副本。

## 曾考虑的替代方案

**将每个英文路由移到根路由树。** 对调两个 locale 路由树会更改所有已发布文档 URL 和投影 manifest。重定向入口可以提供预期的首次体验，而不会引入无关的路由迁移。

**将 Logo 复制到 `website/public`。** 第二份位图会产生可能与 Web 应用发生偏移的另一个产品资源。提供 Web 公共目录可使现有资源保持权威。

**保留 DeepSeek 字标并添加下游标签。** 尽管站点记录的是独立发行版，上游标记仍会是主要身份。

## 后果

打开站点根路径的访问者会进入英文内容，而直接中文路由仍然可用。可缓存的 Logo 与 favicon 会增加静态请求，但不会在生成的页面元数据中重复 base64 载荷。文档检查固定投影路由，生产构建冒烟检查则验证兼容基础路径的资源 URL 与渲染后的组合标识。
