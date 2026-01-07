#  Docker 部署指南

本文档提供了 Whosee.me 项目的完整 Docker 部署方案，包括开发环境和生产环境的配置。

##  文件说明

- `docker-compose.yml` - 生产环境配置
- `docker-compose.dev.yml` - 开发环境配置
- `.env.docker` - 环境变量模板
- `nginx/nginx.conf` - Nginx反向代理配置
- `Dockerfile` - 应用镜像构建文件

##  快速开始

### 1. 准备环境变量

```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量，填入实际的API密钥
nano .env
```

### 2. 开发环境部署

```bash
# 启动开发环境（包含Redis）
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f whosee-server

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

### 3. 生产环境部署

```bash
# 启动生产环境（包含Redis + Nginx）
docker-compose --profile production up -d

# 仅启动应用和Redis（不包含Nginx）
docker-compose up -d whosee-server redis

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f whosee-server
```

##  架构说明

### 服务组件

| 服务 | 端口 | 说明 | 健康检查 |
|------|------|------|----------|
| `whosee-server` | 3900 | 主应用服务 | `/api/health` |
| `redis` | 6379 | 缓存和限流 | `redis-cli ping` |
| `nginx` | 80/443 | 反向代理（可选） | 配置文件检查 |

### 数据持久化

```yaml
volumes:
  redis_data:           # Redis数据持久化
  chrome_data:          # Chrome运行时数据
  ./logs:/app/logs      # 日志文件映射
  ./static:/app/static  # 静态文件映射
```

##  配置详解

### 环境变量配置

####  必需配置
```bash
# API密钥（必须配置）
WHOISXML_API_KEY=your_whoisxml_api_key
WHOISFREAKS_API_KEY=your_whoisfreaks_api_key
API_KEY=your_strong_api_key
JWT_SECRET=your_strong_jwt_secret
```

####  安全配置
```bash
# 生产环境推荐配置
DISABLE_API_SECURITY=false           # 启用安全验证
IP_WHITELIST_STRICT_MODE=false       # 非严格模式
API_DEV_MODE=false                   # 关闭开发模式
TRUSTED_IPS=                         # 受信任IP列表
```

####  Chrome配置
```bash
CHROME_MODE=auto                     # 智能混合模式
```

####  监控配置
```bash
HEALTH_LOG_SEPARATE=true             # 分离健康检查日志
HEALTH_LOG_SILENT=true               # 主日志静默模式
```

### Nginx配置特性

- **速率限制**: API请求10r/s，截图请求2r/s
- **静态文件服务**: 自动处理截图等静态资源
- **安全头**: 自动添加安全HTTP头
- **压缩**: Gzip压缩优化传输
- **健康检查**: 无限制的健康检查端点
- **错误处理**: 标准化JSON错误响应

##  运维操作

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f whosee-server

# 重启特定服务
docker-compose restart whosee-server

# 更新镜像并重启
docker-compose pull
docker-compose up -d

# 清理未使用的镜像和容器
docker system prune
```

### 健康检查

```bash
# 检查应用健康状态
curl http://localhost:3900/api/health

# 检查Redis连接
docker-compose exec redis redis-cli ping

# 检查Chrome状态
curl http://localhost:3900/api/v1/screenshot/chrome/status
```

### 日志管理

```bash
# 查看应用日志
docker-compose logs whosee-server

# 查看访问日志（如果使用Nginx）
docker-compose logs nginx

# 查看Redis日志
docker-compose logs redis

# 清理日志（谨慎操作）
docker-compose logs --no-log-prefix whosee-server 2>/dev/null | head -1000 > backup.log
docker-compose restart whosee-server
```

##  监控和调试

### 性能监控

```bash
# 查看容器资源使用
docker stats

# 查看Chrome管理器状态
curl http://localhost:3900/api/v1/screenshot/chrome/status | jq

# 查看详细健康状态
curl "http://localhost:3900/api/health?detailed=true" | jq
```

### 调试技巧

```bash
# 进入容器调试
docker-compose exec whosee-server sh

# 查看容器内部文件
docker-compose exec whosee-server ls -la /app

# 测试截图功能
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -d '{"type":"basic","domain":"example.com","format":"file"}'
```

##  更新和备份

### 应用更新

```bash
# 1. 备份当前版本
docker-compose down
cp -r . ../whosee-backup-$(date +%Y%m%d)

# 2. 更新代码
git pull origin main

# 3. 重新构建和启动
docker-compose build --no-cache
docker-compose up -d

# 4. 验证服务
curl http://localhost:3900/api/health
```

### 数据备份

```bash
# 备份Redis数据
docker-compose exec redis redis-cli BGSAVE

# 备份静态文件
tar -czf static-backup-$(date +%Y%m%d).tar.gz static/

# 备份日志
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

##  故障排除

### 常见问题

1. **服务启动失败**
   ```bash
   # 查看详细错误信息
   docker-compose logs whosee-server

   # 检查环境变量
   docker-compose config
   ```

2. **Chrome启动失败**
   ```bash
   # 查看Chrome相关日志
   docker-compose logs whosee-server | grep -i chrome

   # 重启Chrome管理器
   curl -X POST http://localhost:3900/api/v1/screenshot/chrome/restart
   ```

3. **Redis连接失败**
   ```bash
   # 检查Redis状态
   docker-compose exec redis redis-cli ping

   # 查看网络连接
   docker-compose exec whosee-server nslookup redis
   ```

4. **端口占用**
   ```bash
   # 查看端口占用
   netstat -tulpn | grep :3900

   # 修改端口映射
   # 编辑 docker-compose.yml 中的 ports 配置
   ```

### 性能优化

1. **内存优化**
   ```yaml
   # 在 docker-compose.yml 中添加内存限制
   deploy:
     resources:
       limits:
         memory: 1G
       reservations:
         memory: 512M
   ```

2. **并发优化**
   ```bash
   # 调整Chrome并发数（环境变量）
   CHROME_MAX_CONCURRENT=3
   ```

## 📚 最佳实践

1. **生产环境**
   - 使用具体版本标签而非 `latest`
   - 配置日志轮转避免磁盘占满
   - 设置健康检查和自动重启
   - 使用 Nginx 反向代理
   - 配置 SSL/TLS 证书

2. **安全建议**
   - 定期更新镜像版本
   - 使用强密码和密钥
   - 限制网络访问权限
   - 监控异常访问日志

3. **监控建议**
   - 配置日志收集系统
   - 设置关键指标监控
   - 建立告警机制
   - 定期备份重要数据

## 🔗 相关文档

- [项目主文档](../README.md)
- [截图服务重构文档](../docs/SCREENSHOT_REFACTOR.md)
- [认证流程文档](../docs/BACKEND_AUTHENTICATION_FLOW.md)
- [API响应格式文档](../docs/ALL_JSON.md)