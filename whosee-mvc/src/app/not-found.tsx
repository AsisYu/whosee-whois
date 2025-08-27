import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-muted-foreground mb-4">
            404
          </CardTitle>
          <CardTitle className="text-2xl mb-2">
            页面未找到
          </CardTitle>
          <CardDescription className="text-lg">
            抱歉，您访问的页面不存在或已被移动。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="default">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                返回首页
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/domain" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                域名查询
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            如果您认为这是一个错误，请联系我们的技术支持。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}