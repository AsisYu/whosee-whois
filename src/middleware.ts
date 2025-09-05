import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 处理错误的双语言路径，如 /en/zh/blog -> /en/blog
  if (pathname.match(/^\/en\/zh\//)) {
    const correctedPath = pathname.replace(/^\/en\/zh\//, '/en/');
    return NextResponse.redirect(new URL(correctedPath, request.url));
  }
  
  // 处理错误的双语言路径，如 /zh/en/blog -> /zh/blog
  if (pathname.match(/^\/zh\/en\//)) {
    const correctedPath = pathname.replace(/^\/zh\/en\//, '/zh/');
    return NextResponse.redirect(new URL(correctedPath, request.url));
  }
  
  // 检测语言：如果路径以 /en 开头则为英文，否则为中文
  const isEnglishPath = pathname.startsWith('/en');
  const locale = isEnglishPath ? 'en' : 'zh';
  
  // 设置自定义头部，供 i18n 使用
  const response = NextResponse.next();
  response.headers.set('x-locale', locale);
  response.headers.set('x-pathname', pathname);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|robots.txt|sitemap.xml).*)'
  ]
};