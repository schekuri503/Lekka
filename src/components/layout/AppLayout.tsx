import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Calendar,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { signOut } from '@/hooks/useAuth';
import { LanguageToggle } from '@/components/shared/LanguageToggle';

interface NavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/customers', labelKey: 'nav.customers', icon: Users },
  { to: '/accounts/new', labelKey: 'nav.new_account', icon: PlusCircle },
  { to: '/dues', labelKey: 'nav.dues', icon: Calendar },
  { to: '/reminders', labelKey: 'nav.reminders', icon: Bell },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function AppLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur md:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-semibold tracking-tight text-primary">
            {t('app.name')}
          </span>
          <span className="text-xs text-muted-foreground">· {t('app.tagline')}</span>
        </div>
        <LanguageToggle />
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <span className="font-display text-base font-bold">ల</span>
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold tracking-tight text-primary">
                {t('app.name')}
              </p>
              <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-2">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-accent hover:text-foreground',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2 border-t border-border/60 p-3">
            <LanguageToggle />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </Button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            />
            <aside className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
              <div className="flex h-14 items-center justify-between px-4">
                <span className="font-display text-lg font-semibold text-primary">
                  {t('app.name')}
                </span>
                <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-accent">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 px-3 py-2">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    {t(item.labelKey)}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-border/60 p-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.logout')}
                </Button>
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
