'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Copy, Search, Globe, Calendar, User, Server, Shield, ExternalLink } from 'lucide-react';
import { DomainController } from '@/controllers/DomainController';
import { useDomain } from '@/hooks/useDomain';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

export default function DomainPage() {
  const t = useTranslations('domain');
  const [searchTerm, setSearchTerm] = useState('');
  const controller = new DomainController();
  const {
    data,
    loading,
    error,
    searchHistory,
    searchDomain
  } = useDomain(controller);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    await searchDomain(searchTerm.trim());
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t('description')}
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('search.title')}
          </CardTitle>
          <CardDescription>
            {t('search.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={loading || !searchTerm.trim()}
              className="min-w-[100px]"
            >
              {loading ? t('search.searching') : t('search.button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              <span className="font-medium">{t('error.title')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {data && (
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('results.basic.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('results.basic.domain')}</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm">
                      {data.domain}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(data!.domain)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {data.registrar && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('results.basic.registrar')}</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm">
                        {data.registrar}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(data!.registrar!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              {data.status && data.status.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('results.basic.status')}</label>
                  <div className="flex flex-wrap gap-2">
                    {data.status.map((status, index) => (
                      <Badge key={index} variant="secondary">
                        {status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('results.dates.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.creationDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('results.dates.created')}</label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatDate(data.creationDate)}
                    </div>
                  </div>
                )}
                
                {data.expirationDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('results.dates.expires')}</label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatDate(data.expirationDate)}
                    </div>
                  </div>
                )}
                
                {data.updatedDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('results.dates.updated')}</label>
                    <div className="p-2 bg-muted rounded text-sm">
                      {formatDate(data.updatedDate)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          {data.contacts && data.contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('results.contacts.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.contacts.map((contact, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">{contact.type}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {contact.name && (
                          <div>
                            <span className="font-medium">{t('results.contacts.name')}: </span>
                            {contact.name}
                          </div>
                        )}
                        {contact.organization && (
                          <div>
                            <span className="font-medium">{t('results.contacts.organization')}: </span>
                            {contact.organization}
                          </div>
                        )}
                        {contact.email && (
                          <div>
                            <span className="font-medium">{t('results.contacts.email')}: </span>
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div>
                            <span className="font-medium">{t('results.contacts.phone')}: </span>
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Name Servers */}
          {data.nameServers && data.nameServers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  {t('results.nameservers.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.nameServers.map((ns, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm">
                        {ns}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(ns)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Tools */}
          <Card>
            <CardHeader>
              <CardTitle>{t('results.tools.title')}</CardTitle>
              <CardDescription>
                {t('results.tools.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`/dns?domain=${data.domain}`}>
                    <Globe className="h-4 w-4 mr-2" />
                    {t('results.tools.dns')}
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`/screenshot?domain=${data.domain}`}>
                    <Globe className="h-4 w-4 mr-2" />
                    {t('results.tools.screenshot')}
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
                
                <Button variant="outline" className="justify-start" asChild>
                  <a href={`/health?domain=${data.domain}`}>
                    <Shield className="h-4 w-4 mr-2" />
                    {t('results.tools.health')}
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t('history.title')}</CardTitle>
            <CardDescription>
              {t('history.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 10).map((domain, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm(domain);
                    searchDomain(domain);
                  }}
                >
                  {domain}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}