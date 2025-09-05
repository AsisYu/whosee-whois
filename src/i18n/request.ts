import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { defaultLocale } from './config';

export default getRequestConfig(async () => {
  // 从中间件头部获取语言信息
  const headersList = await headers();
  const locale = headersList.get('x-locale') || defaultLocale;
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 