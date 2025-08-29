'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Search, Server, Clock, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { DNSController } from '@/controllers/DNSController';
import { useDNS, DNS_RECORD_TYPES, DEFAULT_DNS_TYPES } from '@/hooks/useDNS';
import { cn } from '@/lib/utils';
import { DNSRecord } from '@/types';
import { logger } from '@/lib/logger';

export default function DNSPage() {
  const t = useTranslations('dns');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([...DEFAULT_DNS_TYPES]);
  const {
    data,
    loading,
    error,
    queryHistory,
    formattedData,
    queryDNS,
    queryDNSDebounced,
    clearResults,
    hasData,
    hasError
  } = useDNS();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    await queryDNS(searchTerm, selectedTypes);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        // 至少保留一个类型
        return prev.length > 1 ? prev.filter(t => t !== type) : prev;
      } else {
        return [...prev, type];
      }
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getRecordTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'A': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'AAAA': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'MX': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'TXT': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'NS': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'CNAME': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      'SOA': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const groupedRecords = data?.reduce((acc, record) => {
    if (!acc[record.type]) {
      acc[record.type] = [];
    }
    acc[record.type].push(record);
    return acc;
  }, {} as Record<string, DNSRecord[]>) || {};

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
        <CardContent className="space-y-6">
          {/* Domain Input */}
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
              disabled={loading || !searchTerm.trim() || selectedTypes.length === 0}
              className="min-w-[100px]"
            >
              {loading ? t('search.searching') : t('search.button')}
            </Button>
          </div>

          {/* Record Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('types.title')}</label>
            <div className="flex flex-wrap gap-3">
              {DNS_RECORD_TYPES.map((typeInfo) => (
                <div key={typeInfo.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={typeInfo.value}
                    checked={selectedTypes.includes(typeInfo.value)}
                    onCheckedChange={() => handleTypeToggle(typeInfo.value)}
                  />
                  <label
                    htmlFor={typeInfo.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    title={typeInfo.description}
                  >
                    {typeInfo.value}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{t('error.title')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {data && data.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t('results.summary.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.length}</div>
                  <div className="text-sm text-muted-foreground">{t('results.summary.totalRecords')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Object.keys(groupedRecords).length}</div>
                  <div className="text-sm text-muted-foreground">{t('results.summary.recordTypes')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    <CheckCircle className="h-6 w-6 mx-auto" />
                  </div>
                  <div className="text-sm text-muted-foreground">{t('results.summary.status')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    <Clock className="h-6 w-6 mx-auto" />
                  </div>
                  <div className="text-sm text-muted-foreground">{t('results.summary.responseTime')}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DNS Records by Type */}
          {Object.entries(groupedRecords).map(([type, records]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={getRecordTypeColor(type)}>
                    {type}
                  </Badge>
                  {t(`types.${type}`, { defaultValue: `${type} Records` })}
                  <span className="text-sm text-muted-foreground">({records.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {records.map((record, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('results.records.name')}
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-muted px-2 py-1 rounded">
                              {record.name}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(record.name)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('results.records.value')}
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-muted px-2 py-1 rounded break-all">
                              {record.value}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(record.value)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {t('results.records.ttl')}
                          </label>
                          <div className="text-sm">
                            {record.ttl ? `${record.ttl}s` : 'N/A'}
                            {record.priority && (
                              <span className="ml-2 text-muted-foreground">
                                (Priority: {record.priority})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && !error && (!data || data.length === 0) && searchTerm && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('results.noData')}</h3>
            <p className="text-muted-foreground">
              {t('results.noDataDescription')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}