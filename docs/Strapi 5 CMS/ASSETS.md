 # 文档资源文件说明

## 📁 目录结构

```
docs/
├── README.md                 # 文档索引和导航
├── STRAPI5_GUIDE.md         # 主要指南文档
├── API_INTEGRATION.md       # API 集成详细文档
├── MIGRATION_GUIDE.md       # 迁移指南
├── TROUBLESHOOTING.md       # 故障排除指南
├── QUICK_REFERENCE.md       # 快速参考卡片
├── ASSETS.md               # 本文件 - 资源说明
└── images/                 # 图片资源目录
    └── home.jpeg          # 项目首页截图
```

## 🖼️ 图片资源

### home.jpeg
- **用途**: 项目首页展示截图
- **尺寸**: 建议最大宽度 1200px
- **格式**: JPEG
- **说明**: 用于文档中展示项目界面效果

### 在文档中使用图片

#### Markdown 语法
```markdown
![项目首页](./images/home.jpeg)
```

#### HTML 语法（可控制尺寸）
```html
<img src="./images/home.jpeg" alt="项目首页" width="800" />
```

#### 相对路径说明
- 从文档根目录: `./images/home.jpeg`
- 从子目录: `../images/home.jpeg`

## 📊 建议添加的图片

### 系统架构图
- **文件名**: `architecture.png`
- **内容**: 展示 Next.js + Strapi 5 的系统架构
- **用途**: 在主要指南中说明技术栈关系

### CMS 管理界面截图
- **文件名**: `strapi-admin.png`
- **内容**: Strapi 5 管理界面截图
- **用途**: 安装配置章节的视觉指导

### API 调试截图
- **文件名**: `api-debug.png`
- **内容**: 浏览器开发者工具中的 API 请求
- **用途**: 故障排除文档的调试示例

### 内容类型配置截图
- **文件名**: `content-types.png`
- **内容**: Strapi 中内容类型的配置界面
- **用途**: 配置章节的可视化指导

## 🎨 图片规范

### 文件命名
- 使用小写字母和连字符
- 描述性命名：`strapi-admin-panel.png`
- 避免空格和特殊字符

### 图片质量
- **截图**: 使用高 DPI 显示器截图
- **压缩**: 使用工具压缩图片大小
- **格式**: 
  - 截图使用 PNG (保持清晰度)
  - 照片使用 JPEG (较小文件)
  - 图标使用 SVG (矢量格式)

### 尺寸建议
- **全屏截图**: 最大宽度 1200px
- **局部截图**: 最大宽度 800px
- **小图标**: 建议 64x64px 或 128x128px

## 📋 图片清单

### 现有图片
- [x] `home.jpeg` - 项目首页截图

### 建议补充
- [ ] `architecture.svg` - 系统架构图
- [ ] `strapi-login.png` - Strapi 登录界面
- [ ] `strapi-dashboard.png` - Strapi 管理面板
- [ ] `content-type-blog.png` - 博客内容类型配置
- [ ] `content-type-category.png` - 分类内容类型配置
- [ ] `api-request-example.png` - API 请求示例
- [ ] `network-tab-debug.png` - 网络面板调试截图
- [ ] `strapi-permissions.png` - 权限配置截图
- [ ] `i18n-settings.png` - 国际化设置截图
- [ ] `blog-list-frontend.png` - 前端博客列表
- [ ] `blog-detail-frontend.png` - 前端博客详情

## 🔧 图片优化工具

### 在线工具
- [TinyPNG](https://tinypng.com/) - PNG/JPEG 压缩
- [SVGO](https://jakearchibald.github.io/svgomg/) - SVG 优化
- [Squoosh](https://squoosh.app/) - 多格式图片优化

### 命令行工具
```bash
# 安装 imagemin
npm install -g imagemin-cli imagemin-pngquant imagemin-mozjpeg

# 压缩 PNG
imagemin images/*.png --out-dir=images/optimized --plugin=pngquant

# 压缩 JPEG  
imagemin images/*.jpg --out-dir=images/optimized --plugin=mozjpeg
```

## 📝 图片使用示例

### 在指南文档中
```markdown
# Strapi 5 安装指南

首先访问 Strapi 管理面板：

![Strapi 登录界面](./images/strapi-login.png)

完成登录后，您将看到管理面板：

![Strapi 管理面板](./images/strapi-dashboard.png)
```

### 在 API 文档中
```markdown
# API 调试指南

打开浏览器开发者工具的 Network 面板：

![网络面板调试](./images/network-tab-debug.png)

检查 API 请求的详细信息，确保请求头包含正确的认证信息。
```

## 🌟 最佳实践

### 截图规范
1. **一致性**: 使用相同的浏览器和主题
2. **清晰度**: 确保文字清晰可读
3. **标注**: 必要时添加箭头或高亮标注
4. **隐私**: 遮盖或替换敏感信息

### 文档中的图片
1. **相关性**: 图片应与文字内容高度相关
2. **替代文本**: 提供有意义的 alt 文本
3. **大小适中**: 避免图片过大影响加载速度
4. **位置合理**: 图片应紧邻相关文字

### 版本管理
1. **版本控制**: 图片文件也应纳入 Git 管理
2. **更新及时**: 界面变化时及时更新截图
3. **备份保存**: 保留原始高质量版本

---

**文档版本**: 1.0.0  
**最后更新**: 2024-12-19