'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bot, Braces, CalendarClock, Command, Gauge,
  LogOut, Menu, Network, PanelLeftClose, PanelLeftOpen, Search, Settings, Users, X,
} from 'lucide-react';
import { useAuth } from '@/components/providers';
import { DashboardProvider, useDashboard } from '@/components/dashboard-provider';
import { CommandPalette } from '@/components/command-palette';
import { cn } from '@/lib/api';
import { Spinner } from '@/components/ui';

const navItems = [
  { href: '/overview', label: 'Overview', icon: Gauge, group: 'Workspace' },
  { href: '/bots', label: 'Bots', icon: Bot, group: 'Workspace' },
  { href: '/network', label: 'Network', icon: Network, group: 'Workspace' },
  { href: '/aliases', label: 'Aliases', icon: Command, group: 'Automation' },
  { href: '/scripts', label: 'Scripts', icon: Braces, group: 'Automation' },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock, group: 'Automation' },
  { href: '/activity', label: 'Activity', icon: Activity, group: 'Automation' },
  { href: '/users', label: 'Users', icon: Users, group: 'Administration', admin: true },
  { href: '/settings', label: 'Settings', icon: Settings, group: 'Account' },
];

export function AppShell({ children }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <FullScreenLoader label="Authenticating session..." />;
  }

  return (
    <DashboardProvider>
      <ShellWithDashboard>{children}</ShellWithDashboard>
    </DashboardProvider>
  );
}

function ShellWithDashboard({ children }) {
  const { loading: dashboardLoading } = useDashboard();

  if (dashboardLoading) {
    return <FullScreenLoader label="Syncing fleet workspace..." />;
  }

  return <ShellFrame>{children}</ShellFrame>;
}

function FullScreenLoader({ label = 'Initializing BotHive...' }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      <div className="relative flex flex-col items-center">
        {/* Sleek rotating halo ring */}
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-white" style={{ animationDuration: '0.85s' }} />
          <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)]" />
        </div>
        <p className="mt-5 font-mono text-xs tracking-wider uppercase text-white/50 animate-pulse">
          {label}
        </p>
      </div>
    </div>
  );
}

function ShellFrame({ children }) {
  const { user, logout } = useAuth();
  const { bots, proxies, connection } = useDashboard();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(user?.preferences?.sidebar === 'collapsed');
  const active = navItems.find((item) => pathname.startsWith(item.href)) || navItems[0];

  useEffect(() => setMobileOpen(false), [pathname]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
    router.refresh();
  }, [logout, router]);

  const visibleItems = useMemo(
    () => navItems.filter((item) => !item.admin || user.role === 'admin'),
    [user.role]
  );
  const groups = [...new Set(visibleItems.map((item) => item.group))];

  const paletteItems = useMemo(
    () => [
      ...visibleItems.map((i) => ({ label: i.label, href: i.href, icon: i.icon, group: i.group })),
      { label: 'Sign out', action: handleLogout, icon: LogOut, group: 'Account' },
    ],
    [visibleItems, handleLogout]
  );

  const openPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  const sidebar = (
    <>
      <div className={cn('flex h-[68px] shrink-0 items-center border-b border-white/[0.07]', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link href="/overview" className="group flex min-w-0 items-center">
          {!collapsed && (
            <span className="min-w-0">
              <strong className="block truncate text-[15px] font-semibold tracking-[-0.02em] text-white">BotHive</strong>
              <small className="block truncate text-[9px] uppercase tracking-[0.18em] text-white/30">Control plane</small>
            </span>
          )}
        </Link>
      </div>

      <nav className="console-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group} className="mb-6">
            {!collapsed && <p className="mb-2.5 px-3 text-[9px] font-medium uppercase tracking-[0.19em] text-white/20">{group}</p>}
            <div className="space-y-0.5">
              {visibleItems.filter((item) => item.group === group).map((item) => {
                const Icon = item.icon;
                const current = pathname.startsWith(item.href);
                const badge = item.href === '/bots' ? bots.length : item.href === '/network' ? proxies.length : null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex h-10 items-center rounded-xl text-[13px] font-medium transition-all duration-500 [transition-timing-function:var(--ease-ios)]',
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                      current ? 'bg-white/[0.09] text-white' : 'text-white/40 hover:bg-white/[0.05] hover:text-white/85'
                    )}
                  >
                    {current && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-white" />
                    )}
                    <Icon className={cn('h-[17px] w-[17px] shrink-0 transition-colors', current ? 'text-white' : 'text-white/30 group-hover:text-white/70')} />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge !== null && (
                          <span className="tnum rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/40">{badge}</span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-3">
        <div className={cn('mb-2 flex items-center rounded-xl border border-white/[0.07] bg-white/[0.03] p-2.5', collapsed ? 'justify-center' : 'gap-3')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-semibold uppercase text-white">{user.email.slice(0, 2)}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[12px] font-medium text-white/85">{user.email}</strong>
              <small className="text-[9px] uppercase tracking-[0.15em] text-white/25">{user.role}</small>
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('flex h-9 w-full items-center rounded-xl text-[12px] font-medium text-white/35 transition-all duration-300 hover:bg-white/[0.07] hover:text-white', collapsed ? 'justify-center' : 'gap-3 px-3')}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <CommandPalette items={paletteItems} />

      <div className="spotlight pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]" />

      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.08] bg-[#080808]/95 shadow-[4px_0_24px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="anim-fade fixed inset-0 z-50 bg-black/80 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="anim-rise relative flex h-full w-[280px] flex-col border-r border-white/10 bg-[#080808] shadow-2xl backdrop-blur-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute -right-12 top-4 rounded-xl border border-white/10 bg-white/[0.06] p-2 text-white/70 backdrop-blur-xl transition hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          'relative z-10 flex min-h-screen flex-col transition-all duration-300',
          collapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        <header className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-white/[0.08] bg-black/80 px-4 backdrop-blur-2xl sm:px-8">
          <button
            className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-white/50 transition hover:text-white lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            className="hidden rounded-xl p-2 text-white/35 transition-all duration-200 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[14px] font-semibold tracking-tight text-white">{active.label}</h2>
          </div>

          <button
            onClick={openPalette}
            className="hidden items-center gap-2.5 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3.5 py-2 text-[12px] text-white/40 backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:text-white sm:flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/50">Cmd K</kbd>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/50 backdrop-blur-xl">
            <span className={cn('h-1.5 w-1.5 rounded-full', connection === 'live' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]' : 'anim-pulse bg-white/40')} />
            {connection}
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
