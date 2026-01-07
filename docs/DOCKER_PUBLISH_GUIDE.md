# Docker自动构建与发布配置指南

本项目配置了GitHub Actions自动构建Docker镜像并推送到Docker Hub。

## 镜像信息

- Docker Hub仓库：`hansomeyu/whosee-server`
- 镜像地址：`docker.io/hansomeyu/whosee-server`

## 配置步骤

### 1. 获取Docker Hub Access Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 点击右上角头像 → Account Settings
3. 选择 Security → New Access Token
4. 创建token：
   - Description: `GitHub Actions`
   - Access permissions: `Read, Write, Delete`
5. 复制生成的token（只显示一次）

### 2. 配置GitHub Secrets

在GitHub仓库中配置以下secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加以下两个secrets：

| Secret名称 | 值 | 说明 |
|-----------|---|------|
| `DOCKERHUB_USERNAME` | `hansomeyu` | Docker Hub用户名 |
| `DOCKERHUB_TOKEN` | `(your token)` | 步骤1生成的Access Token |

### 3. 触发构建

配置完成后，以下操作会自动触发Docker镜像构建：

#### 自动触发场景

1. **Push到main分支**
   ```bash
   git push origin main
   ```
   生成镜像tag：
   - `hansomeyu/whosee-server:latest`
   - `hansomeyu/whosee-server:main`
   - `hansomeyu/whosee-server:main-<sha>`

2. **创建版本tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   生成镜像tag：
   - `hansomeyu/whosee-server:1.0.0`
   - `hansomeyu/whosee-server:1.0`
   - `hansomeyu/whosee-server:1`
   - `hansomeyu/whosee-server:v1.0.0-<sha>`

3. **Pull Request**
   - 只构建镜像，不推送到Docker Hub
   - 用于验证Dockerfile和构建过程

## 镜像特性

### 多平台支持

自动构建支持以下平台：
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

### 镜像优化

- 多阶段构建，最小化镜像体积
- 包含Chromium浏览器和中文字体
- 非root用户运行（安全）
- 健康检查支持
- 构建缓存优化（GitHub Actions Cache）

### 镜像大小

- 压缩后约：250-300MB
- 展开后约：800MB-1GB

## 使用方式

### 拉取镜像

```bash
# 最新版本
docker pull hansomeyu/whosee-server:latest

# 指定版本
docker pull hansomeyu/whosee-server:1.0.0

# 指定平台
docker pull --platform linux/amd64 hansomeyu/whosee-server:latest
docker pull --platform linux/arm64 hansomeyu/whosee-server:latest
```

### 运行容器

```bash
docker run -d \
  --name whosee-server \
  -p 3900:3900 \
  -e JWT_SECRET=your_jwt_secret \
  -e API_KEY=your_api_key \
  -e REDIS_ADDR=redis:6379 \
  hansomeyu/whosee-server:latest
```

### 使用docker-compose

```yaml
version: '3.8'

services:
  whosee-server:
    image: hansomeyu/whosee-server:latest
    ports:
      - "3900:3900"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY=${API_KEY}
      - REDIS_ADDR=redis:6379
      - CHROME_MODE=auto
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped
```

## 构建状态

可以在以下位置查看构建状态：

- GitHub Actions: `https://github.com/<your-repo>/actions`
- Docker Hub: `https://hub.docker.com/r/hansomeyu/whosee-server`

## 版本管理策略

### 语义化版本

推荐使用语义化版本号：`vMAJOR.MINOR.PATCH`

- **MAJOR**: 重大变更，不兼容的API修改
- **MINOR**: 新增功能，向下兼容
- **PATCH**: Bug修复，向下兼容

示例：
```bash
# 发布v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 发布v1.0.1（补丁）
git tag -a v1.0.1 -m "Fix screenshot bug"
git push origin v1.0.1

# 发布v1.1.0（新功能）
git tag -a v1.1.0 -m "Add new API endpoints"
git push origin v1.1.0
```

### Tag策略说明

| Git Tag | 生成的Docker Tag |
|---------|-----------------|
| `v1.2.3` | `1.2.3`, `1.2`, `1` |
| `main分支` | `latest`, `main` |
| 任意提交 | `<branch>-<sha>` |

## 故障排查

### 构建失败

1. 检查GitHub Actions日志
2. 验证Dockerfile语法
3. 确认secrets配置正确

### 推送失败

1. 检查DOCKERHUB_TOKEN是否有效
2. 确认DOCKERHUB_USERNAME正确
3. 验证Docker Hub仓库访问权限

### 镜像拉取失败

1. 确认镜像已成功推送到Docker Hub
2. 检查镜像tag是否正确
3. 验证网络连接

## 安全注意事项

1. **不要在镜像中包含敏感信息**
   - 不要COPY .env文件
   - 通过环境变量注入配置

2. **定期更新Access Token**
   - Docker Hub token建议每6个月更新一次
   - 更新后需同步更新GitHub Secrets

3. **使用最小权限原则**
   - Access Token只授予必要权限
   - GitHub Actions只在main分支和tag时推送

## 监控和维护

### 查看镜像信息

```bash
# 查看镜像历史
docker history hansomeyu/whosee-server:latest

# 检查镜像大小
docker images hansomeyu/whosee-server

# 查看镜像标签
docker inspect hansomeyu/whosee-server:latest
```

### 清理旧镜像

Docker Hub免费账户有存储限制，建议定期清理旧版本：

1. 登录Docker Hub
2. 进入仓库 → Tags
3. 删除不再需要的旧版本tag

## 参考资料

- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Docker Hub文档](https://docs.docker.com/docker-hub/)
- [Docker Buildx文档](https://docs.docker.com/buildx/working-with-buildx/)
- [语义化版本规范](https://semver.org/lang/zh-CN/)
