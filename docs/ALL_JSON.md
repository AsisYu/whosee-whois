# Whosee-Whois API 返回格式文档

本文档列出了所有API端点的返回JSON格式，供前端开发参考。

## API 安全认证

**重要提示：除了健康检查API (`/api/health`) 和令牌获取API (`/api/auth/token`) 外，所有API端点都需要JWT令牌认证！**

### 认证流程
1. 先调用 `POST /api/auth/token` 获取JWT令牌
2. 在后续API请求中添加 `Authorization: Bearer <token>` 请求头
3. 令牌有效期为30秒，每个令牌只能使用一次

## 目录

- [认证相关 API](#认证相关-api)
  - [获取JWT令牌](#获取jwt令牌)
- [WHOIS查询 API](#whois查询-api)
- [RDAP查询 API](#rdap查询-api)
- [DNS查询 API](#dns查询-api)
- [网站截图 API](#网站截图-api)
  - [普通截图](#普通截图)
  - [Base64编码截图](#base64编码截图)
- [ITDog测速 API](#itdog测速-api)
  - [普通截图](#普通截图-1)
  - [Base64编码截图](#base64编码截图-1)
- [健康检查 API](#健康检查-api)

## 认证相关 API

### 获取JWT令牌

**端点**: `/api/auth/token`  
**方法**: POST  
**认证要求**: 无  
**返回格式**:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## WHOIS查询 API

**端点**: `/api/v1/whois` 或 `/api/v1/whois/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "available": false,
    "domain": "example.com",
    "registrar": "Example Registrar, LLC",
    "creationDate": "1995-08-14T04:00:00Z",
    "expiryDate": "2025-08-13T04:00:00Z",
    "status": ["clientDeleteProhibited", "clientTransferProhibited", "clientUpdateProhibited"],
    "nameServers": ["ns1.example.com", "ns2.example.com"],
    "updatedDate": "2023-08-14T04:00:00Z",
    "statusCode": 200,
    "statusMessage": "Domain found",
    "sourceProvider": "whois-provider-name"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "cached": true,
    "cachedAt": "2025-05-10T16:30:00+08:00",
    "processing": 25
  }
}
```

## RDAP查询 API

**端点**: `/api/v1/rdap` 或 `/api/v1/rdap/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**说明**: RDAP (Registration Data Access Protocol) 是WHOIS的现代化替代协议，提供标准化JSON格式响应  
**返回格式**:

```json
{
  "success": true,
  "data": {
    "available": false,
    "domain": "google.com",
    "registrar": "MarkMonitor Inc.",
    "creationDate": "1997-09-15",
    "expiryDate": "2028-09-14",
    "status": [
      "client delete prohibited",
      "client transfer prohibited", 
      "client update prohibited",
      "server delete prohibited",
      "server transfer prohibited",
      "server update prohibited"
    ],
    "nameServers": [
      "NS1.GOOGLE.COM",
      "NS2.GOOGLE.COM", 
      "NS3.GOOGLE.COM",
      "NS4.GOOGLE.COM"
    ],
    "updatedDate": "2025-06-19",
    "statusCode": 200,
    "statusMessage": "查询成功",
    "sourceProvider": "IANA-RDAP",
    "protocol": "RDAP"
  },
  "meta": {
    "timestamp": "2025-06-19T23:36:48+08:00",
    "cached": true,
    "cachedAt": "2025-06-19 23:36:48",
    "processingTimeMs": 1047
  }
}
```

## DNS查询 API

**端点**: `/api/v1/dns` 或 `/api/v1/dns/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "records": {
      "A": [
        {
          "name": "example.com",
          "ttl": 3600,
          "value": "93.184.216.34"
        }
      ],
      "MX": [
        {
          "name": "example.com",
          "ttl": 3600,
          "priority": 10,
          "value": "mail.example.com"
        }
      ],
      "NS": [
        {
          "name": "example.com",
          "ttl": 172800,
          "value": "ns1.example.com"
        },
        {
          "name": "example.com",
          "ttl": 172800,
          "value": "ns2.example.com"
        }
      ],
      "TXT": [
        {
          "name": "example.com",
          "ttl": 3600,
          "value": "v=spf1 include:example.com ~all"
        }
      ]
    },
    "status": "success"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 150
  }
}
```

## 网站截图 API

### 普通截图

**端点**: `/api/v1/screenshot` 或 `/api/v1/screenshot/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageUrl": "/static/screenshots/example.com_20250510173000.png",
    "status": "success",
    "title": "Example Domain",
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 3500
  }
}
```

### Base64编码截图

**端点**: `/api/v1/screenshot/base64/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "success": true,
  "domain": "example.com",
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "title": "Example Domain",
  "timestamp": "2025-05-10T17:30:00+08:00",
  "processingTime": 3200
}
```

## ITDog测速 API

### 普通截图

**端点**: `/api/v1/itdog/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageUrl": "/static/itdog/example.com_20250510173000.png",
    "status": "success",
    "testResults": {
      "pingMin": 35.6,
      "pingAvg": 42.8,
      "pingMax": 55.3,
      "pingLoss": 0,
      "speedRank": "A",
      "testLocations": ["北京", "上海", "广州", "深圳"]
    },
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 5000
  }
}
```

### Base64编码截图

**端点**: `/api/v1/itdog/base64/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "success": true,
  "domain": "example.com",
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "testResults": {
    "pingMin": 35.6,
    "pingAvg": 42.8,
    "pingMax": 55.3,
    "pingLoss": 0,
    "speedRank": "A",
    "testLocations": ["北京", "上海", "广州", "深圳"]
  },
  "timestamp": "2025-05-10T17:30:00+08:00",
  "processingTime": 4800
}
```

### 表格截图

**端点**: `/api/v1/itdog/table/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageUrl": "/static/itdog/table/example.com_20250510173000.png",
    "status": "success",
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 4500
  }
}
```

### 表格Base64截图

**端点**: `/api/v1/itdog/table/base64/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "success",
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 4500
  }
}
```

### IP统计截图

**端点**: `/api/v1/itdog/ip/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageUrl": "/static/itdog/ip/example.com_20250510173000.png",
    "status": "success",
    "resolveInfo": {
      "ipCount": 1,
      "primaryIp": "158.179.173.57",
      "ipDistribution": [{
        "ip": "158.179.173.57",
        "percentage": 100.0
      }]
    },
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 3800
  }
}
```

### IP统计Base64截图

**端点**: `/api/v1/itdog/ip/base64/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "success",
    "resolveInfo": {
      "ipCount": 1,
      "primaryIp": "158.179.173.57",
      "ipDistribution": [{
        "ip": "158.179.173.57",
        "percentage": 100.0
      }]
    },
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 3800
  }
}
```

### 全国解析截图

**端点**: `/api/v1/itdog/resolve/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageUrl": "/static/itdog/resolve/example.com_20250510173000.png",
    "status": "success",
    "resolveInfo": {
      "ipCount": 1,
      "primaryIp": "158.179.173.57",
      "regionalData": {
        "北京": "158.179.173.57",
        "上海": "158.179.173.57",
        "广州": "158.179.173.57",
        "深圳": "158.179.173.57"
      }
    },
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 6000
  }
}
```

### 全国解析Base64截图

**端点**: `/api/v1/itdog/resolve/base64/:domain`  
**方法**: GET  
**认证要求**: JWT令牌  
**返回格式**:

```json
{
  "data": {
    "domain": "example.com",
    "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "status": "success",
    "resolveInfo": {
      "ipCount": 1,
      "primaryIp": "158.179.173.57",
      "regionalData": {
        "北京": "158.179.173.57",
        "上海": "158.179.173.57",
        "广州": "158.179.173.57",
        "深圳": "158.179.173.57"
      }
    },
    "timestamp": "2025-05-10T17:30:00+08:00"
  },
  "meta": {
    "timestamp": "2025-05-10T17:30:00+08:00",
    "processing": 6000
  }
}
```

## 健康检查 API

**端点**: `/api/health`  
**方法**: GET  
**认证要求**: 无（公开端点）  
**参数**: `detailed=true|false` (可选，默认false)  
**说明**: 监控所有服务组件的健康状态，包括WHOIS/RDAP提供商、DNS服务、截图服务等  
**返回格式**:

```json
{
  "status": "up",
  "version": "1.1.0",
  "time": "2025-06-19T15:30:00Z",
  "services": {
    "redis": {
      "status": "up",
      "latency": 2.5,
      "lastCheck": "2025-06-19T15:29:50Z"
    },
    "dns": {
      "status": "up",
      "total": 4,
      "available": 4,
      "servers": [
        {
          "server": "8.8.8.8",
          "status": "up",
          "responseTime": 15
        },
        {
          "server": "1.1.1.1", 
          "status": "up",
          "responseTime": 12
        }
      ],
      "lastCheck": "2025-06-19T15:29:50Z"
    },
    "whois": {
      "status": "up",
      "total": 4,
      "available": 4,
      "testSuccessful": 4,
      "providers": {
        "IANA-RDAP": {
          "available": true,
          "testSuccessful": true,
          "responseTime": 850,
          "statusCode": 200,
          "callCount": 125,
          "lastUsed": "2025-06-19T15:25:30Z"
        },
        "IANA-WHOIS": {
          "available": true,
          "testSuccessful": true,
          "responseTime": 1200,
          "statusCode": 200,
          "callCount": 89,
          "lastUsed": "2025-06-19T15:20:15Z"
        },
        "WhoisFreaks": {
          "available": true,
          "testSuccessful": true,
          "responseTime": 650,
          "statusCode": 200,
          "callCount": 234,
          "lastUsed": "2025-06-19T15:28:45Z"
        },
        "WhoisXML": {
          "available": true,
          "testSuccessful": true,
          "responseTime": 720,
          "statusCode": 200,
          "callCount": 156,
          "lastUsed": "2025-06-19T15:22:10Z"
        }
      },
      "lastCheck": "2025-06-19T15:29:50Z"
    },
    "screenshot": {
      "status": "up",
      "total": 1,
      "available": 1,
      "servers": [
        {
          "service": "Chrome截图服务",
          "status": "up",
          "mode": "智能混合模式",
          "lastUsed": "2025-06-19T15:28:30Z"
        }
      ],
      "lastCheck": "2025-06-19T15:29:50Z"
    },
    "itdog": {
      "status": "up",
      "total": 1,
      "available": 1,
      "servers": [
        {
          "service": "ITDog测速服务",
          "status": "up",
          "endpoint": "itdog.cn",
          "lastCheck": "2025-06-19T15:29:50Z"
        }
      ],
      "lastCheck": "2025-06-19T15:29:50Z"
    }
  },
  "lastCheck": "2025-06-19T15:30:00Z"
}
```

###  健康检查说明

- **WHOIS服务**: 包含4个提供商的健康状态
  - `IANA-RDAP`: 基于RDAP协议的现代化查询服务 
  - `IANA-WHOIS`: 基于TCP端口43的传统WHOIS查询
  - `WhoisFreaks`: 商业WHOIS API服务
  - `WhoisXML`: 商业WHOIS API服务

- **服务状态**: `up` (正常) | `degraded` (降级) | `down` (故障)
- **检查频率**: 每24小时自动执行一次完整健康检查
- **实时测试**: 每次健康检查都会用真实域名测试所有提供商

## 错误响应格式

所有API在发生错误时都会返回一致的错误格式：

```json
{
  "error": "ERROR_CODE",
  "message": "详细的错误描述信息",
  "timestamp": "2025-05-10T17:30:00+08:00",
  "path": "/api/v1/whois/invalid-domain"
}
```

### 常见错误代码

#### 认证相关错误
- `UNAUTHORIZED` (401): 未提供JWT令牌或令牌无效
- `FORBIDDEN` (403): 访问被禁止（IP白名单限制）
- `TOO_MANY_REQUESTS` (429): 请求频率过高

####  请求参数错误
- `MISSING_PARAMETER` (400): 缺少必要的参数（如domain参数）
- `INVALID_DOMAIN` (400): 域名格式无效
- `REQUEST_ENTITY_TOO_LARGE` (413): 请求实体过大

####  服务状态错误
- `SERVICE_BUSY` (503): 服务忙碌，请稍后重试
- `SERVICE_UNAVAILABLE` (503): 服务不可用
- `TIMEOUT` (504): 请求处理超时

####  查询相关错误
- `QUERY_ERROR` (500): 查询过程中发生错误
- `SCREENSHOT_ERROR` (500): 截图过程中发生错误
- `ITDOG_ERROR` (500): ITDog测试过程中发生错误
- `RDAP_ERROR` (500): RDAP查询过程中发生错误

###  错误处理建议

1. **401/403错误**: 检查JWT令牌是否有效，必要时重新获取
2. **429错误**: 等待一段时间后重试，遵守API限流规则
3. **503/504错误**: 服务器临时问题，建议指数退避重试
4. **500错误**: 服务器内部错误，检查请求参数或联系技术支持

##  完整使用示例

### JavaScript/Node.js 示例

```javascript
// 1. 获取JWT令牌
async function getToken() {
    const response = await fetch('http://localhost:3900/api/auth/token', {
        method: 'POST'
    });
    const data = await response.json();
    return data.token;
}

// 2. 使用令牌查询RDAP信息
async function queryRDAP(domain) {
    try {
        const token = await getToken();
        
        const response = await fetch(`http://localhost:3900/api/v1/rdap/${domain}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('RDAP查询结果:', data);
        return data;
        
    } catch (error) {
        console.error('查询失败:', error);
        throw error;
    }
}

// 使用示例
queryRDAP('google.com').then(result => {
    console.log('域名:', result.data.domain);
    console.log('注册商:', result.data.registrar);
    console.log('创建日期:', result.data.creationDate);
    console.log('到期日期:', result.data.expiryDate);
});
```

### Python 示例

```python
import requests
import json

def get_token():
    """获取JWT令牌"""
    response = requests.post('http://localhost:3900/api/auth/token')
    response.raise_for_status()
    return response.json()['token']

def query_rdap(domain):
    """查询RDAP信息"""
    try:
        token = get_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'http://localhost:3900/api/v1/rdap/{domain}',
            headers=headers
        )
        response.raise_for_status()
        
        data = response.json()
        print(f"RDAP查询结果: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data
        
    except requests.RequestException as e:
        print(f"查询失败: {e}")
        raise

# 使用示例
if __name__ == "__main__":
    result = query_rdap('google.com')
    print(f"域名: {result['data']['domain']}")
    print(f"注册商: {result['data']['registrar']}")
    print(f"创建日期: {result['data']['creationDate']}")
    print(f"到期日期: {result['data']['expiryDate']}")
```

### cURL 示例

```bash
#!/bin/bash

# 1. 获取JWT令牌
TOKEN=$(curl -s -X POST http://localhost:3900/api/auth/token | jq -r '.token')

# 2. 使用令牌查询RDAP信息
curl -X GET "http://localhost:3900/api/v1/rdap/google.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# 3. 查询WHOIS信息
curl -X GET "http://localhost:3900/api/v1/whois/google.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

# 4. 查询DNS记录
curl -X GET "http://localhost:3900/api/v1/dns/google.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
```

## 性能优化建议

1. **令牌复用**: 在30秒内复用同一个令牌（但每个令牌只能用一次）
2. **并发控制**: 避免同时发送过多请求，遵守限流规则
3. **缓存机制**: API返回的数据通常有缓存，重复查询会更快
4. **错误重试**: 实现指数退避重试机制处理临时错误
5. **健康检查**: 定期调用 `/api/health` 监控服务状态

---

