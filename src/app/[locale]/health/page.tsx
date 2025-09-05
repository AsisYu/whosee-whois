'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { log } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { useHealth, HEALTH_CHECK_OPTIONS, SERVICE_STATUS_TYPES } from '@/hooks/useHealth';
import { cn } from '@/lib/utils';

export default function HealthPage() {
  const t = useTranslations('health');
  const locale = useLocale();
  useEffect(() => {
    try { log.info('[i18n] HealthPage render', 'i18n', { locale, title: t('title') }); } catch {}
  }, [locale]);
  const [refreshInterval, setRefreshInterval] = useState(HEALTH_CHECK_OPTIONS.defaultInterval);
  
  const {
    data,
    loading,
    error,
    lastUpdated,
    autoRefresh,
    checkHealth,
    toggleAutoRefresh,
    clearResults,
    serviceSummary,
    systemStatus,
    criticalServices,
    healthScore,
    hasCriticalIssues,
    formatResponseTime,
    getPerformanceGrade,
    getStatusColor,
    getStatusIcon,
    getStatusDescription,
    exportHealthReport,
    hasData,
    hasError
  } = useHealth();

  // 初始加载
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const handleRefresh = async () => {
    await checkHealth();
  };

  const handleToggleAutoRefresh = () => {
    toggleAutoRefresh(refreshInterval);
  };

  const handleExportReport = () => {
    const report = exportHealthReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSystemStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Minus className="h-6 w-6 text-gray-500" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('description')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {loading ? t('actions.refreshing') : t('actions.refresh')}
          </Button>
          
          <Button
            onClick={handleToggleAutoRefresh}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            {autoRefresh ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {autoRefresh ? t('actions.stopAuto') : t('actions.startAuto')}
          </Button>
          
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
            disabled={!hasData}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('actions.export')}
          </Button>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {t('lastUpdated')}: {lastUpdated.toLocaleString()}
        </div>
      )}

      {/* Error Display */}
      {hasError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{t('error.title')}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* System Overview */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* System Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('overview.systemStatus')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {getSystemStatusIcon()}
                <div>
                  <div className={cn("text-lg font-semibold", getStatusColor(systemStatus))}>
                    {getStatusDescription(systemStatus)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {systemStatus}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Score */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('overview.healthScore')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-blue-500" />
                <div>
                  <div className={cn("text-2xl font-bold", getHealthScoreColor(healthScore))}>
                    {healthScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('overview.score')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('overview.responseTime')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {data?.responseTime ? formatResponseTime(data.responseTime) : 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {data?.responseTime && (
                      <span className={getPerformanceGrade(data.responseTime).color}>
                        {getPerformanceGrade(data.responseTime).description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('overview.services')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Server className="h-6 w-6 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {serviceSummary.healthy}/{serviceSummary.total}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {serviceSummary.healthyPercentage}% {t('overview.healthy')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Issues */}
      {hasCriticalIssues && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('critical.title')}
            </CardTitle>
            <CardDescription>{t('critical.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-muted-foreground">{service.message}</div>
                    </div>
                  </div>
                  <Badge variant="destructive">{service.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Status */}
      {hasData && data?.services && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              {t('services.title')}
            </CardTitle>
            <CardDescription>{t('services.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.services).map(([serviceName, serviceData]) => (
                <div key={serviceName} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">{serviceName}</div>
                    <Badge 
                      variant={serviceData.status === 'healthy' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {getStatusIcon(serviceData.status)} {serviceData.status}
                    </Badge>
                  </div>
                  
                  {serviceData.message && (
                    <div className="text-sm text-muted-foreground mb-2">
                      {serviceData.message}
                    </div>
                  )}
                  
                  {serviceData.responseTime && (
                    <div className="text-xs text-muted-foreground">
                      {t('services.responseTime')}: {formatResponseTime(serviceData.responseTime)}
                    </div>
                  )}
                  
                  {serviceData.lastCheck && (
                    <div className="text-xs text-muted-foreground">
                      {t('services.lastCheck')}: {new Date(serviceData.lastCheck).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      {hasData && data?.metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('metrics.title')}
            </CardTitle>
            <CardDescription>{t('metrics.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div key={key} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!loading && !hasError && !hasData && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noData.title')}</h3>
            <p className="text-muted-foreground mb-4">{t('noData.description')}</p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('actions.refresh')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}