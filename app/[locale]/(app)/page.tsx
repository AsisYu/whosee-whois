import { useTranslations } from 'next-intl'
import { Search, Globe, Camera, Zap } from 'lucide-react'

export default function HomePage() {
  const t = useTranslations('home')

  const features = [
    {
      name: 'whois',
      icon: Search,
    },
    {
      name: 'dns',
      icon: Globe,
    },
    {
      name: 'screenshot',
      icon: Camera,
    },
    {
      name: 'itdog',
      icon: Zap,
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {t('title')}
        </h1>
        <p className="text-lg text-muted-foreground md:text-xl">
          {t('subtitle')}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-5xl">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.name}
              className="group relative rounded-lg border border-border bg-card p-6 hover:border-primary transition-colors"
            >
              <div className="flex flex-col space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">
                  {t(`features.${feature.name}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`features.${feature.name}.description`)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Start */}
      <div className="w-full max-w-2xl space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">{t('quickStart')}</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('placeholder')}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {t('query')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
