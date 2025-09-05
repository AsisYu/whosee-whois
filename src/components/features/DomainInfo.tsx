'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Globe, 
  Calendar, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Server, 
  Copy, 
  Check, 
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDomain } from '@/hooks/useDomain';
import { copyToClipboard, formatDate, cn } from '@/lib/utils';
import { DomainInfo as DomainInfoType, Contact } from '@/types';

interface DomainInfoProps {
  className?: string;
  showRawData?: boolean;
}

/**
 * 域名信息显示组件
 */
export function DomainInfo({ className, showRawData = false }: DomainInfoProps) {
  const { data, loading, error, getFormattedData } = useDomain();
  const t = useTranslations('domain');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(showRawData);

  const formattedData = getFormattedData();

  // 复制文本
  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>{t('error.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            {t('search.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* 域名基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>{t('results.title')}</span>
          </CardTitle>
          <CardDescription>
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow
            icon={<Globe className="h-4 w-4" />}
            label={t('results.basic.domain')}
            value={data.domain}
            onCopy={() => handleCopy(data.domain, 'domain')}
            copied={copiedField === 'domain'}
          />
          
          {data.registrar && (
            <InfoRow
              icon={<Building className="h-4 w-4" />}
              label={t('results.basic.registrar')}
              value={data.registrar}
              onCopy={() => handleCopy(data.registrar!, 'registrar')}
              copied={copiedField === 'registrar'}
            />
          )}
          
          {data.registrationDate && (
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label={t('results.dates.created')}
              value={formatDate(data.registrationDate)}
              onCopy={() => handleCopy(data.registrationDate!, 'created')}
              copied={copiedField === 'created'}
            />
          )}
          
          {data.expirationDate && (
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label={t('results.dates.expires')}
              value={formatDate(data.expirationDate)}
              onCopy={() => handleCopy(data.expirationDate!, 'expires')}
              copied={copiedField === 'expires'}
            />
          )}
          
          {/* 若后端提供更新时间，可在类型中补充并显示 */}
          {/* {data.updatedDate && (
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label={t('results.dates.updated')}
              value={formatDate(data.updatedDate)}
              onCopy={() => handleCopy(data.updatedDate!, 'updated')}
              copied={copiedField === 'updated'}
            />
          )} */}
        </CardContent>
      </Card>

      {/* 名称服务器 */}
      {data.nameServers && data.nameServers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>{t('results.nameservers.title')}</span>
            </CardTitle>
            <CardDescription>
              {t('results.nameservers.title')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.nameServers.map((ns: string, index: number) => (
                <InfoRow
                  key={index}
                  icon={<Server className="h-4 w-4" />}
                  label={`NS ${index + 1}`}
                  value={ns}
                  onCopy={() => handleCopy(ns, `ns-${index}`)}
                  copied={copiedField === `ns-${index}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 联系人信息 */}
      {(data.contacts?.registrant || data.contacts?.admin || data.contacts?.tech) && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.contacts?.registrant && (
            <ContactCard
              title={t('results.roles.registrant')}
              contact={data.contacts.registrant as any}
              onCopy={handleCopy}
              copiedField={copiedField}
            />
          )}
          {data.contacts?.admin && (
            <ContactCard
              title={t('results.roles.admin')}
              contact={data.contacts.admin as any}
              onCopy={handleCopy}
              copiedField={copiedField}
            />
          )}
          {data.contacts?.tech && (
            <ContactCard
              title={t('results.roles.tech')}
              contact={data.contacts.tech as any}
              onCopy={handleCopy}
              copiedField={copiedField}
            />
          )}
        </div>
      )}

      {/* 原始数据 */}
      {/* 若原始数据可用，可按需显示 */}
      {/* {data.raw && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('results.raw.title')}</CardTitle>
                <CardDescription>
                  {t('results.raw.description')}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? t('results.raw.hide') : t('results.raw.show')}
              </Button>
            </div>
          </CardHeader>
          {showRaw && (
            <CardContent>
              <div className="relative">
                <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                  {data.raw}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => handleCopy(data.raw || '', 'raw')}
                >
                  {copiedField === 'raw' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )} */}
    </div>
  );
}

/**
 * 信息行组件
 */
function InfoRow({ 
  icon, 
  label, 
  value, 
  onCopy, 
  copied,
  external = false 
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  external?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">{value}</div>
        </div>
      </div>
      <div className="flex items-center space-x-1">
        {external && (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
        {onCopy && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={onCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 联系人卡片组件
 */
function ContactCard({ 
  title, 
  contact, 
  onCopy, 
  copiedField 
}: {
  title: string;
  contact: Contact;
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  const contactKey = title.toLowerCase().replace(' ', '-');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-base">
          <User className="h-4 w-4" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contact.name && (
          <InfoRow
            icon={<User className="h-4 w-4" />}
            label="Name"
            value={contact.name}
            onCopy={() => onCopy(contact.name!, `${contactKey}-name`)}
            copied={copiedField === `${contactKey}-name`}
          />
        )}
        
        {contact.organization && (
          <InfoRow
            icon={<Building className="h-4 w-4" />}
            label="Organization"
            value={contact.organization}
            onCopy={() => onCopy(contact.organization!, `${contactKey}-org`)}
            copied={copiedField === `${contactKey}-org`}
          />
        )}
        
        {contact.email && (
          <InfoRow
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            value={contact.email}
            onCopy={() => onCopy(contact.email!, `${contactKey}-email`)}
            copied={copiedField === `${contactKey}-email`}
          />
        )}
        
        {contact.phone && (
          <InfoRow
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={contact.phone}
            onCopy={() => onCopy(contact.phone!, `${contactKey}-phone`)}
            copied={copiedField === `${contactKey}-phone`}
          />
        )}
        
        {(contact.address || contact.city || contact.country) && (
          <InfoRow
            icon={<MapPin className="h-4 w-4" />}
            label="Address"
            value={[
              contact.address,
              contact.city,
              contact.state,
              contact.country
            ].filter(Boolean).join(', ')}
            onCopy={() => onCopy(
              [contact.address, contact.city, contact.state, contact.country]
                .filter(Boolean).join(', '), 
              `${contactKey}-address`
            )}
            copied={copiedField === `${contactKey}-address`}
          />
        )}
      </CardContent>
    </Card>
  );
}