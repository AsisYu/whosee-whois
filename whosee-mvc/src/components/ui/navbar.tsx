"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import { log } from '@/lib/logger';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Search, Globe, Activity, Camera, Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const navigationItems = [
  {
    title: 'domain',
    href: '/domain',
    icon: Search,
    description: 'domainDesc'
  },
  {
    title: 'dns',
    href: '/dns',
    icon: Globe,
    description: 'dnsDesc'
  },
  {
    title: 'health',
    href: '/health',
    icon: Activity,
    description: 'healthDesc'
  },
  {
    title: 'screenshot',
    href: '/screenshot',
    icon: Camera,
    description: 'screenshotDesc'
  }
];

export function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  React.useEffect(() => {
    try {
      log.info('[i18n] Navbar render', 'i18n', { locale, pathname });
    } catch {}
  }, [locale, pathname]);

  return (
    <header className="sticky top-0 z-[200] w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pointer-events-auto">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 h-14 grid grid-cols-[auto_1fr_auto] items-center gap-1">
        {/* Logo */}
        <div className="mr-2 md:mr-3 hidden md:flex col-start-1 justify-self-start">
          <Link href={`/${locale}`} className="mr-6 flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Search className="h-4 w-4" />
            </div>
            <span className="hidden font-bold sm:inline-block">
              Whosee
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex col-start-2 justify-self-start">
          <NavigationMenuList>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(`/${locale}${item.href}`);
              
              return (
                <NavigationMenuItem key={item.href}>
                  <NavigationMenuLink asChild>
                    <Link 
                      href={`/${locale}${item.href}`}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        isActive && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {t(item.title)}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Mobile Navigation */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden col-start-1 justify-self-start"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mr-2">
                  <Search className="h-4 w-4" />
                </div>
                Whosee
              </DialogTitle>
              <DialogDescription>
                {t('description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(`/${locale}${item.href}`);
                
                return (
                  <Link
                    key={item.href}
                    href={`/${locale}${item.href}`}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center text-sm font-medium transition-colors hover:text-primary p-2 rounded-md",
                      isActive ? "text-primary bg-accent" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {t(item.title)}
                  </Link>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Right utilities (desktop) + Mobile Logo (hidden on md+) */}
        <div className="flex items-center space-x-2 col-start-3 justify-self-end">
          <div className="w-full flex-1 md:hidden">
            <Link href={`/${locale}`} className="flex items-center space-x-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Search className="h-4 w-4" />
              </div>
              <span className="font-bold">Whosee</span>
            </Link>
          </div>
          
          {/* Theme and Language Toggle */}
          <nav className="relative z-20 flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}