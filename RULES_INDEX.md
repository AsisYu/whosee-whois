# 项目规则文件索引

本文档提供了 Whosee WHOIS 项目中所有规则文件的完整索引和使用指南。

## 规则文件目录结构

项目包含两个规则目录：

- **`.cursor/rules/`** - Cursor IDE 专用规则文件（.mdc 格式）
- **`.trae/rules/`** - Trae AI 专用规则文件（.md 格式）

## 核心规则文件

### 1. 项目架构与结构

| 文件名 | Cursor 版本 | Trae 版本 | 描述 |
|--------|-------------|-----------|------|
| **project-guide** | [.cursor/rules/project-guide.mdc](.cursor/rules/project-guide.mdc) | [.trae/rules/project-guide.md](.trae/rules/project-guide.md) | 项目总体架构和结构指南 |
| **mvc-patterns** | [.cursor/rules/mvc-patterns.mdc](.cursor/rules/mvc-patterns.mdc) | [.trae/rules/mvc-patterns.md](.trae/rules/mvc-patterns.md) | MVC 架构模式指导 |
| **development-workflow** | [.cursor/rules/development-workflow.mdc](.cursor/rules/development-workflow.mdc) | [.trae/rules/development-workflow.md](.trae/rules/development-workflow.md) | 开发流程和部署指南 |

### 2. 前端开发规则

| 文件名 | Cursor 版本 | Trae 版本 | 描述 |
|--------|-------------|-----------|------|
| **nextjs-patterns** | [.cursor/rules/nextjs-patterns.mdc](.cursor/rules/nextjs-patterns.mdc) | [.trae/rules/nextjs-patterns.md](.trae/rules/nextjs-patterns.md) | Next.js 15 App Router 模式 |
| **component-patterns** | [.cursor/rules/component-patterns.mdc](.cursor/rules/component-patterns.mdc) | [.trae/rules/component-patterns.md](.trae/rules/component-patterns.md) | React 组件开发模式 |
| **styling-patterns** | [.cursor/rules/styling-patterns.mdc](.cursor/rules/styling-patterns.mdc) | [.trae/rules/styling-patterns.md](.trae/rules/styling-patterns.md) | Tailwind CSS 和 shadcn/ui 样式模式 |

### 3. 后端开发规则

| 文件名 | Cursor 版本 | Trae 版本 | 描述 |
|--------|-------------|-----------|------|
| **api-patterns** | [.cursor/rules/api-patterns.mdc](.cursor/rules/api-patterns.mdc) | [.trae/rules/api-patterns.md](.trae/rules/api-patterns.md) | Go 后端 API 开发模式 |

### 4. 专业功能规则

| 文件名 | Cursor 版本 | Trae 版本 | 描述 |
|--------|-------------|-----------|------|
| **i18n-patterns** | [.cursor/rules/i18n-patterns.mdc](.cursor/rules/i18n-patterns.mdc) | [.trae/rules/i18n-patterns.md](.trae/rules/i18n-patterns.md) | 国际化模式（next-intl） |
| **type-patterns** | [.cursor/rules/type-patterns.mdc](.cursor/rules/type-patterns.mdc) | [.trae/rules/type-patterns.md](.trae/rules/type-patterns.md) | TypeScript 类型定义模式 |
| **blog-cms-patterns** | [.cursor/rules/blog-cms-patterns.mdc](.cursor/rules/blog-cms-patterns.mdc) | [.trae/rules/blog-cms-patterns.md](.trae/rules/blog-cms-patterns.md) | 博客和 CMS 内容管理模式 |
| **threejs-earth-visualization** | [.cursor/rules/threejs-earth-visualization.mdc](.cursor/rules/threejs-earth-visualization.mdc) | [.trae/rules/threejs-earth-visualization.md](.trae/rules/threejs-earth-visualization.md) | Three.js 地球可视化组件 |

### 5. 概览文档

| 文件名 | Cursor 版本 | Trae 版本 | 描述 |
|--------|-------------|-----------|------|
| **rules-overview** | [.cursor/rules/rules-overview.mdc](.cursor/rules/rules-overview.mdc) | [.trae/rules/rules-overview.md](.trae/rules/rules-overview.md) | 规则文件总览 |
| **project_rules** | [.cursor/rules/project_rules.md](.cursor/rules/project_rules.md) | [.trae/rules/project_rules.md](.trae/rules/project_rules.md) | 项目规则（通用格式） |

## 使用指南

### 对于 Cursor IDE 用户

1. 使用 `.cursor/rules/` 目录中的 `.mdc` 文件
2. 这些文件包含 frontmatter 元数据，用于配置 Cursor 的 AI 助手
3. 主要入口文件：[.cursor/rules/rules-overview.mdc](.cursor/rules/rules-overview.mdc)

### 对于 Trae AI 用户

1. 使用 `.trae/rules/` 目录中的 `.md` 文件
2. 这些文件为标准 Markdown 格式，适用于 Trae AI
3. 主要入口文件：[.trae/rules/rules-overview.md](.trae/rules/rules-overview.md)

### 文件同步状态

✅ **已同步** - 两个目录中的对应文件内容保持一致  
✅ **格式标准化** - 所有文件的 frontmatter 元数据已标准化  
✅ **引用更新** - 所有交叉引用已更新为正确路径  
✅ **内容验证** - 所有文件引用已验证，无断链

## 维护说明

1. **内容更新**：修改任一版本的文件后，需要同步更新对应版本
2. **新增规则**：新增规则文件时，需要在两个目录中都创建对应版本
3. **引用维护**：更新文件引用时，确保两个版本的引用路径正确
4. **格式要求**：
   - Cursor 版本使用 `.mdc` 扩展名，包含 frontmatter
   - Trae 版本使用 `.md` 扩展名，标准 Markdown 格式

## 快速导航

- 🏗️ **架构设计** → [project-guide](.cursor/rules/project-guide.mdc) | [mvc-patterns](.cursor/rules/mvc-patterns.mdc)
- 🎨 **前端开发** → [nextjs-patterns](.cursor/rules/nextjs-patterns.mdc) | [component-patterns](.cursor/rules/component-patterns.mdc)
- ⚙️ **后端开发** → [api-patterns](.cursor/rules/api-patterns.mdc)
- 🌐 **国际化** → [i18n-patterns](.cursor/rules/i18n-patterns.mdc)
- 📝 **类型定义** → [type-patterns](.cursor/rules/type-patterns.mdc)
- 🚀 **部署流程** → [development-workflow](.cursor/rules/development-workflow.mdc)

---

*最后更新：2025年1月* | *维护者：AI Assistant*