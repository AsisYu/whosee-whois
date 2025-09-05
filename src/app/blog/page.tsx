import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentLocale } from '@/lib/locale-utils';

export default async function BlogRedirect() {
  // 获取当前路径和语言设置
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';
  const locale = getCurrentLocale(pathname);
  
  // 重定向到对应语言的博客页面
  // 避免循环重定向：如果已经在正确的路径上，则不重定向
  if (pathname === '/blog' && locale === 'zh') {
    redirect('/zh/blog');
  } else if (pathname === '/blog' && locale === 'en') {
    redirect('/en/blog');
  } else {
    // 如果路径已经包含语言前缀，重定向到对应的博客页面
    const targetPath = locale === 'en' ? '/en/blog' : '/zh/blog';
    redirect(targetPath);
  }
}