import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
  // Important: always return the modified config
  return mergeConfig(config, {
    server: {
      // 允许特定的主机，包括您的域名
      allowedHosts: [
        'localhost', 
        '127.0.0.1', 
        // 从环境变量中读取前端 URL 的主机名
        process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).hostname : 'localhost'
      ],
      
      // 如果需要允许所有主机（不太安全但可能在开发环境需要）
      // host: true
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  });
};
