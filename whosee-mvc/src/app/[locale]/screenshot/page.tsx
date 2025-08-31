'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { log } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Camera, 
  Download, 
  RefreshCw, 
  Monitor, 
  Smartphone, 
  Tablet, 
  Globe, 
  Clock, 
  FileImage, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Search,
  History,
  Settings,
  Trash2,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useScreenshot, DEVICE_PRESETS, SCREENSHOT_OPTIONS } from '@/hooks/useScreenshot';
import { cn } from '@/lib/utils';

export default function ScreenshotPage() {
  const t = useTranslations('screenshot');
  const locale = useLocale();
  useEffect(() => {
    try { log.info('[i18n] ScreenshotPage render', 'i18n', { locale, title: t('title') }); } catch {}
  }, [locale]);
  const [domain, setDomain] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(DEVICE_PRESETS[0]);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const [quality, setQuality] = useState(80);
  
  const {
    data,
    loading,
    error,
    captureHistory,
    captureScreenshot,
    captureScreenshotDebounced,
    clearResults,
    downloadScreenshot,
    copyImageToClipboard,
    getImageSize,
    formatFileSize,
    validateDomain,
    hasData,
    hasError
  } = useScreenshot();

  const handleCapture = async () => {
    if (!domain.trim()) return;
    
    const options = {
      width: useCustomSize ? customWidth : selectedDevice.width,
      height: useCustomSize ? customHeight : selectedDevice.height,
      fullPage,
      quality,
      device: selectedDevice.name
    };
    
    await captureScreenshot(domain.trim(), options);
  };

  const handleDownload = () => {
    if (data?.imageData) {
      downloadScreenshot(data.imageData, domain);
    }
  };

  const handleCopyImage = async () => {
    if (data?.imageData) {
      await copyImageToClipboard(data.imageData);
    }
  };

  const handleDeviceChange = (device: typeof DEVICE_PRESETS[0]) => {
    setSelectedDevice(device);
    setUseCustomSize(false);
  };

  const handleCustomSizeToggle = () => {
    setUseCustomSize(!useCustomSize);
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const isValidDomain = domain.trim() ? validateDomain(domain.trim()) : true;

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
            onClick={clearResults}
            variant="outline"
            size="sm"
            disabled={!hasData && !hasError}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('actions.clear')}
          </Button>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('search.title')}
          </CardTitle>
          <CardDescription>{t('search.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Domain Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('search.domain')}</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder={t('search.placeholder')}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className={cn(!isValidDomain && "border-destructive")}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidDomain) {
                      handleCapture();
                    }
                  }}
                />
                {!isValidDomain && (
                  <p className="text-sm text-destructive mt-1">{t('search.invalidDomain')}</p>
                )}
              </div>
              <Button
                onClick={handleCapture}
                disabled={loading || !domain.trim() || !isValidDomain}
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {loading ? t('search.capturing') : t('search.capture')}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Device Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">{t('options.device')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {DEVICE_PRESETS.map((device) => (
                <Button
                  key={device.name}
                  variant={selectedDevice.name === device.name && !useCustomSize ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDeviceChange(device)}
                  className="justify-start"
                >
                  {getDeviceIcon(device.type)}
                  <span className="ml-2 truncate">{device.name}</span>
                </Button>
              ))}
            </div>
            
            {/* Custom Size */}
            <div className="space-y-3">
              <Button
                variant={useCustomSize ? "default" : "outline"}
                size="sm"
                onClick={handleCustomSizeToggle}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('options.customSize')}
              </Button>
              
              {useCustomSize && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                  <div>
                    <label className="text-sm font-medium">{t('options.width')}</label>
                    <Input
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      min={320}
                      max={3840}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('options.height')}</label>
                    <Input
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      min={240}
                      max={2160}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('options.quality')}</label>
              <Input
                type="range"
                min={10}
                max={100}
                step={10}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground text-center">{quality}%</div>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={fullPage}
                  onChange={(e) => setFullPage(e.target.checked)}
                  className="rounded"
                />
                {t('options.fullPage')}
              </label>
              <p className="text-xs text-muted-foreground">{t('options.fullPageDesc')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Results */}
      {hasData && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              {t('results.title')}
            </CardTitle>
            <CardDescription>
              {t('results.description', { domain: data.domain })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Screenshot Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('results.size')}:</span>
                <div className="font-medium">{data.width} × {data.height}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('results.fileSize')}:</span>
                <div className="font-medium">{formatFileSize(getImageSize(data.imageData))}</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('results.captureTime')}:</span>
                <div className="font-medium">{data.captureTime}ms</div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('results.timestamp')}:</span>
                <div className="font-medium">{new Date(data.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>

            <Separator />

            {/* Screenshot Image */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t('results.preview')}</h4>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopyImage}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {t('actions.copy')}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('actions.download')}
                  </Button>
                  <Button
                    onClick={() => window.open(data.imageData, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('actions.openNew')}
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={data.imageData}
                  alt={`Screenshot of ${data.domain}`}
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Metadata */}
            {data.metadata && (
              <div className="space-y-2">
                <h4 className="font-medium">{t('results.metadata')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {Object.entries(data.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{key}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Capture History */}
      {captureHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('history.title')}
            </CardTitle>
            <CardDescription>{t('history.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {captureHistory.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileImage className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.domain}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.width} × {item.height} • {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setDomain(item.domain);
                        if (item.options) {
                          const device = DEVICE_PRESETS.find(d => d.name === item.options?.device);
                          if (device) {
                            setSelectedDevice(device);
                            setUseCustomSize(false);
                          } else {
                            setCustomWidth(item.width);
                            setCustomHeight(item.height);
                            setUseCustomSize(true);
                          }
                          setFullPage(item.options.fullPage || false);
                          setQuality(item.options.quality || 80);
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('noData.title')}</h3>
            <p className="text-muted-foreground mb-4">{t('noData.description')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}