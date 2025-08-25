import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export function sanitizeDomain(domain: string): string {
  // Remove protocol and paths
  let sanitized = domain.replace(/^https?:\/\//, '').split('/')[0];
  // Remove www. prefix
  sanitized = sanitized.replace(/^www\./, '');
  return sanitized.toLowerCase();
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    return new Promise((resolve) => {
      const success = document.execCommand('copy');
      textArea.remove();
      resolve(success);
    });
  }
}

// 开发者信息配置
interface DeveloperInfo {
  name: string;
  github: string;
  project: string;
  version: string;
  buildTime: string;
}

const DEVELOPER_INFO: DeveloperInfo = {
  name: 'AsisYu',
  github: 'https://github.com/AsisYu/whosee-whois',
  project: 'Whosee WHOIS Domain Lookup Tool',
  version: '1.0.0',
  buildTime: new Date().toISOString()
};

// 在控制台显示开发者信息
export function showDeveloperInfo(): void {
  if (typeof window === 'undefined') return;
  
  const styles = {
    title: 'color: #3b82f6; font-size: 16px; font-weight: bold;',
    info: 'color: #6b7280; font-size: 14px;',
    link: 'color: #10b981; font-size: 14px; text-decoration: underline;'
  };
  
  console.log('%c🚀 ' + DEVELOPER_INFO.project, styles.title);
  console.log('%c👨‍💻 Developer: ' + DEVELOPER_INFO.name, styles.info);
  console.log('%c📦 Version: ' + DEVELOPER_INFO.version, styles.info);
  console.log('%c🔗 GitHub: ' + DEVELOPER_INFO.github, styles.link);
  console.log('%c⏰ Build Time: ' + DEVELOPER_INFO.buildTime, styles.info);
  console.log('%c💡 如果您喜欢这个项目，请给我们一个 ⭐ Star!', 'color: #f59e0b; font-size: 14px;');
}

// 在页面中显示开发者信息（隐藏的水印）
export function addDeveloperWatermark(): void {
  if (typeof window === 'undefined') return;
  
  // 创建隐藏的开发者信息元素
  const watermark = document.createElement('div');
  watermark.id = 'developer-watermark';
  watermark.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    font-size: 10px;
    color: rgba(107, 114, 128, 0.3);
    pointer-events: none;
    z-index: 9999;
    font-family: monospace;
    display: none;
  `;
  watermark.textContent = `© ${DEVELOPER_INFO.name} | ${DEVELOPER_INFO.github}`;
  
  document.body.appendChild(watermark);
  
  // 开发模式下显示水印
  if (process.env.NODE_ENV === 'development') {
    watermark.style.display = 'block';
  }
  
  // 添加键盘快捷键显示开发者信息 (Ctrl+Shift+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      showDeveloperInfo();
      watermark.style.display = watermark.style.display === 'none' ? 'block' : 'none';
    }
  });
}

// 获取开发者信息
export function getDeveloperInfo(): DeveloperInfo {
  return { ...DEVELOPER_INFO };
}

// Base64 编码的开发者信息（简单的混淆）
export function getEncodedDeveloperInfo(): string {
  const info = JSON.stringify(DEVELOPER_INFO);
  return btoa(encodeURIComponent(info));
}

// 解码开发者信息
export function decodeEncodedDeveloperInfo(encoded: string): DeveloperInfo | null {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}