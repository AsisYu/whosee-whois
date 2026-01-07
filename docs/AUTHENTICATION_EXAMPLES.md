# 认证示例集合

## 概述

本文档提供了 Whosee WHOIS 后端认证的详细示例，包括各种场景下的 curl 命令、代码示例和故障排除方法。

## 环境准备

### 环境变量设置

```bash
# 设置环境变量
export API_BASE_URL="http://localhost:3001"
export API_KEY="your-api-key-here"
export JWT_SECRET="your-super-secret-jwt-key-here"
```

### 服务器启动

```bash
# 启动后端服务器
cd server
go run main.go

# 验证服务器运行
curl http://localhost:3001/api/health
```

## 认证示例

### 1. 基础认证流程

#### 步骤1: 获取JWT令牌

```bash
# 获取JWT令牌
curl -X POST \
  http://localhost:3001/api/auth/token \
  -H "Content-Type: application/json" \
  -v
```

**响应示例**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MDYyNjg5MzAsImlhdCI6MTcwNjI2ODkwMCwiaXAiOiIxMjcuMC4wLjEiLCJub25jZSI6ImFiY2RlZjEyMzQ1NiJ9.signature"
}
```

#### 步骤2: 使用令牌调用API

```bash
# 保存令牌到变量
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

# 使用令牌调用WHOIS API
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/whois/google.com
```

### 2. 不同认证场景

#### 场景A: 白名单IP + JWT令牌（推荐）

```bash
# 从白名单IP（如127.0.0.1）访问
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3001/api/v1/whois/github.com
```

#### 场景B: API密钥 + JWT令牌（最安全）

```bash
# 使用API密钥和JWT令牌
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: your-api-key" \
     http://localhost:3001/api/v1/whois/baidu.com
```

#### 场景C: 仅API密钥（宽松模式）

```bash
# 仅使用API密钥（需要宽松模式）
curl -H "X-API-KEY: your-api-key" \
     http://localhost:3001/api/v1/whois/stackoverflow.com
```

#### 场景D: 查询参数中的API密钥

```bash
# 通过查询参数传递API密钥
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3001/api/v1/whois/example.com?apikey=your-api-key"
```

### 3. 各种API端点示例

#### WHOIS查询

```bash
# 基础WHOIS查询
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/whois/google.com
```

#### RDAP查询

```bash
# RDAP协议查询
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/rdap/github.com
```

#### DNS查询

```bash
# DNS记录查询
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/dns/cloudflare.com
```

#### 网站截图

```bash
# 网站截图服务
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/screenshot/example.com
```

#### 健康检查（无需认证）

```bash
# 健康检查端点（公开访问）
curl http://localhost:3001/api/health
```

## 代码示例

### JavaScript/Node.js 示例

#### 基础认证客户端

```javascript
class WhoisApiClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.token = null;
    this.tokenExpiry = 0;
  }

  // 获取JWT令牌
  async getToken() {
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Token获取失败: ${response.status}`);
      }

      const data = await response.json();
      this.token = data.token;
      this.tokenExpiry = Date.now() + 25000; // 25秒后过期
      
      return this.token;
    } catch (error) {
      console.error('Token获取错误:', error);
      throw error;
    }
  }

  // 通用API请求方法
  async apiRequest(endpoint, options = {}) {
    const token = await this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-KEY': this.apiKey,
      ...options.headers
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    return response.json();
  }

  // WHOIS查询
  async queryWhois(domain) {
    return this.apiRequest(`/api/v1/whois/${domain}`);
  }

  // DNS查询
  async queryDns(domain) {
    return this.apiRequest(`/api/v1/dns/${domain}`);
  }

  // RDAP查询
  async queryRdap(domain) {
    return this.apiRequest(`/api/v1/rdap/${domain}`);
  }
}

// 使用示例
const client = new WhoisApiClient('http://localhost:3001', 'your-api-key');

// 查询域名信息
client.queryWhois('google.com')
  .then(data => console.log('WHOIS数据:', data))
  .catch(error => console.error('查询失败:', error));
```

### Python 示例

```python
import requests
import time
import json

class WhoisApiClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.api_key = api_key
        self.token = None
        self.token_expiry = 0
        self.session = requests.Session()
    
    def get_token(self):
        """获取JWT令牌"""
        if self.token and time.time() < self.token_expiry:
            return self.token
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/token",
                headers={'Content-Type': 'application/json'}
            )
            response.raise_for_status()
            
            data = response.json()
            self.token = data['token']
            self.token_expiry = time.time() + 25  # 25秒后过期
            
            return self.token
        except requests.RequestException as e:
            print(f"Token获取失败: {e}")
            raise
    
    def api_request(self, endpoint, method='GET', **kwargs):
        """通用API请求方法"""
        token = self.get_token()
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}',
            'X-API-KEY': self.api_key
        }
        
        if 'headers' in kwargs:
            headers.update(kwargs['headers'])
            del kwargs['headers']
        
        response = self.session.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )
        response.raise_for_status()
        return response.json()
    
    def query_whois(self, domain):
        """WHOIS查询"""
        return self.api_request(f'/api/v1/whois/{domain}')
    
    def query_dns(self, domain):
        """DNS查询"""
        return self.api_request(f'/api/v1/dns/{domain}')
    
    def query_rdap(self, domain):
        """RDAP查询"""
        return self.api_request(f'/api/v1/rdap/{domain}')

# 使用示例
if __name__ == '__main__':
    client = WhoisApiClient('http://localhost:3001', 'your-api-key')
    
    try:
        # 查询域名信息
        whois_data = client.query_whois('google.com')
        print('WHOIS数据:', json.dumps(whois_data, indent=2, ensure_ascii=False))
        
        # 查询DNS记录
        dns_data = client.query_dns('google.com')
        print('DNS数据:', json.dumps(dns_data, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f'查询失败: {e}')
```

### Go 示例

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type WhoisApiClient struct {
    BaseURL     string
    APIKey      string
    Token       string
    TokenExpiry time.Time
    Client      *http.Client
}

type TokenResponse struct {
    Token string `json:"token"`
}

func NewWhoisApiClient(baseURL, apiKey string) *WhoisApiClient {
    return &WhoisApiClient{
        BaseURL: baseURL,
        APIKey:  apiKey,
        Client:  &http.Client{Timeout: 30 * time.Second},
    }
}

// 获取JWT令牌
func (c *WhoisApiClient) GetToken() (string, error) {
    if c.Token != "" && time.Now().Before(c.TokenExpiry) {
        return c.Token, nil
    }

    req, err := http.NewRequest("POST", c.BaseURL+"/api/auth/token", nil)
    if err != nil {
        return "", err
    }
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.Client.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("token获取失败: %d", resp.StatusCode)
    }

    var tokenResp TokenResponse
    if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
        return "", err
    }

    c.Token = tokenResp.Token
    c.TokenExpiry = time.Now().Add(25 * time.Second)

    return c.Token, nil
}

// 通用API请求方法
func (c *WhoisApiClient) APIRequest(endpoint string) (map[string]interface{}, error) {
    token, err := c.GetToken()
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("GET", c.BaseURL+endpoint, nil)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+token)
    req.Header.Set("X-API-KEY", c.APIKey)

    resp, err := c.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API请求失败: %d", resp.StatusCode)
    }

    var result map[string]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return result, nil
}

// WHOIS查询
func (c *WhoisApiClient) QueryWhois(domain string) (map[string]interface{}, error) {
    return c.APIRequest("/api/v1/whois/" + domain)
}

// 使用示例
func main() {
    client := NewWhoisApiClient("http://localhost:3001", "your-api-key")

    // 查询域名信息
    data, err := client.QueryWhois("google.com")
    if err != nil {
        fmt.Printf("查询失败: %v\n", err)
        return
    }

    jsonData, _ := json.MarshalIndent(data, "", "  ")
    fmt.Printf("WHOIS数据: %s\n", jsonData)
}
```

## 错误处理示例

### 常见错误及解决方案

#### 1. 认证失败 (403)

```bash
# 错误响应
{
  "error": "ACCESS_DENIED",
  "message": "您没有访问此API的权限"
}

# 解决方案
# 检查API密钥是否正确
echo "当前API密钥: $API_KEY"

# 检查IP是否在白名单中
curl -s http://ipinfo.io/ip

# 重新获取令牌
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')
echo "新令牌: $TOKEN"
```

#### 2. 令牌过期 (401)

```bash
# 错误响应
{
  "error": "INVALID_TOKEN",
  "message": "无效的认证令牌"
}

# 解决方案：重新获取令牌
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

# 立即使用新令牌
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/whois/example.com
```

#### 3. 限流错误 (429)

```bash
# 错误响应
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "请求过于频繁，请稍后再试"
}

# 解决方案：等待后重试
echo "等待5秒后重试..."
sleep 5
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')
```

### 错误处理脚本

```bash
#!/bin/bash

# 带重试机制的API调用脚本
api_call_with_retry() {
    local domain=$1
    local max_retries=3
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        echo "尝试 $((retry_count + 1))/$max_retries: 查询 $domain"
        
        # 获取新令牌
        TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')
        
        if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
            echo "令牌获取失败，等待5秒后重试..."
            sleep 5
            retry_count=$((retry_count + 1))
            continue
        fi
        
        # 调用API
        response=$(curl -s -w "%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -H "X-API-KEY: $API_KEY" \
            http://localhost:3001/api/v1/whois/$domain)
        
        http_code=${response: -3}
        response_body=${response%???}
        
        case $http_code in
            200)
                echo "查询成功!"
                echo $response_body | jq .
                return 0
                ;;
            401)
                echo "认证失败，重新获取令牌..."
                ;;
            403)
                echo "访问被拒绝，检查API密钥和IP白名单"
                return 1
                ;;
            429)
                echo "请求过于频繁，等待10秒..."
                sleep 10
                ;;
            *)
                echo "未知错误: HTTP $http_code"
                echo $response_body
                ;;
        esac
        
        retry_count=$((retry_count + 1))
        sleep 2
    done
    
    echo "达到最大重试次数，查询失败"
    return 1
}

# 使用示例
api_call_with_retry "google.com"
api_call_with_retry "github.com"
api_call_with_retry "stackoverflow.com"
```

## 调试技巧

### 1. 详细日志输出

```bash
# 启用详细输出
curl -v -X POST http://localhost:3001/api/auth/token

# 查看请求和响应头
curl -i -H "Authorization: Bearer $TOKEN" \
     -H "X-API-KEY: $API_KEY" \
     http://localhost:3001/api/v1/whois/example.com
```

### 2. 令牌解析

```bash
# 解析JWT令牌内容（需要安装jq）
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')

# 解码JWT payload（Base64）
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

### 3. 网络连接测试

```bash
# 测试服务器连接
telnet localhost 3001

# 检查端口是否开放
nc -zv localhost 3001

# 测试DNS解析
nslookup localhost
```

## 性能测试

### 并发测试脚本

```bash
#!/bin/bash

# 并发API调用测试
concurrent_test() {
    local concurrent_users=10
    local requests_per_user=5
    
    echo "开始并发测试: $concurrent_users 用户，每用户 $requests_per_user 请求"
    
    for i in $(seq 1 $concurrent_users); do
        {
            for j in $(seq 1 $requests_per_user); do
                TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/token | jq -r '.token')
                
                start_time=$(date +%s%N)
                response=$(curl -s \
                    -H "Authorization: Bearer $TOKEN" \
                    -H "X-API-KEY: $API_KEY" \
                    http://localhost:3001/api/v1/whois/example$j.com)
                end_time=$(date +%s%N)
                
                duration=$(( (end_time - start_time) / 1000000 ))
                echo "用户$i 请求$j: ${duration}ms"
            done
        } &
    done
    
    wait
    echo "并发测试完成"
}

```

---