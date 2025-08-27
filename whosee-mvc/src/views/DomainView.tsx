'use client';

import React from 'react';
import { DomainSearch } from '@/components/features/DomainSearch';
import { DomainInfo } from '@/components/features/DomainInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDomain } from '@/hooks/useDomain';
import { Globe, Search, History, TrendingUp } from 'lucide-react';

/**
 * 域名查询视图 - MVC架构中的View层
 */
export function DomainView() {
  const { hasData, hasHistory, getCacheStats } = useDomain();
  const cacheStats = getCacheStats();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Globe className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Domain WHOIS Lookup</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get comprehensive domain information including registration details, 
          contact information, and name servers.
        </p>
      </div>

      {/* 搜索区域 */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search Domain</span>
            </CardTitle>
            <CardDescription>
              Enter a domain name to retrieve WHOIS information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DomainSearch 
              placeholder="Enter domain name (e.g., example.com)"
              showHistory={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* 统计信息 */}
      {(hasHistory || cacheStats.totalQueries > 0) && (
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center space-x-4 p-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{cacheStats.totalQueries}</div>
                  <div className="text-sm text-muted-foreground">Total Queries</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center space-x-4 p-6">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{cacheStats.cacheHits}</div>
                  <div className="text-sm text-muted-foreground">Cache Hits</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center space-x-4 p-6">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <History className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{cacheStats.cacheSize}</div>
                  <div className="text-sm text-muted-foreground">Cached Domains</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 域名信息显示区域 */}
      <div className="max-w-6xl mx-auto">
        <DomainInfo showRawData={false} />
      </div>

      {/* 功能说明 */}
      {!hasData && (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>What is WHOIS?</CardTitle>
              <CardDescription>
                Learn about domain registration information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                WHOIS is a query and response protocol that provides information about 
                domain name registrations. It includes details such as:
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold">Registration Details</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Domain creation date</li>
                    <li>• Expiration date</li>
                    <li>• Last update date</li>
                    <li>• Registrar information</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Technical Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Name servers</li>
                    <li>• DNS configuration</li>
                    <li>• Domain status</li>
                    <li>• Contact information</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Privacy Notice</h4>
                <p className="text-sm text-muted-foreground">
                  Some domain registrations may use privacy protection services, 
                  which replace personal contact information with generic contact details 
                  to protect the domain owner's privacy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * 简化版域名视图 - 用于嵌入其他页面
 */
export function DomainViewCompact() {
  return (
    <div className="space-y-6">
      {/* 搜索区域 */}
      <Card>
        <CardContent className="p-6">
          <DomainSearch 
            placeholder="Search domain..."
            showHistory={false}
          />
        </CardContent>
      </Card>

      {/* 结果显示 */}
      <DomainInfo />
    </div>
  );
}

/**
 * 域名视图页面组件 - 用于Next.js页面
 */
export default function DomainPage() {
  return (
    <div className="min-h-screen bg-background">
      <DomainView />
    </div>
  );
}