# 截图服务使用指南

**版本**: 2.0 (重构统一版)
**最后更新**: 2025-12-04

---

## 快速开始

### 前提条件

1. 服务已启动并运行在 `http://localhost:3900`
2. 已配置环境变量（Redis、JWT_SECRET、API_KEY等）
3. Chrome已自动下载并初始化

### 认证方式

所有API请求需要认证，有三种方式：

**方式1: JWT Token + API Key（推荐）**
```bash
# 1. 获取JWT Token（30秒有效）
TOKEN=$(curl -s -X POST http://localhost:3900/api/auth/token | jq -r '.token')

# 2. 使用Token和API Key调用
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: your-api-key" \
     http://localhost:3900/api/v1/screenshot/...
```

**方式2: 仅API Key（宽松模式）**
```bash
curl -H "X-API-KEY: your-api-key" \
     http://localhost:3900/api/v1/screenshot/...
```

**方式3: 开发模式（跳过认证）**
```bash
# .env中设置
API_DEV_MODE=true
```

---

## 统一API使用（推荐）

### 端点
```
POST /api/v1/screenshot/
```

### 基本格式

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "截图类型",
    "domain": "目标域名",
    "format": "输出格式"
  }'
```

---

## 六种截图类型详解

### 1. 基础完整页面截图

**用途**: 捕获整个网页的完整截图

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "basic",
    "domain": "example.com",
    "format": "file"
  }'
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "type": "basic",
    "domain": "example.com",
    "file_url": "/static/screenshots/example_com_1733308800.png",
    "timestamp": "2025-12-04T10:30:00Z",
    "cached": false,
    "metadata": {
      "viewport_width": 1920,
      "viewport_height": 1080,
      "file_size": 245678
    }
  }
}
```

**访问截图**:
```
http://localhost:3900/static/screenshots/example_com_1733308800.png
```

---

### 2. 元素截图

**用途**: 只截取页面中特定的元素

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "element",
    "domain": "example.com",
    "selector": "#header",
    "selector_type": "css",
    "format": "file"
  }'
```

**XPath选择器示例**:
```json
{
  "type": "element",
  "domain": "example.com",
  "selector": "//div[@class='main-content']",
  "selector_type": "xpath"
}
```

**常用选择器**:
```
CSS选择器:
- #header          (ID)
- .main-content    (类名)
- nav ul li        (嵌套)
- a[href^="http"]  (属性)

XPath选择器:
- //div[@id='header']
- //div[@class='main-content']
- //a[contains(@href, 'example')]
```

---

### 3. ITDog性能地图

**用途**: 捕获ITDog网站的全国节点分布地图

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "itdog_map",
    "domain": "example.com",
    "format": "file"
  }'
```

**效果**: 截取ITDog页面上显示中国地图的部分，展示各地节点的响应状态

---

### 4. ITDog结果表格

**用途**: 捕获ITDog测试结果的详细数据表格

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "itdog_table",
    "domain": "example.com",
    "format": "file"
  }'
```

**效果**: 截取包含各地区测试数据的表格（响应时间、丢包率等）

---

### 5. ITDog IP统计

**用途**: 捕获目标域名的IP地址统计信息

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "itdog_ip",
    "domain": "example.com",
    "format": "file"
  }'
```

**效果**: 截取IP地址分布、地理位置等统计信息

---

### 6. ITDog综合测速

**用途**: 捕获ITDog全国DNS解析速度测试的完整结果

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "type": "itdog_resolve",
    "domain": "example.com",
    "format": "file"
  }'
```

**效果**: 截取全国各地DNS解析速度的综合测试结果

---

## 输出格式

### 文件格式（默认）

```json
{
  "type": "basic",
  "domain": "example.com",
  "format": "file"
}
```

**返回**: 文件URL路径
```json
{
  "file_url": "/static/screenshots/example_com_1733308800.png"
}
```

**访问**: `http://localhost:3900/static/screenshots/example_com_1733308800.png`

---

### Base64格式

```json
{
  "type": "basic",
  "domain": "example.com",
  "format": "base64"
}
```

**返回**: Base64编码的图片数据
```json
{
  "base64": "iVBORw0KGgoAAAANSUhEUgAA...(very long string)",
  "mime_type": "image/png"
}
```

**使用场景**:
- 直接嵌入HTML: `<img src="data:image/png;base64,...">`
- API响应直接包含图片
- 不需要额外的HTTP请求

---

## 高级参数

### 自定义视口大小

```json
{
  "type": "basic",
  "domain": "example.com",
  "viewport_width": 1920,
  "viewport_height": 1080
}
```

**常用分辨率**:
- 桌面: 1920x1080, 1366x768
- 平板: 768x1024
- 手机: 375x667, 414x896

---

### 自定义等待时间

```json
{
  "type": "basic",
  "domain": "example.com",
  "wait_time": 5000  // 毫秒
}
```

**建议**:
- 静态页面: 2000-3000ms
- 动态页面: 5000-8000ms
- SPA应用: 8000-15000ms

---

### 使用完整URL

```json
{
  "type": "basic",
  "url": "https://example.com/specific/page?param=value"
}
```

**注意**: `url`参数优先级高于`domain`

---

### 缓存控制

```json
{
  "type": "basic",
  "domain": "example.com",
  "cache_expire": 48  // 小时
}
```

**限制**: 1分钟 - 72小时（P2-2安全保护）

---

## Legacy API（向后兼容）

如果你已有使用旧API的客户端，无需修改，仍然可以正常工作：

### 基础截图

```bash
# GET方式
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/screenshot/example.com

# 返回文件URL
```

---

### Base64截图

```bash
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/screenshot/base64/example.com

# 直接返回Base64字符串
```

---

### ITDog截图

```bash
# ITDog基础
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/itdog/example.com

# ITDog表格
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/itdog/table/example.com

# ITDog IP
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/itdog/ip/example.com

# ITDog解析
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/itdog/resolve/example.com
```

---

### 元素截图

```bash
curl -X POST http://localhost:3900/api/v1/screenshot/element \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "domain": "example.com",
    "selector": "#header",
    "selector_type": "css"
  }'
```

---

## 实际使用示例

### 示例1: 监控网站首页变化

```bash
#!/bin/bash
# 每小时截图一次，比对变化

API_KEY="your-api-key"
DOMAIN="example.com"

while true; do
  TIMESTAMP=$(date +%s)

  curl -X POST http://localhost:3900/api/v1/screenshot/ \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: $API_KEY" \
    -d "{
      \"type\": \"basic\",
      \"domain\": \"$DOMAIN\",
      \"format\": \"file\",
      \"cache_expire\": 0
    }" | jq -r '.data.file_url' > "screenshot_${TIMESTAMP}.txt"

  sleep 3600  # 1小时
done
```

---

### 示例2: 批量截图多个域名

```bash
#!/bin/bash
# 批量截图

DOMAINS=(
  "example.com"
  "google.com"
  "github.com"
)

for domain in "${DOMAINS[@]}"; do
  echo "Capturing $domain..."

  curl -X POST http://localhost:3900/api/v1/screenshot/ \
    -H "Content-Type: application/json" \
    -H "X-API-KEY: your-api-key" \
    -d "{
      \"type\": \"basic\",
      \"domain\": \"$domain\",
      \"format\": \"file\"
    }" | jq '.data.file_url'

  sleep 5  # 避免过快请求
done
```

---

### 示例3: Python客户端

```python
import requests
import time

class ScreenshotClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.token = None
        self.token_expires = 0

    def get_token(self):
        """获取JWT Token"""
        if time.time() < self.token_expires:
            return self.token

        response = requests.post(f"{self.base_url}/api/auth/token")
        data = response.json()

        self.token = data['token']
        self.token_expires = time.time() + 25  # 提前5秒刷新

        return self.token

    def screenshot(self, screenshot_type, domain, **kwargs):
        """统一截图接口"""
        headers = {
            'Authorization': f'Bearer {self.get_token()}',
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

        payload = {
            'type': screenshot_type,
            'domain': domain,
            **kwargs
        }

        response = requests.post(
            f"{self.base_url}/api/v1/screenshot/",
            headers=headers,
            json=payload
        )

        return response.json()

# 使用示例
client = ScreenshotClient('http://localhost:3900', 'your-api-key')

# 基础截图
result = client.screenshot('basic', 'example.com', format='file')
print(f"Screenshot URL: {result['data']['file_url']}")

# 元素截图
result = client.screenshot(
    'element',
    'example.com',
    selector='#header',
    selector_type='css',
    format='base64'
)
print(f"Base64 length: {len(result['data']['base64'])}")

# ITDog性能地图
result = client.screenshot('itdog_map', 'google.com')
print(f"ITDog map: {result['data']['file_url']}")
```

---

### 示例4: JavaScript/Node.js客户端

```javascript
const axios = require('axios');

class ScreenshotClient {
  constructor(baseURL, apiKey) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.token = null;
    this.tokenExpires = 0;
  }

  async getToken() {
    if (Date.now() < this.tokenExpires) {
      return this.token;
    }

    const response = await axios.post(`${this.baseURL}/api/auth/token`);
    this.token = response.data.token;
    this.tokenExpires = Date.now() + 25000; // 25秒后刷新

    return this.token;
  }

  async screenshot(type, domain, options = {}) {
    const token = await this.getToken();

    const response = await axios.post(
      `${this.baseURL}/api/v1/screenshot/`,
      {
        type,
        domain,
        ...options
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }
}

// 使用示例
(async () => {
  const client = new ScreenshotClient('http://localhost:3900', 'your-api-key');

  // 基础截图
  const result1 = await client.screenshot('basic', 'example.com', {
    format: 'file'
  });
  console.log('Screenshot URL:', result1.data.file_url);

  // ITDog测速
  const result2 = await client.screenshot('itdog_resolve', 'google.com');
  console.log('ITDog resolve:', result2.data.file_url);
})();
```

---

## Chrome管理

### 查看Chrome状态

```bash
curl -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/screenshot/chrome/status
```

**响应**:
```json
{
  "running": true,
  "mode": "auto",
  "uptime": "2h35m",
  "requests_handled": 142,
  "circuit_breaker_state": "closed",
  "available_slots": 2,
  "total_slots": 3
}
```

---

### 重启Chrome

```bash
curl -X POST \
  -H "X-API-KEY: your-api-key" \
  http://localhost:3900/api/v1/screenshot/chrome/restart
```

**响应**:
```json
{
  "success": true,
  "message": "Chrome restarted successfully",
  "new_pid": 12345
}
```

---

## 错误处理

### 常见错误

**1. 域名格式错误**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DOMAIN",
    "message": "Domain should not contain path or query"
  }
}
```
**解决**: 使用纯域名或使用`url`参数

---

**2. 截图超时**
```json
{
  "success": false,
  "error": {
    "code": "SCREENSHOT_TIMEOUT",
    "message": "Screenshot timeout after 30s"
  }
}
```
**解决**: 增加`wait_time`参数或检查目标网站可访问性

---

**3. Chrome未运行**
```json
{
  "success": false,
  "error": {
    "code": "CHROME_NOT_AVAILABLE",
    "message": "Chrome instance not running"
  }
}
```
**解决**: 重启Chrome或等待自动恢复

---

**4. 元素未找到**
```json
{
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "Element matching selector not found"
  }
}
```
**解决**: 检查选择器语法和页面结构

---

## 最佳实践

### 1. 选择合适的截图类型

```
需求                     推荐类型
-------------------------------------
网站首页快照              basic
特定页面元素              element
网站性能监控              itdog_map
DNS解析速度测试           itdog_resolve
详细测试数据              itdog_table
IP统计信息               itdog_ip
```

---

### 2. 缓存策略

```bash
# 静态首页 - 长缓存
{
  "cache_expire": 72  # 3天
}

# 动态内容 - 短缓存
{
  "cache_expire": 1   # 1小时
}

# 实时监控 - 禁用缓存
{
  "cache_expire": 0   # 关闭（最小1分钟）
}
```

---

### 3. 错误重试

```python
def screenshot_with_retry(client, domain, max_retries=3):
    for i in range(max_retries):
        try:
            result = client.screenshot('basic', domain)
            if result['success']:
                return result
        except Exception as e:
            if i == max_retries - 1:
                raise
            time.sleep(2 ** i)  # 指数退避

    return None
```

---

### 4. 批量请求

```bash
# 不要太快 - 会触发限流
for domain in domains; do
  screenshot $domain
  sleep 2  # 间隔2秒
done
```

---

## 性能提示

### Chrome运行模式选择

```bash
# .env配置
CHROME_MODE=auto  # 推荐：平衡性能和资源
```

**场景建议**:
- 频繁截图（>10次/分钟）: `CHROME_MODE=warm`
- 偶尔截图（<1次/小时）: `CHROME_MODE=cold`
- 混合使用: `CHROME_MODE=auto`（默认）

---

### 并发控制

系统自动限制最多3个并发截图：
- 第4个请求会排队等待
- 不会被拒绝，只是等待
- 平均等待时间通常<5秒

---

### 响应时间预期

```
截图类型        首次      缓存命中
-------------------------------------
basic          2-4秒     <100ms
element        2-5秒     <100ms
itdog_*        5-10秒    <100ms

Chrome模式影响:
cold: +2秒
warm: -1秒
auto: 正常
```

---

## 故障排查

### 问题1: 截图一直失败

```bash
# 检查Chrome状态
curl http://localhost:3900/api/v1/screenshot/chrome/status

# 如果Chrome未运行，等待自动启动或手动重启
curl -X POST http://localhost:3900/api/v1/screenshot/chrome/restart
```

---

### 问题2: 截图质量差

```json
{
  "type": "basic",
  "domain": "example.com",
  "viewport_width": 1920,   // 增加分辨率
  "viewport_height": 1080,
  "wait_time": 5000         // 增加等待时间
}
```

---

### 问题3: 特定网站超时

```json
{
  "type": "basic",
  "domain": "slow-site.com",
  "wait_time": 15000  // 增加到15秒
}
```

---

## 完整示例脚本

```bash
#!/bin/bash
# 完整的截图服务使用示例

# 配置
BASE_URL="http://localhost:3900"
API_KEY="your-api-key"
DOMAIN="example.com"

# 获取Token
TOKEN=$(curl -s -X POST "${BASE_URL}/api/auth/token" | jq -r '.token')

# 统一API - 基础截图
echo "1. 基础截图..."
curl -X POST "${BASE_URL}/api/v1/screenshot/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"basic\",
    \"domain\": \"${DOMAIN}\",
    \"format\": \"file\"
  }" | jq '.'

# 元素截图
echo "2. 元素截图..."
curl -X POST "${BASE_URL}/api/v1/screenshot/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"element\",
    \"domain\": \"${DOMAIN}\",
    \"selector\": \"#header\",
    \"selector_type\": \"css\",
    \"format\": \"file\"
  }" | jq '.'

# ITDog性能地图
echo "3. ITDog性能地图..."
curl -X POST "${BASE_URL}/api/v1/screenshot/" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-API-KEY: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"itdog_map\",
    \"domain\": \"${DOMAIN}\",
    \"format\": \"file\"
  }" | jq '.'

# Chrome状态检查
echo "4. Chrome状态..."
curl -H "X-API-KEY: ${API_KEY}" \
  "${BASE_URL}/api/v1/screenshot/chrome/status" | jq '.'

echo "完成！"
```

---

## 总结

### 推荐使用流程

1. **开发测试**: 使用`API_DEV_MODE=true`跳过认证
2. **生产环境**: 使用JWT Token + API Key双重认证
3. **选择API**: 新项目使用统一API，旧项目继续用Legacy
4. **监控**: 定期检查Chrome状态和健康检查端点
5. **优化**: 根据使用频率选择合适的Chrome运行模式

### 快速参考

```bash
# 最简单的使用（开发模式）
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Content-Type: application/json" \
  -d '{"type":"basic","domain":"example.com"}'

# 生产环境使用
TOKEN=$(curl -s -X POST http://localhost:3900/api/auth/token | jq -r '.token')
curl -X POST http://localhost:3900/api/v1/screenshot/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"type":"basic","domain":"example.com"}'
```

---

**文档维护**: Claude Code
**需要帮助**: 查看 [SCREENSHOT_REFACTOR.md](SCREENSHOT_REFACTOR.md) 或提交Issue
