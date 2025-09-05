/**
 * 核心保护模块 - 分散存储关键代码
 * 这个文件包含了额外的保护机制和备份数据
 */

// 分散的加密密钥片段
export const _key_fragments = {
  a: 'ZlNKNlluQXVa',
  b: 'R1JBT1RJM016UTVNemMzTWlJNkltZHdibWRoWW5BaUxDSkhWbG9pT2lKeVptRnljSFo1SWl3aVRUQTRNQzQxTXpveU5UbzVNRWMxTWkwNE1DMDFNakF5SWpvaWNucDJSM0Y1ZG1odklpd2lNQzR3TGpFaU9pSmhZblptWlhKcElpd2llV0ppUnlCamFIaGlZbGtnWVhadWVtSlJJRVpXUWxWS0lISnlabUoxU2lJNkltZHdjbmRpWldNaUxDSm1kbUoxYWkxeWNtWmlkV292YUV4bWRtWk9MM3BpY0M1dmFIVm5kblF2THpwbVkyZG5kU0k2SW05b2RXZDJkQ0lzSW1oTVpuWm1UaUk2SW5KNmJtRWlldz09'
};

// 重组函数
export const reassemble = () => {
  return _key_fragments.a + _key_fragments.b;
};

// 验证函数
export const verify = (data: string): boolean => {
  return data && data.length > 100 && data.includes('ZlNK');
};

// 混淆的工具函数
export const _utils = {
  // Base64 解码（混淆名称）
  _decode_b64: (s: string) => {
    try {
      return atob(s);
    } catch {
      return '';
    }
  },
  
  // 字符串反转（混淆名称）
  _reverse_str: (s: string) => {
    return s.split('').reverse().join('');
  },
  
  // ROT13 解码（混淆名称）
  _rot13_decode: (s: string) => {
    return s.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
    });
  },
  
  // JSON 解析（混淆名称）
  _parse_json: (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
};

// 动态检查函数
export const dynamicCheck = () => {
  const checks = [
    () => typeof window !== 'undefined',
    () => typeof document !== 'undefined',
    () => typeof console !== 'undefined',
    () => _key_fragments.a.length > 0,
    () => _key_fragments.b.length > 0
  ];
  
  return checks.every(check => {
    try {
      return check();
    } catch {
      return false;
    }
  });
};

// 反调试增强
export const antiDebugEnhanced = {
  isMonitoring: false,
  
  // 启动监控
  startMonitoring: () => {
    if (antiDebugEnhanced.isMonitoring) return;
    antiDebugEnhanced.isMonitoring = true;
    
    // 定期检测
    setInterval(() => {
      if (antiDebugEnhanced.detectDebugger()) {
        console.warn('🚨 检测到调试器');
      }
      if (antiDebugEnhanced.detectConsole()) {
        console.warn('🚨 检测到开发者工具');
      }
    }, 5000);
  },
  
  // 检测调试器
  detectDebugger: () => {
    let start = performance.now();
    debugger;
    let end = performance.now();
    return (end - start) > 100;
  },
  
  // 检测控制台
  detectConsole: () => {
    const threshold = 160;
    return (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold);
  },
  
  // 混淆控制台输出
  obfuscateConsole: () => {
    const original = console.log;
    console.log = (...args) => {
      const obfuscated = args.map(arg => 
        typeof arg === 'string' ? arg.replace(/./g, '*') : '***'
      );
      original.apply(console, ['🔒', ...obfuscated]);
    };
  }
};

// 代码完整性检查
export const integrityCheck = {
  // 检查函数是否被篡改
  checkFunction: (fn: Function, expectedLength: number) => {
    return fn.toString().length >= expectedLength;
  },
  
  // 检查对象属性
  checkObject: (obj: any, expectedKeys: string[]) => {
    return expectedKeys.every(key => key in obj);
  },
  
  // 生成校验和
  generateChecksum: (data: string) => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash;
  }
};

// 动态代码生成
export const dynamicCodeGen = {
  // 生成随机函数名
  generateRandomName: () => {
    return '_' + Math.random().toString(36).substr(2, 9);
  },
  
  // 创建动态函数
  createDynamicFunction: (code: string) => {
    try {
      return new Function('return ' + code)();
    } catch {
      return null;
    }
  },
  
  // 混淆字符串
  obfuscateString: (str: string) => {
    return str.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) + 1)
    ).join('');
  },
  
  // 反混淆字符串
  deobfuscateString: (str: string) => {
    return str.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) - 1)
    ).join('');
  }
};

// 环境检测
export const environmentCheck = {
  // 检测是否在开发环境
  isDevelopment: () => {
    return process.env.NODE_ENV === 'development';
  },
  
  // 检测是否在浏览器环境
  isBrowser: () => {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  },
  
  // 检测用户代理
  checkUserAgent: () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const suspicious = ['headless', 'phantom', 'selenium', 'webdriver'];
    return !suspicious.some(keyword => ua.includes(keyword));
  }
};