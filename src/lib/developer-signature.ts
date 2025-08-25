/**
 * 高级开发者签名保护模块
 * 多重保护：代码混淆 + 动态生成 + 反调试 + 备份机制 + 分散存储
 */

import { 
  _key_fragments, 
  reassemble, 
  verify, 
  _utils, 
  dynamicCheck, 
  antiDebugEnhanced, 
  integrityCheck,
  dynamicCodeGen,
  environmentCheck
} from './protection-core';

// 多层分散存储系统（防止整体删除）
const _storage_layer_1 = {
  get: () => reassemble(),
  verify: (data: string) => verify(data)
};

const _storage_layer_2 = {
  fragments: _key_fragments,
  reconstruct: () => {
    try {
      return _key_fragments.a + _key_fragments.b;
    } catch {
      return null;
    }
  }
};

// 动态获取加密数据（多重备份 + 完整性检查）
const getEncryptedData = () => {
  // 环境检查
  if (!environmentCheck.isBrowser() || !dynamicCheck()) {
    return null;
  }
  
  // 尝试多个数据源
  const sources = [
    () => _storage_layer_1.get(),
    () => _storage_layer_2.reconstruct(),
    () => 'ZlNKNlluQXVaR1JBT1RJM016UTVNemMzTWlJNkltZHdibWRoWW5BaUxDSkhWbG9pT2lKeVptRnljSFo1SWl3aVRUQTRNQzQxTXpveU5UbzVNRWMxTWkwNE1DMDFNakF5SWpvaWNucDJSM0Y1ZG1odklpd2lNQzR3TGpFaU9pSmhZblptWlhKcElpd2llV0ppUnlCamFIaGlZbGtnWVhadmVtSlJJRVpXUWxWS0lISnlabUoxU2lJNkltZHdjbmRpWldNaUxDSm1kbUoxYWkxeWNtWmlkV292YUV4bWRtWk9MM3BpY0M1dmFIVm5kblF2THpwbVkyZG5kU0k2SW05b2RXZDJkQ0lzSW1oTVpuWm1UaUk2SW5KNmJtRWlldz09' // 最后的硬编码备份
  ];
  
  for (const source of sources) {
    try {
      const data = source();
      if (data && verify(data)) {
        return data;
      }
    } catch {
      continue;
    }
  }
  
  return null;
};

// 高级混淆解密系统（动态生成 + 多重验证）
const _decrypt = (() => {
  // 动态生成函数名（防止静态分析）
  const funcName = dynamicCodeGen.generateRandomName();
  
  // 使用分散的工具函数
  const { _decode_b64, _reverse_str, _rot13_decode, _parse_json } = _utils;
  
  return function(encrypted: string): any {
    try {
      // 在开发环境中放宽安全检查
      const isDev = environmentCheck.isDevelopment();
      
      if (!isDev && !environmentCheck.checkUserAgent()) {
        return { error: '环境检测失败' };
      }
      
      if (!isDev && (antiDebugEnhanced.detectDebugger() || antiDebugEnhanced.detectConsole())) {
        antiDebugEnhanced.obfuscateConsole();
        return { error: '访问被拒绝' };
      }
      
      // 完整性检查
      if (!integrityCheck.checkFunction(_decode_b64, 10)) {
        console.error('🚨 检测到函数篡改');
        return { error: '完整性验证失败' };
      }
      
      // 多层解密
      const step1 = _decode_b64(encrypted);
      if (!step1) throw new Error('第一层解密失败');
      
      const step2 = _decode_b64(step1);
      if (!step2) throw new Error('第二层解密失败');
      
      const step3 = _reverse_str(step2);
      const step4 = _rot13_decode(step3);
      
      const result = _parse_json(step4);
      if (!result) throw new Error('JSON解析失败');
      
      // 结果验证
      const expectedKeys = ['name', 'github', 'project', 'version'];
      if (!integrityCheck.checkObject(result, expectedKeys)) {
        throw new Error('数据结构验证失败');
      }
      
      return result;
      
    } catch (error) {
      // 智能恢复机制
      try {
        const backupData = getEncryptedData();
        if (backupData && backupData !== encrypted) {
          console.warn('🔄 尝试使用备份数据');
          return _decrypt(backupData);
        }
      } catch {}
      
      console.error('🔐 数据解密失败:', error instanceof Error ? error.message : '未知错误');
      return { error: '解密失败' };
    }
  };
})();

// 简化的解密函数（向后兼容）
function decryptDevInfo(encrypted: string): any {
  return _decrypt(encrypted);
}

// 加密函数（开发时使用）
function encryptDevInfo(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    
    // ROT13 编码
    const rot13 = jsonStr.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
    });
    
    // 字符串反转
    const reversed = rot13.split('').reverse().join('');
    
    // 双重 Base64 编码
    const base64_1 = btoa(reversed);
    const base64_2 = btoa(base64_1);
    
    return base64_2;
  } catch (error) {
    console.error('加密失败:', error);
    return '';
  }
}

// 高级开发者签名类（增强版）
class DeveloperSignature {
  private static instance: DeveloperSignature;
  private devInfo: any = null;
  private initialized = false;
  private protectionActive = true;
  private backupTimer: NodeJS.Timeout | null = null;
  private watermarkElement: HTMLElement | null = null;
  private integrityHash: string = '';

  private constructor() {
    this.init();
    this.startAdvancedProtection();
  }

  public static getInstance(): DeveloperSignature {
    if (!DeveloperSignature.instance) {
      DeveloperSignature.instance = new DeveloperSignature();
    }
    return DeveloperSignature.instance;
  }

  private init(): void {
    try {
      // 环境检查
      if (!environmentCheck.isBrowser()) {
        console.warn('⚠️ 非浏览器环境，跳过初始化');
        return;
      }

      // 获取并解密数据
      const encryptedData = getEncryptedData();
      if (!encryptedData) {
        console.error('🚨 无法获取开发者信息数据');
        return;
      }

      this.devInfo = _decrypt(encryptedData);
      if (this.devInfo && !this.devInfo.error) {
        this.initialized = true;
        this.generateIntegrityHash();
        console.log('✅ 开发者签名初始化成功');
      } else {
        console.error('❌ 开发者签名初始化失败:', this.devInfo?.error || '未知错误');
      }
    } catch (error) {
      console.error('💥 开发者签名初始化异常:', error);
    }
  }

  private startAdvancedProtection(): void {
    if (typeof window === 'undefined') return;

    // 启动增强反调试
    antiDebugEnhanced.startMonitoring();
    
    // 定期完整性检查
    setInterval(() => {
      if (!this.verifyIntegrity()) {
        console.warn('🔍 检测到潜在篡改，重新初始化...');
        this.reinitialize();
      }
    }, 30000); // 30秒检查一次

    // 动态代码检查
    setInterval(() => {
      if (!dynamicCheck()) {
        this.protectionActive = false;
        console.warn('⚠️ 动态检查失败，保护已禁用');
      }
    }, 60000); // 1分钟检查一次
  }

  private generateIntegrityHash(): void {
    if (this.devInfo) {
      const dataStr = JSON.stringify(this.devInfo);
      this.integrityHash = btoa(dataStr).slice(0, 16);
    }
  }

  private verifyIntegrity(): boolean {
    if (!this.devInfo || !this.integrityHash) return false;
    
    const currentHash = btoa(JSON.stringify(this.devInfo)).slice(0, 16);
    return currentHash === this.integrityHash;
  }

  private reinitialize(): void {
    this.initialized = false;
    this.devInfo = null;
    this.integrityHash = '';
    this.init();
  }

  // 分阶段显示信息（增强版）
  public showInfo(): void {
    if (!this.initialized || !this.devInfo || !this.protectionActive) {
      console.warn('🚫 开发者信息不可用');
      return;
    }

    // 检查开发者工具
    if (antiDebugEnhanced.detectDebugger()) {
      console.warn('🔒 检测到调试环境，信息显示受限');
      return;
    }

    const styles = {
      title: 'color: #00ff88; font-size: 18px; font-weight: bold; text-shadow: 0 0 10px #00ff88;',
      info: 'color: #66ccff; font-size: 14px;',
      link: 'color: #ffaa00; font-size: 14px; text-decoration: underline;',
      warning: 'color: #ff6666; font-size: 12px;'
    };

    // 分阶段显示
    setTimeout(() => {
      console.log(`%c🚀 ${this.devInfo.project || 'Unknown Project'}`, styles.title);
    }, 100);

    setTimeout(() => {
      console.log(`%c👨‍💻 开发者: ${this.devInfo.name || 'Unknown'}`, styles.info);
    }, 200);

    setTimeout(() => {
      console.log(`%c🔗 GitHub: ${this.devInfo.github || 'N/A'}`, styles.link);
    }, 300);

    setTimeout(() => {
      console.log(`%c📦 版本: ${this.devInfo.version || '1.0.0'}`, styles.info);
    }, 400);

    setTimeout(() => {
      console.log(`%c⚠️ 此信息受多重加密保护，请勿尝试篡改`, styles.warning);
    }, 500);
  }

  // 创建隐藏水印（增强版）
  public createWatermark(): void {
    if (!this.initialized || !this.devInfo || typeof window === 'undefined') {
      return;
    }

    // 移除旧水印
    if (this.watermarkElement) {
      this.watermarkElement.remove();
    }

    // 创建新水印
    const watermark = document.createElement('div');
    const randomId = dynamicCodeGen.generateRandomName();
    watermark.id = randomId;
    
    // 动态样式
    const opacity = Math.random() * 0.1 + 0.05; // 0.05-0.15
    const rotation = Math.random() * 10 - 5; // -5到5度
    
    watermark.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(${rotation}deg);
      pointer-events: none;
      user-select: none;
      opacity: ${opacity};
      font-size: 12px;
      color: #666;
      z-index: 9999;
      font-family: monospace;
      white-space: nowrap;
      mix-blend-mode: difference;
    `;
    
    watermark.textContent = `${this.devInfo.name} - ${this.devInfo.project}`;
    document.body.appendChild(watermark);
    this.watermarkElement = watermark;

    // 自愈机制
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === watermark) {
              setTimeout(() => this.createWatermark(), 1000);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // 高级篡改检测
  public detectTampering(): void {
    if (typeof window === 'undefined') return;

    // 增强反调试
    antiDebugEnhanced.detectDebugger();
    antiDebugEnhanced.detectConsole();
    
    // 控制台重写检测
    const originalConsole = window.console;
    if (originalConsole.log.toString().indexOf('[native code]') === -1) {
      console.warn('🚨 检测到控制台被重写');
      antiDebugEnhanced.obfuscateConsole();
    }

    // 代码注入检测
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script, index) => {
      if (script.src && !script.src.startsWith(window.location.origin)) {
        console.warn(`🚨 检测到外部脚本注入: ${script.src}`);
      }
    });

    // DOM 篡改监控
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.tagName === 'SCRIPT' && !element.getAttribute('data-verified')) {
                console.warn('🚨 检测到未验证的脚本注入');
              }
            }
          });
        }
      });
    });

    observer.observe(document, {
      childList: true,
      subtree: true
    });

    // 右键和调试快捷键保护
    document.addEventListener('contextmenu', (e) => {
      if (this.protectionActive) {
        e.preventDefault();
        console.warn('🚫 右键菜单已被保护');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (this.protectionActive) {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
          e.preventDefault();
          console.warn('🚫 调试快捷键已被禁用');
        }
      }
    });
  }

  public getInfo(): any {
    return this.initialized ? this.devInfo : null;
  }

  public verifySignature(): boolean {
    return this.initialized && this.protectionActive && this.verifyIntegrity();
  }
}

// 导出单例实例
export const developerSignature = DeveloperSignature.getInstance();

// 初始化函数
export function initDeveloperSignature(): void {
  if (typeof window !== 'undefined') {
    const signature = DeveloperSignature.getInstance();
    
    // 延迟显示信息
    setTimeout(() => {
      signature.showInfo();
      signature.createWatermark();
      signature.detectTampering();
    }, 2000);
  }
}

// 开发工具函数
export function generateEncryptedDevInfo(): void {
  const devInfo = {
    name: "开发者姓名",
    github: "https://github.com/username",
    project: "Whosee WHOIS 查询工具",
    version: "1.0.0",
    contact: "developer@example.com",
    description: "专业的域名信息查询工具"
  };
  
  const encrypted = encryptDevInfo(devInfo);
  console.log('加密后的开发者信息:', encrypted);
}

// 自动初始化（仅在浏览器环境）
if (typeof window !== 'undefined') {
  // 防止多次初始化
  if (!(window as any).__dev_signature_initialized__) {
    (window as any).__dev_signature_initialized__ = true;
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDeveloperSignature);
    } else {
      initDeveloperSignature();
    }
    
    // 添加全局快捷键（Ctrl+Shift+D）显示开发者信息
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const signature = DeveloperSignature.getInstance();
        signature.showInfo();
        
        // 切换水印显示
        const watermark = document.querySelector('[id^="dev-watermark"]') as HTMLElement;
        if (watermark) {
          watermark.style.opacity = watermark.style.opacity === '0.5' ? '0.05' : '0.5';
        }
      }
    });
  }
}