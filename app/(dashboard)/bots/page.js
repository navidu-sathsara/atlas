'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleStop,
  Cpu,
  Dices,
  FileCode2,
  Filter,
  Folder,
  FolderGit2,
  FolderInput,
  Grid2X2,
  Grid3X3,
  KeyRound,
  Layers,
  LayoutGrid,
  Network,
  PackageOpen,
  PanelLeftClose,
  Play,
  PlayCircle,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  StopCircle,
  Terminal,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useDashboard } from '@/components/dashboard-provider';
import { useAuth, useToast } from '@/components/providers';
import { BotConsole } from '@/components/bot-console';
import { BotConsoleTile } from '@/components/bot-console-tile';
import { UsernameStudioModal } from '@/components/username-studio-modal';
import { BatchBotGeneratorModal } from '@/components/batch-bot-generator-modal';
import { Button, Checkbox, EmptyState, Modal, PageHeader, Panel, Spinner, StatusBadge, Switch, Tabs } from '@/components/ui';
import { api, cn } from '@/lib/api';
import { botLabel, categoryOf, formatShards, proxyLabel } from '@/lib/format';

const defaultDeploy = {
  id: '',
  username: '',
  host: 'play.bananasmp.net',
  port: '25565',
  version: '1.20.1',
  auth: 'offline',
  category: 'Uncategorized',
  proxyMode: 'rotate', // 'rotate' | 'specific' | 'direct'
  proxyId: '',
  autoReconnect: true,
  afkMode: true,
  autoAuth: true,
  loginPassword: 'AtlasPass123!',
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
  const [nameStudioOpen, setNameStudioOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [deploy, setDeploy] = useState(defaultDeploy);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState('');
  const [broadcastCmd, setBroadcastCmd] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Multi-Selection & Category Grouping State
  const [selectedBotIds, setSelectedBotIds] = useState([]);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [batchBusy, setBatchBusy] = useState('');
  const [moveCategoryOpen, setMoveCategoryOpen] = useState(false);
  const [targetCategoryInput, setTargetCategoryInput] = useState('');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('bot');
    if (requested) {
      setSelectedId(requested);
    } else if (typeof window !== 'undefined' && window.innerWidth >= 1024 && bots.length) {
      setSelectedId(bots[0].id);
    }
  }, [bots]);

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

  // Group visible bots by category
  const groupedCategories = useMemo(() => {
    const map = {};
    visible.forEach((bot) => {
      const cat = categoryOf(bot) || 'Uncategorized';
      if (!map[cat]) map[cat] = [];
      map[cat].push(bot);
    });
    return Object.entries(map).map(([name, items]) => ({
      name,
      items,
      running: items.filter((b) => b.status === 'running').length,
      offline: items.filter((b) => b.status !== 'running').length,
      totalShards: items.reduce((acc, b) => acc + (b.shards || 0), 0),
    }));
  }, [visible]);

  const selected = bots.find((bot) => bot.id === selectedId) || null;

  const selectBot = (id) => {
    setSelectedId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('bot', id);
    window.history.replaceState({}, '', url);
  };

  const handleBackToFleet = () => {
    setSelectedId('');
    const url = new URL(window.location.href);
    url.searchParams.delete('bot');
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

  // ── Multi-Selection & Batch Operation Handlers ──
  const toggleSelectBot = (id, e) => {
    e?.stopPropagation();
    setSelectedBotIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  const selectAllVisible = () => {
    if (selectedBotIds.length === visible.length) {
      setSelectedBotIds([]);
    } else {
      setSelectedBotIds(visible.map((b) => b.id));
    }
  };

  const toggleSelectCategory = (items, e) => {
    e?.stopPropagation();
    const ids = items.map((b) => b.id);
    const allIn = ids.every((id) => selectedBotIds.includes(id));
    if (allIn) {
      setSelectedBotIds((curr) => curr.filter((id) => !ids.includes(id)));
    } else {
      setSelectedBotIds((curr) => [...new Set([...curr, ...ids])]);
    }
  };

  const toggleCollapseCategory = (catName) => {
    setCollapsedCategories((curr) => ({ ...curr, [catName]: !curr[catName] }));
  };

  const handleBatchAction = async (action) => {
    if (!selectedBotIds.length) return;
    setBatchBusy(action);
    let count = 0;
    try {
      await Promise.all(
        selectedBotIds.map(async (id) => {
          try {
            await api(`/bots/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
            count++;
          } catch (_) {}
        })
      );
      toast(`⚡ ${count} bots ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarting'}!`, 'success');
      window.setTimeout(refreshBots, action === 'restart' ? 3000 : 1000);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBatchBusy('');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedBotIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedBotIds.length} selected bots? This action cannot be undone.`)) return;
    setBatchBusy('delete');
    let count = 0;
    try {
      await Promise.all(
        selectedBotIds.map(async (id) => {
          try {
            await api(`/bots/${encodeURIComponent(id)}`, { method: 'DELETE' });
            count++;
          } catch (_) {}
        })
      );
      toast(`🗑️ Successfully deleted ${count} bots!`, 'success');
      if (selectedBotIds.includes(selectedId)) setSelectedId('');
      setSelectedBotIds([]);
      await refreshBots();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBatchBusy('');
    }
  };

  const handleBatchMoveCategory = async () => {
    const category = String(targetCategoryInput || '').trim();
    if (!selectedBotIds.length || !category) return;
    setBatchBusy('move');
    let count = 0;
    try {
      await Promise.all(
        selectedBotIds.map(async (id) => {
          try {
            await api(`/bots/${encodeURIComponent(id)}/config`, {
              method: 'PATCH',
              body: JSON.stringify({ category }),
            });
            count++;
          } catch (_) {}
        })
      );
      toast(`🏷️ Moved ${count} bots to "${category}"!`, 'success');
      setMoveCategoryOpen(false);
      setTargetCategoryInput('');
      await refreshBots();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBatchBusy('');
    }
  };

  const handleCategoryAction = async (items, action, e) => {
    e?.stopPropagation();
    const ids = items.map((b) => b.id);
    if (!ids.length) return;
    setBusy(`${action}-${items[0]?.id}`);
    let count = 0;
    try {
      await Promise.all(
        ids.map(async (id) => {
          try {
            await api(`/bots/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
            count++;
          } catch (_) {}
        })
      );
      toast(`⚡ ${count} bots in category ${action === 'start' ? 'started' : 'stopped'}!`, 'success');
      window.setTimeout(refreshBots, 1000);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const parsedNames = useMemo(() => {
    return (deploy.username || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [deploy.username]);

  const createBot = async () => {
    setSubmitting(true);
    try {
      const rawNames = parsedNames.length ? parsedNames : [deploy.id || 'bot_1'];

      if (rawNames.length > 1) {
        // Multi-bot deployment with round-robin proxy rotation & auto-auth
        const result = await api('/bots/generate', {
          method: 'POST',
          body: JSON.stringify({
            quantity: rawNames.length,
            customUsernames: rawNames,
            host: deploy.host,
            port: Number(deploy.port) || 25565,
            version: deploy.version,
            auth: deploy.auth,
            category: deploy.category,
            useProxies: deploy.proxyMode === 'rotate' && proxies.length > 0,
            autoRegister: deploy.autoAuth,
            autoLogin: deploy.autoAuth,
            loginPassword: deploy.autoAuth ? deploy.loginPassword : null,
          }),
        });
        toast(`⚡ Successfully deployed ${result.count || rawNames.length} bots with Round-Robin proxy mesh!`, 'success');
      } else {
        // Single bot deployment
        let proxyIdToUse = undefined;
        if (deploy.proxyMode === 'specific' && deploy.proxyId) {
          proxyIdToUse = deploy.proxyId;
        } else if (deploy.proxyMode === 'rotate' && proxies.length > 0) {
          proxyIdToUse = proxies[0].id;
        }

        const result = await api('/bots', {
          method: 'POST',
          body: JSON.stringify({
            id: deploy.id || undefined,
            username: rawNames[0],
            host: deploy.host,
            port: Number(deploy.port) || 25565,
            version: deploy.version,
            auth: deploy.auth,
            category: deploy.category,
            proxyId: proxyIdToUse,
            autoReconnect: deploy.autoReconnect,
            afkMode: deploy.afkMode,
            autoRegister: deploy.autoAuth,
            autoLogin: deploy.autoAuth,
            loginPassword: deploy.autoAuth ? deploy.loginPassword : null,
          }),
        });
        toast(`${botLabel(result.bot)} deployed`, 'success');
        if (result.bot?.id) selectBot(result.bot.id);
      }

      setDeployOpen(false);
      setDeploy(defaultDeploy);
      await refreshBots();
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBroadcast = async (e) => {
    e?.preventDefault();
    const cmd = broadcastCmd.trim();
    const targetBots = selectedBotIds.length > 0
      ? visible.filter((b) => selectedBotIds.includes(b.id))
      : visible;

    if (!cmd || !targetBots.length) return;
    setBroadcasting(true);
    let sent = 0;
    try {
      await Promise.all(
        targetBots.map(async (bot) => {
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
    <div className="space-y-6 relative pb-20">
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
            <Button size="sm" onClick={() => setBatchOpen(true)} className="border-white/20 bg-white/[0.12] text-white hover:bg-white/[0.22] shadow-sm">
              <Zap className="h-3.5 w-3.5 text-white" /> Generate Bots
            </Button>
            <Button size="sm" onClick={() => setNameStudioOpen(true)} className="border-white/15 bg-white/[0.08] text-white">
              <Sparkles className="h-3.5 w-3.5 text-white" /> Name Studio
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

          {/* Quick Filter Chips & Control Buttons */}
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

            {/* Group By Category Toggle */}
            <button
              onClick={() => setGroupByCategory((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95',
                groupByCategory
                  ? 'border-white/30 bg-white/[0.12] text-white shadow-sm'
                  : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white'
              )}
              title="Toggle Category Grouping"
            >
              <Layers className="h-3.5 w-3.5" />
              Categories
            </button>

            {/* Select All Visible Toggle */}
            <button
              onClick={selectAllVisible}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-95',
                selectedBotIds.length > 0
                  ? 'border-white bg-white text-black shadow-sm'
                  : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white'
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectedBotIds.length > 0 ? `${selectedBotIds.length} Selected` : 'Select All'}
            </button>

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

        {/* Global / Selected Broadcast Bar (Visible in Matrix Grid Mode) */}
        {viewMode === 'matrix' && visible.length > 0 && (
          <form
            onSubmit={handleBroadcast}
            className="flex items-center gap-2 rounded-2xl border border-white/[0.09] bg-white/[0.02] p-2 backdrop-blur-xl"
          >
            <Radio className="ml-2 h-4 w-4 shrink-0 text-white/50 animate-pulse" />
            <input
              value={broadcastCmd}
              onChange={(e) => setBroadcastCmd(e.target.value)}
              placeholder={
                selectedBotIds.length > 0
                  ? `Send command to ${selectedBotIds.length} selected bots (e.g. /spawn, /login, !mine)...`
                  : `Broadcast command to all ${visible.length} visible bots...`
              }
              className="min-w-0 flex-1 bg-transparent px-2 py-1 font-mono text-xs text-white placeholder-white/20 outline-none"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              loading={broadcasting}
              disabled={!broadcastCmd.trim()}
            >
              <Send className="h-3 w-3" /> {selectedBotIds.length > 0 ? `Send (${selectedBotIds.length})` : 'Broadcast'}
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
          <Panel className={cn("sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-140px)]", selectedId && "hidden lg:flex")}>
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                  Fleet ({visible.length})
                </span>
                {selectedBotIds.length > 0 && (
                  <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                    {selectedBotIds.length} Selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-white/40 font-mono">
                  {stats.running} live
                </span>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition active:scale-95"
                  title="Select All / None"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="console-scrollbar overflow-y-auto p-2.5 space-y-3">
              {loading ? (
                <Spinner label="Loading bots" />
              ) : visible.length ? (
                groupByCategory ? (
                  // CATEGORY GROUPED ACCORDION VIEW
                  groupedCategories.map((group) => {
                    const isCollapsed = !!collapsedCategories[group.name];
                    const allInCatSelected = group.items.every((b) => selectedBotIds.includes(b.id));

                    return (
                      <div
                        key={group.name}
                        className="rounded-2xl border border-white/[0.08] bg-black/40 overflow-hidden transition-all duration-200"
                      >
                        {/* Category Group Header */}
                        <div
                          onClick={() => toggleCollapseCategory(group.name)}
                          className="flex items-center justify-between gap-2 p-3 bg-white/[0.03] border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox for entire category */}
                            <button
                              type="button"
                              onClick={(e) => toggleSelectCategory(group.items, e)}
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition active:scale-90',
                                allInCatSelected
                                  ? 'border-white bg-white text-black font-bold shadow-sm'
                                  : 'border-white/20 bg-white/[0.04] text-transparent hover:border-white/50'
                              )}
                              title={allInCatSelected ? 'Deselect Category' : 'Select All in Category'}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Folder className="h-3.5 w-3.5 text-white/60 shrink-0" />
                                <strong className="truncate text-xs font-black uppercase tracking-wider text-white">
                                  {group.name}
                                </strong>
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[10px] text-white/50 mt-0.5">
                                <span>{group.running}/{group.items.length} live</span>
                                {group.totalShards > 0 && (
                                  <span>· 💎 {formatShards(group.totalShards)}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Quick Category Action Buttons */}
                            <button
                              type="button"
                              onClick={(e) => handleCategoryAction(group.items, 'start', e)}
                              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition active:scale-95"
                              title="Start All in Category"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCategoryAction(group.items, 'stop', e)}
                              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition active:scale-95"
                              title="Stop All in Category"
                            >
                              <CircleStop className="h-3 w-3" />
                            </button>
                            <div className="p-1 text-white/40">
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Category Bot Items */}
                        {!isCollapsed && (
                          <div className="p-2 space-y-1.5">
                            {group.items.map((bot) => {
                              const isChecked = selectedBotIds.includes(bot.id);
                              return (
                                <div
                                  key={bot.id}
                                  onClick={() => selectBot(bot.id)}
                                  className={cn(
                                    'group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border p-2.5 transition-all duration-150 active:scale-[0.99]',
                                    selectedId === bot.id
                                      ? 'border-white/35 bg-white/[0.12] shadow-sm'
                                      : isChecked
                                      ? 'border-white/25 bg-white/[0.06]'
                                      : 'border-white/[0.05] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                                  )}
                                >
                                  {/* Selection Checkbox */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleSelectBot(bot.id, e)}
                                    className={cn(
                                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition active:scale-90',
                                      isChecked
                                        ? 'border-white bg-white text-black font-bold shadow-sm'
                                        : 'border-white/20 bg-white/[0.04] text-transparent hover:border-white/50'
                                    )}
                                    title={isChecked ? 'Deselect Bot' : 'Select Bot'}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>

                                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                    <div className="relative h-9 w-9 shrink-0">
                                      <img
                                        src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.config?.username || 'MHF_Steve')}/48`}
                                        alt={botLabel(bot)}
                                        className="h-9 w-9 rounded-lg border border-white/15 bg-black/60 object-cover shadow-sm transition group-hover:scale-105"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/48';
                                        }}
                                      />
                                      <span
                                        className={cn(
                                          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-black',
                                          bot.status === 'running'
                                            ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,1)]'
                                            : bot.status === 'error'
                                            ? 'bg-white/50'
                                            : 'bg-white/20'
                                        )}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <strong className="truncate text-xs font-bold text-white">
                                          {bot.config?.username || bot.id}
                                        </strong>
                                      </div>
                                      <p className="truncate font-mono text-[10px] text-white/50">
                                        {bot.id} · {bot.config?.host || 'Direct'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {bot.shards !== null && bot.shards !== undefined && (
                                      <span className="inline-flex items-center gap-0.5 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                                        💎 {formatShards(bot.shards)}
                                      </span>
                                    )}
                                    <StatusBadge status={bot.status} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  // FLAT LIST VIEW
                  visible.map((bot) => {
                    const isChecked = selectedBotIds.includes(bot.id);
                    return (
                      <div
                        key={bot.id}
                        onClick={() => selectBot(bot.id)}
                        className={cn(
                          'group flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-2xl border p-3 transition-all duration-200 active:scale-[0.98]',
                          selectedId === bot.id
                            ? 'border-white/30 bg-white/[0.12] shadow-sm'
                            : isChecked
                            ? 'border-white/25 bg-white/[0.06]'
                            : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleSelectBot(bot.id, e)}
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition active:scale-90',
                            isChecked
                              ? 'border-white bg-white text-black font-bold shadow-sm'
                              : 'border-white/20 bg-white/[0.04] text-transparent hover:border-white/50'
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0">
                            <img
                              src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.config?.username || 'MHF_Steve')}/64`}
                              alt={botLabel(bot)}
                              className="h-10 w-10 rounded-xl border border-white/15 bg-black/60 object-cover shadow-sm transition group-hover:scale-105"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                              }}
                            />
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-black',
                                bot.status === 'running'
                                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]'
                                  : bot.status === 'error'
                                  ? 'bg-white/50'
                                  : 'bg-white/20'
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <strong className="text-sm font-extrabold text-white">
                                {bot.config?.username || bot.id}
                              </strong>
                              <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/60">
                                {bot.id}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-white/60">
                              {categoryOf(bot)} · {bot.config?.host || 'No server'}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {bot.shards !== null && bot.shards !== undefined && (
                            <span
                              className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-sm"
                              title="In-game Shards"
                            >
                              💎 {formatShards(bot.shards)}
                            </span>
                          )}
                          <StatusBadge status={bot.status} />
                          <ChevronRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
                        </div>
                      </div>
                    );
                  })
                )
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
            <div className={cn("min-w-0 space-y-5", !selectedId && "hidden lg:block")}>
              {/* Mobile Back to Fleet Bar */}
              <div className="flex items-center justify-between lg:hidden mb-1">
                <button
                  type="button"
                  onClick={handleBackToFleet}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2.5 text-xs font-bold text-white backdrop-blur-2xl transition active:scale-95 hover:bg-white/15 shadow-sm"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Fleet List
                </button>
                <div className="flex items-center gap-2">
                  {selected.shards !== null && selected.shards !== undefined && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-white">
                      💎 {formatShards(selected.shards)}
                    </span>
                  )}
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              <Panel className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="relative h-16 w-16 shrink-0">
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(selected.config?.username || 'MHF_Steve')}/64`}
                        alt={botLabel(selected)}
                        className="h-16 w-16 rounded-2xl border border-white/20 bg-black/70 object-cover shadow-md"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                        }}
                      />
                      <span
                        className={cn(
                          'absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-black',
                          selected.status === 'running'
                            ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,1)]'
                            : selected.status === 'error'
                            ? 'bg-white/50'
                            : 'bg-white/20'
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="truncate text-2xl font-black text-white">{selected.config?.username || selected.id}</h2>
                        <span className="rounded-lg bg-white/[0.10] px-2 py-0.5 font-mono text-xs font-bold text-white/70">
                          {selected.id}
                        </span>
                        <StatusBadge status={selected.status} />
                        {selected.shards !== null && selected.shards !== undefined && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/15 px-3 py-1 font-mono text-xs font-black text-white shadow-[0_0_12px_rgba(255,255,255,0.25)]">
                            💎 {formatShards(selected.shards)} Shards
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-white/70">
                        <span className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1">
                          {selected.config?.host}:{selected.config?.port || 25565}
                        </span>
                        <span className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1">
                          Version: {selected.config?.version || '1.20.1'} ({selected.config?.auth || 'offline'})
                        </span>
                        <span className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1">
                          Category: {categoryOf(selected)}
                        </span>
                        {selected.ownerLabel && (
                          <span className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1">
                            Owner: {selected.ownerLabel}
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
        title={parsedNames.length > 1 ? `Deploy ${parsedNames.length} Bots` : 'Deploy Bot'}
        description="Deploy single or multiple bots instantly with automated proxy rotation and cracked auto-auth handshakes."
        wide
        footer={
          <>
            <Button onClick={() => setDeployOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createBot} loading={submitting} className="gap-2 px-6">
              <Zap className="h-4 w-4" />
              {parsedNames.length > 1 ? `Deploy ${parsedNames.length} Bots` : 'Deploy Bot'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Username & Studio Row */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Minecraft Username(s)
                </span>
                {parsedNames.length > 1 && (
                  <span className="rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                    ⚡ {parsedNames.length} Bots Batch Mode
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNameStudioOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-white/70 hover:text-white transition active:scale-95"
              >
                <Sparkles className="h-3 w-3" /> Name Studio
              </button>
            </div>
            
            <textarea
              rows={parsedNames.length > 1 ? 3 : 2}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] p-3 font-mono text-xs text-white outline-none focus:border-white placeholder:text-white/30"
              value={deploy.username}
              onChange={(event) => setDeploy({ ...deploy, username: event.target.value })}
              placeholder="e.g. consensus1, OhLlama, notyourllama (or enter one name per line)"
              required
            />

            <p className="text-[11px] text-white/40">
              Tip: Enter multiple usernames separated by commas or lines to deploy multiple bots with automated Round-Robin proxy mapping!
            </p>
          </div>

          {/* Server Config & Auth Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Bot ID (Optional prefix)"
              value={deploy.id}
              onChange={(value) => setDeploy({ ...deploy, id: value })}
              placeholder="Optional, generated automatically"
            />
            <Field
              label="Server host"
              value={deploy.host}
              onChange={(value) => setDeploy({ ...deploy, host: value })}
              placeholder="play.bananasmp.net"
            />
            <Field
              label="Port"
              type="number"
              value={deploy.port}
              onChange={(value) => setDeploy({ ...deploy, port: value })}
              placeholder="25565"
            />
            <Field
              label="Minecraft version"
              value={deploy.version}
              onChange={(value) => setDeploy({ ...deploy, version: value })}
              placeholder="1.20.1"
            />
            <Field
              label="Fleet Category"
              value={deploy.category}
              onChange={(value) => setDeploy({ ...deploy, category: value })}
              placeholder="Fleet Cluster"
            />
            <label>
              <span className="field-label">Account Type</span>
              <select
                className="field-control"
                value={deploy.auth}
                onChange={(event) => setDeploy({ ...deploy, auth: event.target.value })}
              >
                <option value="offline">Offline / Cracked</option>
                <option value="microsoft">Microsoft Account</option>
              </select>
            </label>
          </div>

          {/* Cracked In-Game Auto-Auth Section */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-white/70" />
                <div>
                  <strong className="block text-xs font-bold text-white">
                    Cracked In-Game Auto-Auth
                  </strong>
                  <p className="text-[11px] text-white/50">
                    Auto executes /register or /login when the server prompts for password.
                  </p>
                </div>
              </div>
              <Switch
                checked={deploy.autoAuth}
                onChange={(val) => setDeploy({ ...deploy, autoAuth: val })}
              />
            </div>

            {deploy.autoAuth && (
              <div className="pt-2">
                <label className="mb-1 block text-[11px] font-semibold text-white/50">
                  Shared Bot Password for Authentication
                </label>
                <input
                  type="text"
                  value={deploy.loginPassword}
                  onChange={(e) => setDeploy({ ...deploy, loginPassword: e.target.value })}
                  placeholder="AtlasPass123!"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
                  required={deploy.autoAuth}
                />
              </div>
            )}
          </div>

          {/* Proxy Routing & Rotation Section */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Network className="h-4 w-4 text-white/70" />
                <div>
                  <strong className="block text-xs font-bold text-white">
                    Proxy Routing & Rotation
                  </strong>
                  <p className="text-[11px] text-white/50">
                    Choose how bots connect through your SOCKS5 proxy pool.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { id: 'rotate', label: `🔄 Round-Robin (${proxies.length} Proxies)` },
                { id: 'specific', label: '🎯 Specific Proxy' },
                { id: 'direct', label: '🌐 Direct (No Proxy)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDeploy({ ...deploy, proxyMode: tab.id })}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95',
                    deploy.proxyMode === tab.id
                      ? 'bg-white text-black shadow-sm'
                      : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {deploy.proxyMode === 'rotate' && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white/70">
                {proxies.length > 0 ? (
                  <p className="text-[11px] text-white/60">
                    🟢 Evenly cycles through {proxies.length} available proxies (1➔P#1, 2➔P#2 ... {proxies.length + 1}➔P#1).
                  </p>
                ) : (
                  <p className="text-[11px] text-white/40">
                    ⚠️ No proxies available in your pool. Direct connections will be used.
                  </p>
                )}
              </div>
            )}

            {deploy.proxyMode === 'specific' && (
              <div className="pt-2">
                <label className="mb-1 block text-[11px] font-semibold text-white/50">Select Proxy</label>
                <select
                  className="field-control"
                  value={deploy.proxyId}
                  onChange={(event) => setDeploy({ ...deploy, proxyId: event.target.value })}
                >
                  <option value="">Choose a proxy...</option>
                  {proxies.map((proxy) => (
                    <option key={proxy.id} value={proxy.id}>
                      {proxyLabel(proxy)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Reconnect & AFK toggles */}
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
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

      {/* Atlas Name Studio & Mojang Checker Modal */}
      <UsernameStudioModal
        open={nameStudioOpen}
        onClose={() => setNameStudioOpen(false)}
        onSelectUsername={(name) => {
          setDeploy((d) => ({ ...d, username: name }));
          setDeployOpen(true);
        }}
      />

      {/* Mass Bot Generator & Orchestrator Modal */}
      <BatchBotGeneratorModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        onGenerated={() => refreshBots()}
      />

      {/* ─── FLOATING BATCH ACTIONS TOOLBAR (DOCKED) ─── */}
      {selectedBotIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-white/20 bg-black/85 p-2 sm:px-4 sm:py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl max-w-[95vw] overflow-x-auto">
            <div className="flex items-center gap-2 pr-2 sm:pr-3 border-r border-white/15 shrink-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-black font-black text-xs shadow-sm">
                {selectedBotIds.length}
              </span>
              <span className="text-xs font-bold text-white hidden md:inline">Bots Selected</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Batch Start */}
              <button
                type="button"
                onClick={() => handleBatchAction('start')}
                disabled={!!batchBusy}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.18] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Start ({selectedBotIds.length})</span>
              </button>

              {/* Batch Stop */}
              <button
                type="button"
                onClick={() => handleBatchAction('stop')}
                disabled={!!batchBusy}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.18] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <CircleStop className="h-3.5 w-3.5" />
                <span>Stop ({selectedBotIds.length})</span>
              </button>

              {/* Batch Restart */}
              <button
                type="button"
                onClick={() => handleBatchAction('restart')}
                disabled={!!batchBusy}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.18] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart</span>
              </button>

              {/* Batch Move Category */}
              <button
                type="button"
                onClick={() => {
                  setTargetCategoryInput('');
                  setMoveCategoryOpen(true);
                }}
                disabled={!!batchBusy}
                className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.18] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
              >
                <FolderInput className="h-3.5 w-3.5" />
                <span>Category</span>
              </button>

              {/* Batch Delete */}
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={!!batchBusy}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white text-black hover:bg-white/90 px-3 py-1.5 text-xs font-extrabold transition active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </div>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedBotIds([])}
              className="p-1.5 text-white/40 hover:text-white rounded-lg transition active:scale-90 shrink-0"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Move Category Modal */}
      <Modal
        open={moveCategoryOpen}
        onClose={() => setMoveCategoryOpen(false)}
        title={`Move ${selectedBotIds.length} Bots to Category`}
        description="Select an existing category or enter a new category name."
        actions={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setMoveCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBatchMoveCategory}
              disabled={!targetCategoryInput.trim() || !!batchBusy}
              loading={batchBusy === 'move'}
            >
              Apply Category
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Existing Category Chips */}
          {categories.filter((c) => c !== 'all').length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/50">
                Existing Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c !== 'all')
                  .map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTargetCategoryInput(cat)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95',
                        targetCategoryInput === cat
                          ? 'border-white bg-white text-black font-bold shadow-sm'
                          : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/25 hover:text-white'
                      )}
                    >
                      📁 {cat}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Target Category Input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/50">
              Target Category Name
            </label>
            <input
              type="text"
              value={targetCategoryInput}
              onChange={(e) => setTargetCategoryInput(e.target.value)}
              placeholder="e.g. Farming, Lobby, Defense, Mining Fleet..."
              className="field-control"
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
