import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 重定向到默认语言（中文）的RSS feed
  return NextResponse.redirect(new URL('/zh/blog/rss.xml', request.url), 301);
}