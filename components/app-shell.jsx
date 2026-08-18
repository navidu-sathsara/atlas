'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bot, Box, Braces, CalendarClock, Command, Gauge,
  LogOut, Menu, Network, PanelLeftClose, PanelLeftOpen, Search, Settings, Users, Workflow, X,
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
  { href: '/automations', label: 'Automations', icon: Workflow, group: 'Automation' },
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

function FullScreenLoader({ label = 'Initializing Native...' }) {
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
      <div className={cn('flex h-[68px] shrink-0 items-center border-b border-white/[0.08]', collapsed ? 'justify-center px-2' : 'px-5')}>
        <Link href="/overview" className="group flex min-w-0 items-center gap-3">
          <Box className={cn("shrink-0 text-white transition-transform group-hover:scale-110", collapsed ? "h-6 w-6" : "h-5 w-5")} />
          {!collapsed && (
            <span className="min-w-0">
              <strong className="block truncate text-base font-bold tracking-tight text-white">Native</strong>
              <small className="block truncate text-[10px] uppercase font-bold tracking-[0.16em] text-white/50">Control plane</small>
            </span>
          )}
        </Link>
      </div>

      <nav className="console-scrollbar flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group} className="mb-6">
            {!collapsed && <p className="mb-2.5 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">{group}</p>}
            <div className="space-y-1">
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
                      'group relative flex h-10.5 items-center rounded-xl text-[14px] font-medium transition-all duration-300',
                      collapsed ? 'justify-center px-2' : 'gap-3 px-3.5',
                      current ? 'bg-white/[0.12] text-white font-semibold shadow-sm' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    {current && !collapsed && (
                      <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r-full bg-white" />
                    )}
                    <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', current ? 'text-white' : 'text-white/50 group-hover:text-white')} />
                    {!collapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {badge !== null && (
                          <span className="tnum rounded-lg bg-white/[0.10] px-2 py-0.5 text-xs font-bold text-white/70">{badge}</span>
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

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <div className={cn('mb-2 flex items-center rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5', collapsed ? 'justify-center' : 'gap-3')}>
          <img src="https://mc-heads.net/avatar/steelchari67/100" alt="steelchari67 avatar" className="h-9 w-9 shrink-0 rounded-xl bg-white/15 object-cover shadow-sm rendering-pixelated" />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[13px] font-semibold text-white">{user.email}</strong>
              <small className="text-[10px] uppercase font-bold tracking-wider text-white/40">{user.role}</small>
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          className={cn('flex h-10 w-full items-center rounded-xl text-[13px] font-medium text-white/50 transition-all duration-300 hover:bg-white/[0.08] hover:text-white', collapsed ? 'justify-center' : 'gap-3 px-3')}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </>
  );

  const mobileDockTabs = [
    { href: '/overview', label: 'Overview', icon: Gauge },
    { href: '/bots', label: 'Bots', icon: Bot, badge: bots.length },
    { href: '/network', label: 'Network', icon: Network, badge: proxies.length },
    { href: '/scripts', label: 'Scripts', icon: Braces },
    { key: 'more', label: 'More', icon: Menu, action: () => setMobileOpen(true) },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <CommandPalette items={paletteItems} />

      <div className="spotlight pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px]" />

      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.08] bg-[#09090b]/95 shadow-[4px_0_24px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-300 lg:flex',
          collapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebar}
      </aside>

      {/* iOS Mobile Bottom Sheet Drawer */}
      {mobileOpen && (
        <div className="anim-fade fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="anim-rise max-h-[85vh] w-full overflow-y-auto rounded-t-[30px] border-t border-white/15 bg-[#0d0d0f]/98 p-5 shadow-2xl backdrop-blur-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />
            
            <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <strong className="block text-base font-bold tracking-tight text-white">Native Navigation</strong>
                <small className="text-xs text-white/40">{user.email} · {user.role}</small>
              </div>
              <button
                className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-white/60 backdrop-blur-xl transition hover:text-white"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pb-4 sm:grid-cols-3">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const current = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 active:scale-95',
                      current
                        ? 'border-white/30 bg-white/[0.12] text-white shadow-sm'
                        : 'border-white/[0.07] bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-2 border-t border-white/[0.08] pt-4">
              <button
                onClick={handleLogout}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/60 transition active:scale-95 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out of account
              </button>
            </div>
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
        <header className="sticky top-0 z-30 flex h-[64px] items-center gap-3 border-b border-white/[0.08] bg-black/85 px-4 backdrop-blur-2xl sm:h-[68px] sm:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white lg:hidden">NL</span>
            <h2 className="truncate text-[14px] font-semibold tracking-tight text-white sm:text-[15px]">{active.label}</h2>
          </div>

          <button
            onClick={openPalette}
            className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/50 backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:text-white sm:px-3.5 sm:py-2"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/50 sm:inline">Cmd K</kbd>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/50 backdrop-blur-xl sm:gap-2 sm:px-3.5 sm:py-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', connection === 'live' ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]' : 'anim-pulse bg-white/40')} />
            <span className="hidden sm:inline">{connection}</span>
          </div>

          <button
            className="hidden rounded-xl p-2 text-white/35 transition-all duration-200 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 pb-28 sm:p-6 sm:pb-32 lg:p-8 lg:pb-12">{children}</main>
      </div>

      {/* iOS Mobile Floating Glass Bottom Tab Bar / Dock */}
      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-center justify-around rounded-full border border-white/15 bg-[#101012]/90 px-3 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.9)] backdrop-blur-3xl lg:hidden">
        {mobileDockTabs.map((tab) => {
          const Icon = tab.icon;
          const isCurrent = tab.href ? pathname.startsWith(tab.href) : false;
          if (tab.action) {
            return (
              <button
                key={tab.key || tab.label}
                onClick={tab.action}
                className="flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-white/45 transition active:scale-90 hover:text-white"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-full px-3 py-1 transition-all duration-200 active:scale-90',
                isCurrent ? 'text-white font-semibold' : 'text-white/45 hover:text-white/80'
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-white px-1 text-[8px] font-bold text-black">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] tracking-tight">{tab.label}</span>
              {isCurrent && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
