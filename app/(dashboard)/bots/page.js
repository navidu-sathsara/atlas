'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CircleStop,
  Cpu,
  FileCode2,
  Filter,
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  PackageOpen,
  PanelLeftClose,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  Terminal,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useDashboard } from '@/components/dashboard-provider';
import { useAuth, useToast } from '@/components/providers';
import { BotConsole } from '@/components/bot-console';
import { BotConsoleTile } from '@/components/bot-console-tile';
import { Button, Checkbox, EmptyState, Modal, PageHeader, Panel, Spinner, StatusBadge, Tabs } from '@/components/ui';
import { api, cn } from '@/lib/api';
import { botLabel, categoryOf, proxyLabel } from '@/lib/format';

const defaultDeploy = {
  id: '',
  username: '',
  host: 'play.bananasmp.net',
  port: '25565',
  version: '1.20.1',
  auth: 'offline',
  category: 'Uncategorized',
  proxyId: '',
  autoReconnect: true,
  afkMode: true,
};

export default function BotsPage() {
  const { user } = useAuth();
  const { bots, setBots, proxies, loading, refreshBots } = useDashboard();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('inspector'); // 'inspector' | 'matrix'
  const [gridCols, setGridCols] = useState(2); // 2 | 3 | 4
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('console');
  const [deployOpen, setDeployOpen] = useState(false);
  const [deploy, setDeploy] = useState(defaultDeploy);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState('');
  const [broadcastCmd, setBroadcastCmd] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('bot');
    if (requested) setSelectedId(requested);
  }, []);

  useEffect(() => {
    if (bots.length && !bots.some((bot) => bot.id === selectedId)) setSelectedId(bots[0].id);
    if (!bots.length) setSelectedId('');
  }, [bots, selectedId]);

  const categories = useMemo(() => {
    const list = [...new Set(bots.map((b) => categoryOf(b)).filter(Boolean))];
    return ['all', ...list];
  }, [bots]);

  const stats = useMemo(() => {
    const running = bots.filter((b) => b.status === 'running').length;
    const offline = bots.filter((b) => b.status !== 'running').length;
    return { total: bots.length, running, offline };
  }, [bots]);

  const visible = useMemo(() => {
    return bots.filter((bot) => {
      // Status filter
      if (statusFilter === 'running' && bot.status !== 'running') return false;
      if (statusFilter === 'offline' && bot.status === 'running') return false;

      // Category filter
      if (categoryFilter !== 'all' && categoryOf(bot) !== categoryFilter) return false;

      // Search query
      const query = search.trim().toLowerCase();
      if (!query) return true;

      return [bot.id, botLabel(bot), bot.config?.host, categoryOf(bot)].some((val) =>
        String(val || '').toLowerCase().includes(query)
      );
    });
  }, [bots, search, statusFilter, categoryFilter]);

  const selected = bots.find((bot) => bot.id === selectedId) || null;

  const selectBot = (id) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('bot', id);
    window.history.replaceState({}, '', url);
  };

  const updateBotStatus = useCallback(
    (id, status) => {
      setBots((current) => current.map((b) => (b.id === id ? { ...b, status } : b)));
    },
    [setBots]
  );

  const lifecycle = async (action) => {
    if (!selected) return;
    setBusy(action);
    try {
      await api(`/bots/${encodeURIComponent(selected.id)}/${action}`, { method: 'POST' });
      toast(`${botLabel(selected)} ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarting'}`, 'success');
      window.setTimeout(refreshBots, action === 'restart' ? 3000 : 800);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Delete ${botLabel(selected)} and its private runtime data?`)) return;
    setBusy('delete');
    try {
      await api(`/bots/${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      toast('Bot deleted', 'success');
      setSelectedId('');
      await refreshBots();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const createBot = async () => {
    setSubmitting(true);
    try {
      const result = await api('/bots', {
        method: 'POST',
        body: JSON.stringify({ ...deploy, port: Number(deploy.port) || 25565 }),
      });
      toast(`${botLabel(result.bot)} deployed`, 'success');
      setDeployOpen(false);
      setDeploy(defaultDeploy);
      await refreshBots();
      if (result.bot?.id) selectBot(result.bot.id);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBroadcast = async (e) => {
    e?.preventDefault();
    const cmd = broadcastCmd.trim();
    if (!cmd || !visible.length) return;
    setBroadcasting(true);
    let sent = 0;
    try {
      await Promise.all(
        visible.map(async (bot) => {
          try {
            await api(`/bots/${encodeURIComponent(bot.id)}/cmd`, {
              method: 'POST',
              body: JSON.stringify({ cmd }),
            });
            sent++;
          } catch (_) {}
        })
      );
      toast(`Broadcasted command to ${sent} bots`, 'success');
      setBroadcastCmd('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Switcher */}
      <PageHeader
        eyebrow="Fleet Operations"
        title="Bots"
        description="Deploy, orchestrate, and observe live bot consoles across your fleet."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
              <button
                onClick={() => setViewMode('inspector')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                  viewMode === 'inspector'
                    ? 'bg-white text-black shadow-sm font-semibold'
                    : 'text-white/40 hover:text-white'
                )}
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
                Inspector
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-300',
                  viewMode === 'matrix'
                    ? 'bg-white text-black shadow-sm font-semibold'
                    : 'text-white/40 hover:text-white'
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Live Matrix
              </button>
            </div>

            <Button size="sm" onClick={() => refreshBots()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" variant="primary" onClick={() => setDeployOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Deploy bot
            </Button>
          </div>
        }
      />

      {/* Redesigned Search & Filter Control Bar */}
      <div className="space-y-3">
        <div className="bot-search-bar rounded-2xl border border-white/[0.08] bg-[#0c0c0c]/80 p-3 backdrop-blur-2xl">
          {/* Main Sleek Search Input */}
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bots by name, username, host, or category..."
              className="h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] pl-10 pr-12 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-white/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
            />
            {search ? (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Quick Filter Chips & Density Control */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filters */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition',
                  statusFilter === 'all' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                )}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setStatusFilter('running')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition',
                  statusFilter === 'running' ? 'bg-white text-black font-semibold' : 'text-white/40 hover:text-white'
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Live ({stats.running})
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition',
                  statusFilter === 'offline' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                )}
              >
                Offline ({stats.offline})
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 2 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-white outline-none transition focus:border-white/30"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-neutral-900 text-white">
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            )}

            {/* Grid Density (Matrix mode only) */}
            {viewMode === 'matrix' && (
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  onClick={() => setGridCols(2)}
                  title="2 Columns"
                  className={cn(
                    'rounded-lg p-1.5 text-xs transition',
                    gridCols === 2 ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(3)}
                  title="3 Columns"
                  className={cn(
                    'rounded-lg p-1.5 text-xs transition',
                    gridCols === 3 ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  title="4 Columns"
                  className={cn(
                    'rounded-lg p-1.5 text-xs transition',
                    gridCols === 4 ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Broadcast Bar (Visible in Matrix Grid Mode) */}
        {viewMode === 'matrix' && visible.length > 0 && (
          <form
            onSubmit={handleBroadcast}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.02] p-2 backdrop-blur-xl"
          >
            <Radio className="ml-2 h-4 w-4 shrink-0 text-white/50 animate-pulse" />
            <input
              value={broadcastCmd}
              onChange={(e) => setBroadcastCmd(e.target.value)}
              placeholder={`Broadcast command to all ${visible.length} visible bots (e.g. /spawn, /login, !mine)...`}
              className="min-w-0 flex-1 bg-transparent px-2 py-1 font-mono text-xs text-white placeholder-white/20 outline-none"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              loading={broadcasting}
              disabled={!broadcastCmd.trim()}
            >
              <Send className="h-3 w-3" /> Broadcast
            </Button>
          </form>
        )}
      </div>

      {/* ─── VIEW 1: LIVE CONSOLE MATRIX GRID ─── */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {loading ? (
            <Panel className="p-12 flex justify-center">
              <Spinner label="Connecting to fleet matrix..." />
            </Panel>
          ) : visible.length ? (
            <div
              className={cn(
                'grid gap-4',
                gridCols === 2
                  ? 'grid-cols-1 lg:grid-cols-2'
                  : gridCols === 3
                  ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
              )}
            >
              {visible.map((bot) => (
                <BotConsoleTile
                  key={bot.id}
                  bot={bot}
                  onStatusChange={updateBotStatus}
                  onInspect={(id) => {
                    selectBot(id);
                    setViewMode('inspector');
                  }}
                />
              ))}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={Terminal}
                title="No matching bots in matrix"
                description={
                  bots.length
                    ? 'Try clearing your search query or status filter.'
                    : 'Deploy bots to start observing their consoles.'
                }
                action={
                  <Button variant="primary" onClick={() => setDeployOpen(true)}>
                    <Plus className="h-4 w-4" /> Deploy bot
                  </Button>
                }
              />
            </Panel>
          )}
        </div>
      )}

      {/* ─── VIEW 2: INSPECTOR (SPLIT PANE) ─── */}
      {viewMode === 'inspector' && (
        <div className="bot-inspector-grid min-h-[640px]">
          {/* Bot Sidebar List */}
          <Panel className="sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-white/[0.02]">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Fleet ({visible.length})
              </span>
              <span className="text-[11px] text-white/30 font-mono">
                {stats.running} live
              </span>
            </div>
            <div className="console-scrollbar overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <Spinner label="Loading bots" />
              ) : visible.length ? (
                visible.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => selectBot(bot.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200',
                      selectedId === bot.id
                        ? 'border-white/30 bg-white/[0.12] shadow-sm'
                        : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black uppercase text-white">
                      {botLabel(bot).slice(0, 2)}
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black',
                          bot.status === 'running'
                            ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,1)]'
                            : bot.status === 'error'
                            ? 'bg-white/40'
                            : 'bg-white/20'
                        )}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-semibold text-white">{botLabel(bot)}</strong>
                      <small className="mt-0.5 block truncate text-[11px] text-white/40">
                        {categoryOf(bot)} · {bot.config?.host || bot.id}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState
                  icon={Bot}
                  title="No matching bots"
                  description={bots.length ? 'Adjust the filter to see more bots.' : 'Deploy your first bot to begin.'}
                />
              )}
            </div>
          </Panel>

          {/* Selected Bot Details */}
          {selected ? (
            <div className="min-w-0 space-y-5">
              <Panel className="p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-base font-black uppercase text-white">
                      {botLabel(selected).slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-bold text-white">{botLabel(selected)}</h2>
                        <StatusBadge status={selected.status} />
                      </div>
                      <p className="mt-1 font-mono text-xs text-white/40">{selected.id}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/50">
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                          {selected.config?.host}:{selected.config?.port || 25565}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                          {selected.config?.version || 'auto'}
                        </span>
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                          {categoryOf(selected)}
                        </span>
                        {selected.ownerLabel && (
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
                            {selected.ownerLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.status === 'running' ? (
                      <>
                        <Button size="sm" loading={busy === 'restart'} onClick={() => lifecycle('restart')}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restart
                        </Button>
                        <Button size="sm" variant="danger" loading={busy === 'stop'} onClick={() => lifecycle('stop')}>
                          <CircleStop className="h-3.5 w-3.5" />
                          Stop
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="success" loading={busy === 'start'} onClick={() => lifecycle('start')}>
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    )}
                    <Button size="sm" variant="danger" loading={busy === 'delete'} onClick={remove}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Panel>

              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'console', label: 'Console' },
                  { value: 'config', label: 'Configuration' },
                  { value: 'inventory', label: 'Inventory' },
                  { value: 'modules', label: 'Modules' },
                  { value: 'scripts', label: 'Bot scripts' },
                ]}
              />

              {tab === 'console' && <BotConsole bot={selected} onStatus={(st) => updateBotStatus(selected.id, st)} />}
              {tab === 'config' && <BotConfiguration bot={selected} proxies={proxies} user={user} onSaved={refreshBots} />}
              {tab === 'inventory' && <BotInventory bot={selected} />}
              {tab === 'modules' && <BotModules bot={selected} />}
              {tab === 'scripts' && <BotScripts bot={selected} />}
            </div>
          ) : (
            <Panel>
              <EmptyState
                icon={Bot}
                title="No bot selected"
                description="Select a bot from the fleet, or deploy a new one."
                action={
                  <Button variant="primary" onClick={() => setDeployOpen(true)}>
                    <Plus className="h-4 w-4" /> Deploy bot
                  </Button>
                }
              />
            </Panel>
          )}
        </div>
      )}

      {/* Deploy Bot Modal */}
      <Modal
        open={deployOpen}
        onClose={() => setDeployOpen(false)}
        title="Deploy bot"
        description="The bot and its runtime folder will belong to your account."
        wide
        footer={
          <>
            <Button onClick={() => setDeployOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createBot} loading={submitting}>
              Deploy bot
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Bot ID"
            value={deploy.id}
            onChange={(value) => setDeploy({ ...deploy, id: value })}
            placeholder="Optional, generated automatically"
          />
          <Field
            label="Minecraft username"
            value={deploy.username}
            onChange={(value) => setDeploy({ ...deploy, username: value })}
            placeholder="Bot username"
          />
          <Field
            label="Server host"
            value={deploy.host}
            onChange={(value) => setDeploy({ ...deploy, host: value })}
          />
          <Field
            label="Port"
            type="number"
            value={deploy.port}
            onChange={(value) => setDeploy({ ...deploy, port: value })}
          />
          <Field
            label="Minecraft version"
            value={deploy.version}
            onChange={(value) => setDeploy({ ...deploy, version: value })}
          />
          <Field
            label="Category"
            value={deploy.category}
            onChange={(value) => setDeploy({ ...deploy, category: value })}
          />
          <label>
            <span className="field-label">Authentication</span>
            <select
              className="field-control"
              value={deploy.auth}
              onChange={(event) => setDeploy({ ...deploy, auth: event.target.value })}
            >
              <option value="offline">Offline</option>
              <option value="microsoft">Microsoft</option>
            </select>
          </label>
          <label>
            <span className="field-label">Proxy</span>
            <select
              className="field-control"
              value={deploy.proxyId}
              onChange={(event) => setDeploy({ ...deploy, proxyId: event.target.value })}
            >
              <option value="">Direct connection</option>
              {proxies.map((proxy) => (
                <option key={proxy.id} value={proxy.id}>
                  {proxyLabel(proxy)}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <Checkbox
              checked={deploy.autoReconnect}
              onChange={(value) => setDeploy({ ...deploy, autoReconnect: value })}
              label="Automatic reconnect"
              description="Reconnect after kicks or network loss."
            />
            <Checkbox
              checked={deploy.afkMode}
              onChange={(value) => setDeploy({ ...deploy, afkMode: value })}
              label="AFK mode"
              description="Keep the account active while connected."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return <label><span className="field-label">{label}</span><input type={type} className="field-control" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function BotConfiguration({ bot, proxies, user, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const config = bot.config || {};
    const proxy = proxies.find((item) => item.uri === config.proxy || item.label === config.proxy);
    setForm({
      username: config.username || '', category: config.category || 'Uncategorized', host: config.host || '',
      port: config.port || 25565, version: config.version || '1.20.1', auth: config.auth || 'offline',
      proxyId: proxy?.id || '', autoReconnect: config.autoReconnect !== false, reconnectDelay: config.reconnectDelay || 5000,
      afkMode: config.afkMode !== false, autoLogin: !!config.autoLogin, autoRegister: !!config.autoRegister,
      loginPassword: '', ownerId: bot.ownerId || '',
    });
  }, [bot, proxies]);

  useEffect(() => {
    if (user.role === 'admin') api('/users').then((result) => setUsers(result.users || [])).catch(() => {});
  }, [user.role]);

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (user.role === 'admin' && form.ownerId && form.ownerId !== bot.ownerId) {
        if (!window.confirm('Transfer this bot to the selected user? Owner scripts and aliases on the bot will be reset.')) return;
        await api(`/bots/${encodeURIComponent(bot.id)}/owner`, { method: 'PATCH', body: JSON.stringify({ ownerId: form.ownerId }) });
      }
      const patch = { ...form, port: Number(form.port) || 25565, reconnectDelay: Number(form.reconnectDelay) || 5000 };
      if (!patch.loginPassword) delete patch.loginPassword;
      delete patch.ownerId;
      await api(`/bots/${encodeURIComponent(bot.id)}/config`, { method: 'PATCH', body: JSON.stringify(patch) });
      toast('Configuration saved', 'success');
      await onSaved();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel className="p-5">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Minecraft username" value={form.username || ''} onChange={(value) => change('username', value)} />
        <Field label="Category" value={form.category || ''} onChange={(value) => change('category', value)} />
        <Field label="Server host" value={form.host || ''} onChange={(value) => change('host', value)} />
        <Field label="Port" type="number" value={form.port || ''} onChange={(value) => change('port', value)} />
        <Field label="Minecraft version" value={form.version || ''} onChange={(value) => change('version', value)} />
        <label><span className="field-label">Authentication</span><select className="field-control" value={form.auth || 'offline'} onChange={(event) => change('auth', event.target.value)}><option value="offline">Offline</option><option value="microsoft">Microsoft</option></select></label>
        <label><span className="field-label">Proxy</span><select className="field-control" value={form.proxyId || ''} onChange={(event) => change('proxyId', event.target.value)}><option value="">Direct connection</option>{proxies.map((proxy) => <option key={proxy.id} value={proxy.id}>{proxyLabel(proxy)}</option>)}</select></label>
        <Field label="Reconnect delay (ms)" type="number" value={form.reconnectDelay || ''} onChange={(value) => change('reconnectDelay', value)} />
        {user.role === 'admin' && <label className="sm:col-span-2"><span className="field-label">Resource owner</span><select className="field-control" value={form.ownerId || ''} onChange={(event) => change('ownerId', event.target.value)}>{users.map((account) => <option key={account.id} value={account.id}>{account.email} · {account.role}</option>)}</select></label>}
        <label className="sm:col-span-2"><span className="field-label">Login password</span><input className="field-control" type="password" autoComplete="new-password" value={form.loginPassword || ''} onChange={(event) => change('loginPassword', event.target.value)} placeholder="Leave blank to keep the current password" /></label>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2"><Checkbox checked={!!form.autoReconnect} onChange={(value) => change('autoReconnect', value)} label="Automatic reconnect" /><Checkbox checked={!!form.afkMode} onChange={(value) => change('afkMode', value)} label="AFK mode" /><Checkbox checked={!!form.autoLogin} onChange={(value) => change('autoLogin', value)} label="Automatic login handshake" /><Checkbox checked={!!form.autoRegister} onChange={(value) => change('autoRegister', value)} label="Automatic registration handshake" /></div>
        <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="primary" loading={saving}><Settings2 className="h-4 w-4" />Save configuration</Button></div>
      </form>
    </Panel>
  );
}

function BotInventory({ bot }) {
  const { toast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/inventory`);
      const raw = result.inventory;
      setInventory(Array.isArray(raw) ? raw : raw?.items || raw?.slots || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [bot.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    try {
      await api(`/bots/${encodeURIComponent(bot.id)}/inventory/refresh`, { method: 'POST', body: '{}' });
      window.setTimeout(load, 600);
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return (
    <Panel className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Live Inventory</h3>
          <p className="mt-1 text-xs text-white/35">{inventory.filter(Boolean).length} occupied slots</p>
        </div>
        <Button size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
      {inventory.length ? (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {inventory.map((item, index) => (
            <div
              key={index}
              title={item?.displayName || item?.name || `Slot ${index}`}
              className={cn(
                'aspect-square min-w-0 rounded-xl border p-2 text-center text-[10px] transition',
                item
                  ? 'border-white/20 bg-white/[0.08] text-white shadow-sm'
                  : 'border-white/[0.06] bg-white/[0.02] text-white/25'
              )}
            >
              <span className="line-clamp-2 break-all">{item ? item.displayName || item.name || item.type || 'item' : index}</span>
              {item && (item.count || item.amount) && (
                <strong className="mt-1 block text-white font-bold">{item.count || item.amount}</strong>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PackageOpen}
          title="No inventory snapshot"
          description="Start the bot, then refresh to request its current inventory."
        />
      )}
    </Panel>
  );
}

function BotModules({ bot }) {
  const { toast } = useToast();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/modules`);
      setModules(result.modules || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [bot.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (module) => {
    try {
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/modules`, {
        method: 'POST',
        body: JSON.stringify({ key: module.key, action: module.running ? 'stop' : 'start' }),
      });
      setModules(result.modules || modules);
      toast(`${module.label || module.key} ${module.running ? 'stopped' : 'started'}`, 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (loading)
    return (
      <Panel className="p-12 flex justify-center">
        <Spinner label="Loading modules" />
      </Panel>
    );

  return (
    <Panel className="overflow-hidden">
      {modules.length ? (
        <div className="divide-y divide-white/[0.06]">
          {modules.map((module) => (
            <div key={module.key} className="flex items-center gap-4 p-5">
              <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white/50">
                <Cpu className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white">{module.label || module.key}</h3>
                <p className="mt-0.5 text-xs text-white/35">{module.describe || module.detail || module.group || 'Bot module'}</p>
                {module.unavailable && <p className="mt-1 text-xs text-white/50">{module.unavailable}</p>}
              </div>
              <button
                role="switch"
                aria-checked={!!module.running}
                disabled={module.readOnly || module.unavailable}
                onClick={() => toggle(module)}
                className={cn(
                  'relative h-6 w-11 rounded-full border transition disabled:opacity-40',
                  module.running ? 'border-white bg-white text-black' : 'border-white/20 bg-white/[0.08]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full transition',
                    module.running ? 'left-[22px] bg-black' : 'left-1 bg-white/60'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Cpu}
          title="No modules reported"
          description="Modules will appear when this bot exposes its runtime catalog."
        />
      )}
    </Panel>
  );
}

function BotScripts({ bot }) {
  const { toast } = useToast();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/scripts`);
      setScripts(result.scripts || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [bot.id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (script, name) => {
    try {
      const result = await api(`/bots/${encodeURIComponent(bot.id)}/scripts/${encodeURIComponent(script.id || script.name)}`, {
        method: 'POST',
        body: JSON.stringify({ action: name }),
      });
      setScripts(result.scripts || []);
      toast(`Script ${name}d`, 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (loading)
    return (
      <Panel className="p-12 flex justify-center">
        <Spinner label="Loading bot scripts" />
      </Panel>
    );

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
        <div>
          <h3 className="font-semibold text-white">Bot Scripts</h3>
          <p className="mt-0.5 text-xs text-white/35">Synced from the owner's script library</p>
        </div>
        <Button size="sm" onClick={() => api(`/bots/${encodeURIComponent(bot.id)}/scripts/reload`, { method: 'POST', body: '{}' }).then(load)}>
          <RefreshCw className="h-3.5 w-3.5" /> Reload
        </Button>
      </div>
      {scripts.length ? (
        <div className="divide-y divide-white/[0.06]">
          {scripts.map((script) => (
            <div key={script.id || script.name} className="flex items-center gap-4 p-5">
              <span className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white/70">
                <FileCode2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-white">{script.name || script.id}</h3>
                <p className="mt-0.5 truncate text-xs text-white/35">{script.description || script.type || script.id}</p>
              </div>
              <Button
                size="sm"
                variant={script.enabled === false ? 'success' : 'secondary'}
                onClick={() => action(script, script.enabled === false ? 'enable' : 'disable')}
              >
                {script.enabled === false ? 'Enable' : 'Disable'}
              </Button>
              <Button size="sm" variant="danger" onClick={() => action(script, 'delete')}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileCode2}
          title="No scripts deployed"
          description="Assign scripts to this bot from the Scripts page."
        />
      )}
    </Panel>
  );
}
