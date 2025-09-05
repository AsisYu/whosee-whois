# 📚 Whosee-WHOIS 项目文档

欢迎来到 Whosee-WHOIS 项目文档中心！本目录包含所有必要的配置和使用文档。

## 🚀 快速开始

### 0. 新手指南
- [🚀 快速开始指南](./QUICK_START.md) - 5 分钟快速配置

### 1. 环境配置
- [🔧 环境变量配置指南](./ENVIRONMENT_CONFIG.md) - 详细的配置说明
- [📝 环境变量示例](./ENV_EXAMPLE.md) - 完整的配置示例

### 2. Strapi 5 CMS 集成
- [📋 Strapi 5 集成指南](./Strapi%205%20CMS/STRAPI5_GUIDE.md) - 完整的安装和配置
- [🔗 API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md) - API 调用和集成
- [📖 快速参考手册](./Strapi%205%20CMS/QUICK_REFERENCE.md) - 常用命令和代码
- [🚨 故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md) - 问题解决方案

## 📋 文档目录

### 🔧 配置文档
| 文档 | 描述 | 适用场景 |
|------|------|----------|
| [快速开始指南](./QUICK_START.md) | 5 分钟快速配置教程 | 新手入门、快速体验 |
| [简化部署指南](./SIMPLE_DEPLOYMENT.md) | 一键部署到 Vercel | 生产部署、零配置部署 |
| [环境变量配置指南](./ENVIRONMENT_CONFIG.md) | 详细的环境变量配置说明 | 首次配置、高级配置 |
| [环境变量示例](./ENV_EXAMPLE.md) | 完整的 .env.local 配置示例 | 快速配置、参考模板 |

### 📡 Strapi 5 CMS 文档
| 文档 | 描述 | 适用场景 |
|------|------|----------|
| [README](./Strapi%205%20CMS/README.md) | CMS 文档总览 | 了解 CMS 架构 |
| [Strapi 5 集成指南](./Strapi%205%20CMS/STRAPI5_GUIDE.md) | 完整的安装配置教程 | 首次安装、系统迁移 |
| [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md) | API 调用和数据处理 | 开发 API 功能 |
| [迁移指南](./Strapi%205%20CMS/MIGRATION_GUIDE.md) | 从 Strapi 4 迁移到 5 | 系统升级 |
| [快速参考手册](./Strapi%205%20CMS/QUICK_REFERENCE.md) | 常用命令和代码片段 | 日常开发参考 |
| [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md) | 常见问题解决方案 | 问题诊断和修复 |
| [资源管理](./Strapi%205%20CMS/ASSETS.md) | 文档资源管理 | 文档维护 |

## 🎯 使用场景指南

### 🆕 新项目配置
1. 跟随 [快速开始指南](./QUICK_START.md) 快速配置（推荐）
2. 阅读 [环境变量配置指南](./ENVIRONMENT_CONFIG.md) 了解详细配置
3. 参考 [环境变量示例](./ENV_EXAMPLE.md) 创建 `.env.local`
4. 按照 [Strapi 5 集成指南](./Strapi%205%20CMS/STRAPI5_GUIDE.md) 配置 CMS
5. 使用 [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md) 开发功能

### 🔧 问题排查
1. 查看 [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md)（仅用于本地CMS开发）
2. 检查 [环境变量配置指南](./ENVIRONMENT_CONFIG.md) 中的常见问题
3. 参考 [快速参考手册](./Strapi%205%20CMS/QUICK_REFERENCE.md) 进行调试

### 📈 系统升级
1. 阅读 [迁移指南](./Strapi%205%20CMS/MIGRATION_GUIDE.md)
2. 更新环境变量配置
3. 参考 [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md) 适配新版本

## 🔍 核心配置概述

### 基本环境变量（可选）
```env
# 外部 API（如需要）
NEXT_PUBLIC_API_URL=https://api.whosee.me
NEXT_PUBLIC_API_KEY=your_api_key

# 站点配置
NEXT_PUBLIC_SITE_URL=https://whosee.me
```

### 注意事项
- 🎉 **简化部署**：项目现在只部署前端到 Vercel
- 🚀 **快速启动**：无需复杂的 CMS 配置
- 🔧 **本地开发**：CMS 目录保留用于本地开发（不会部署）

### 验证配置
访问 `http://localhost:3000/debug` 查看配置状态

## 🤝 贡献指南

### 文档更新
1. 更新相关的 `.md` 文件
2. 确保示例代码可以正常运行
3. 更新本 README 文件的链接

### 新功能文档
1. 在相应目录创建新的文档文件
2. 更新本 README 文件的目录
3. 在相关文档中添加交叉引用

## 📞 获取帮助

### 文档问题
- 检查 [故障排除指南](./Strapi%205%20CMS/TROUBLESHOOTING.md)
- 查看 [快速参考手册](./Strapi%205%20CMS/QUICK_REFERENCE.md)

### 环境配置问题
- 参考 [环境变量配置指南](./ENVIRONMENT_CONFIG.md) 的常见问题部分
- 使用 `/debug` 页面进行配置验证

### API 集成问题
- 查看 [API 集成文档](./Strapi%205%20CMS/API_INTEGRATION.md)
- 检查 Strapi 服务器状态和 API Token

---

💡 **提示**：建议新用户按照 "新项目配置" 的顺序阅读文档，有经验的用户可以直接查看相关的专门文档。

🎉 **开始使用**：访问 [快速开始指南](./QUICK_START.md) 开始您的 Whosee-WHOIS 之旅！