export default () => ({
  // 启用国际化插件
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      locales: ['en', 'zh'],
    },
  },

  // 启用图片上传插件
  upload: {
    enabled: true,
    config: {
      provider: 'local', // 可以后续改为 cloudinary
      sizeLimit: 256 * 1024 * 1024, // 256mb
    },
  },
});
