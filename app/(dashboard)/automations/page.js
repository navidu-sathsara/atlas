'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlay,
  CircleStop,
  Clock3,
  Copy,
  Cpu,
  Eye,
  FileCode2,
  Folder,
  Layers,
  MessageSquare,
  Network,
  PanelLeftClose,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { api, cn } from '@/lib/api';
import { useDashboard } from '@/components/dashboard-provider';
import { useToast } from '@/components/providers';
import {
  Button,
  Checkbox,
  EmptyState,
  Modal,
  PageHeader,
  Panel,
  StatusBadge,
  Switch,
} from '@/components/ui';

// Scratch Block Definitions
const BLOCK_CATALOG = [
  {
    type: 'action_command',
    category: 'action',
    label: 'Send In-Game Command',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: Terminal,
    desc: 'Executes a slash or panel command (e.g. /home, /pay, /warp, /sell)',
    defaultParams: { command: '/balance' },
  },
  {
    type: 'action_chat',
    category: 'action',
    label: 'Send Chat Message',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: MessageSquare,
    desc: 'Broadcasts a regular text message to server chat',
    defaultParams: { message: 'Hello from Atlas fleet!' },
  },
  {
    type: 'control_wait',
    category: 'control',
    label: 'Wait / Delay',
    color: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    icon: Clock3,
    desc: 'Pauses the execution sequence before running the next step',
    defaultParams: { ms: 1500 },
  },
  {
    type: 'action_slot',
    category: 'action',
    label: 'Select Hotbar Slot',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: Layers,
    desc: 'Switches the bot active hand to hotbar slot (0 - 8)',
    defaultParams: { slot: 0 },
  },
  {
    type: 'action_jump',
    category: 'action',
    label: 'Jump Action',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: ArrowUp,
    desc: 'Makes the bot jump once to avoid AFK kick checks',
    defaultParams: {},
  },
  {
    type: 'action_look',
    category: 'action',
    label: 'Rotate Camera View',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: RotateCcw,
    desc: 'Rotates bot pitch/yaw angle randomly or in a set direction',
    defaultParams: { direction: 'random' },
  },
  {
    type: 'action_drop',
    category: 'action',
    label: 'Drop Inventory Item',
    color: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    icon: ArrowDown,
    desc: 'Throws held or specified item onto the ground',
    defaultParams: { item: '' },
  },
  {
    type: 'action_module',
    category: 'module',
    label: 'Trigger Fleet Module',
    color: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    icon: Cpu,
    desc: 'Starts or stops built-in automation routines like BoxPVP Miner or Inventory Cleaner',
    defaultParams: { module: 'boxpvp', action: 'start' },
  },
  {
    type: 'condition_if',
    category: 'logic',
    label: 'Condition Check (If)',
    color: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
    icon: Settings2,
    desc: 'Validates a message or state condition before proceeding',
    defaultParams: { field: 'chat', operator: 'contains', value: 'success' },
  },
  {
    type: 'notification_webhook',
    category: 'notification',
    label: 'Discord Webhook Alert',
    color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    icon: Send,
    desc: 'Sends a formatted embed or alert to your Discord channel',
    defaultParams: {
      webhookUrl: '',
      content: 'Atlas bot automation executed successfully.',
    },
  },
  {
    type: 'notification_log',
    category: 'notification',
    label: 'Write Console Log',
    color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    icon: FileCode2,
    desc: 'Prints an informative audit note to the bot runtime log stream',
    defaultParams: { message: 'Routine check completed.' },
  },
];

// Presets
const WORKFLOW_PRESETS = [
  {
    name: 'Auto-Auth & BoxPVP Miner Routine',
    category: 'Mining',
    description: 'On connect, automatically logins, navigates to BoxPVP server and starts auto-mining iron.',
    targetMode: 'category',
    targetCategory: 'Mining',
    trigger: {
      type: 'on_spawn',
      params: {},
    },
    blocks: [
      {
        id: 'b1',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 1.5s after Spawn',
        params: { ms: 1500 },
      },
      {
        id: 'b2',
        type: 'action_command',
        category: 'action',
        label: 'Login with Password',
        params: { command: '/login AtlasPass123!' },
      },
      {
        id: 'b3',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 2s for Hub Load',
        params: { ms: 2000 },
      },
      {
        id: 'b4',
        type: 'action_command',
        category: 'action',
        label: 'Connect to BoxPVP Server',
        params: { command: '/server boxpvp' },
      },
      {
        id: 'b5',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 3s for World Spawn',
        params: { ms: 3000 },
      },
      {
        id: 'b6',
        type: 'action_module',
        category: 'module',
        label: 'Start BoxPVP Miner Routine',
        params: { module: 'boxpvp', action: 'start' },
      },
    ],
  },
  {
    name: 'Anti-AFK & Shard Balance Ticker',
    category: 'AFK',
    description: 'Periodically jumps, turns camera, and queries in-game balance to prevent timeout kicks.',
    targetMode: 'all',
    trigger: {
      type: 'interval',
      params: { intervalSec: 45 },
    },
    blocks: [
      {
        id: 'b1',
        type: 'action_jump',
        category: 'action',
        label: 'Anti-AFK Jump',
        params: {},
      },
      {
        id: 'b2',
        type: 'action_look',
        category: 'action',
        label: 'Random Look Rotation',
        params: { direction: 'random' },
      },
      {
        id: 'b3',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 500ms',
        params: { ms: 500 },
      },
      {
        id: 'b4',
        type: 'action_command',
        category: 'action',
        label: 'Query In-game Balance',
        params: { command: '/balance' },
      },
    ],
  },
  {
    name: 'Inventory Full Auto-Seller',
    category: 'Economy',
    description: 'When inventory fills up, warps to server shop, sells all items, and returns to mine.',
    targetMode: 'all',
    trigger: {
      type: 'on_inventory_full',
      params: {},
    },
    blocks: [
      {
        id: 'b1',
        type: 'action_command',
        category: 'action',
        label: 'Warp to Shop',
        params: { command: '/warp shop' },
      },
      {
        id: 'b2',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 1.5s',
        params: { ms: 1500 },
      },
      {
        id: 'b3',
        type: 'action_command',
        category: 'action',
        label: 'Sell All Inventory',
        params: { command: '/sell all' },
      },
      {
        id: 'b4',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 2s',
        params: { ms: 2000 },
      },
      {
        id: 'b5',
        type: 'action_command',
        category: 'action',
        label: 'Return to Mine Area',
        params: { command: '/warp mine' },
      },
      {
        id: 'b6',
        type: 'action_module',
        category: 'module',
        label: 'Resume Miner',
        params: { module: 'boxpvp', action: 'start' },
      },
    ],
  },
  {
    name: 'Emergency Low-HP Safe Retreat',
    category: 'Combat',
    description: 'When health falls below threshold, immediately teleports home and switches to food/apple.',
    targetMode: 'all',
    trigger: {
      type: 'on_health_low',
      params: { healthThreshold: 8 },
    },
    blocks: [
      {
        id: 'b1',
        type: 'action_command',
        category: 'action',
        label: 'Emergency Warp Home',
        params: { command: '/home safe' },
      },
      {
        id: 'b2',
        type: 'action_slot',
        category: 'action',
        label: 'Switch to Golden Apple Slot',
        params: { slot: 0 },
      },
      {
        id: 'b3',
        type: 'notification_log',
        category: 'notification',
        label: 'Log Health Alarm',
        params: { message: 'Low health triggered safe retreat.' },
      },
    ],
  },
  {
    name: 'Payment Forwarder & Discord Ping',
    category: 'Economy',
    description: 'When in-game chat indicates a payment received, forward funds to master account and send Discord alert.',
    targetMode: 'all',
    trigger: {
      type: 'on_chat',
      params: { pattern: 'has sent you', matchType: 'contains' },
    },
    blocks: [
      {
        id: 'b1',
        type: 'control_wait',
        category: 'control',
        label: 'Wait 1s',
        params: { ms: 1000 },
      },
      {
        id: 'b2',
        type: 'action_command',
        category: 'action',
        label: 'Forward to Master Account',
        params: { command: '/pay Admin 1000' },
      },
      {
        id: 'b3',
        type: 'notification_webhook',
        category: 'notification',
        label: 'Notify Discord',
        params: { webhookUrl: '', content: 'Bot received payment and forwarded to Master.' },
      },
    ],
  },
];

const blankWorkflow = {
  name: 'New Custom Automation',
  category: 'General',
  description: '',
  enabled: true,
  targetMode: 'all',
  targetCategory: '',
  targetBotIds: [],
  trigger: {
    type: 'on_spawn',
    params: { intervalSec: 60, pattern: '', matchType: 'contains', healthThreshold: 10 },
  },
  blocks: [
    {
      id: 'b_init_1',
      type: 'control_wait',
      category: 'control',
      label: 'Wait 1.0s',
      params: { ms: 1000 },
    },
    {
      id: 'b_init_2',
      type: 'action_command',
      category: 'action',
      label: 'Send In-Game Command',
      params: { command: '/balance' },
    },
  ],
};

export default function AutomationsPage() {
  const { bots } = useDashboard();
  const { toast } = useToast();

  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Studio state
  const [studioOpen, setStudioOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blankWorkflow);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState('');

  // Simulator state
  const [simLogs, setSimLogs] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [simBotId, setSimBotId] = useState('');

  // Presets modal
  const [presetsOpen, setPresetsOpen] = useState(false);

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/automations');
      setAutomations(res.automations || []);
    } catch (err) {
      toast(err.message || 'Failed to load automations', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const filteredAutomations = useMemo(() => {
    return automations.filter((a) => {
      if (selectedFilter === 'active' && !a.enabled) return false;
      if (selectedFilter === 'interval' && a.trigger?.type !== 'interval') return false;
      if (selectedFilter === 'event' && a.trigger?.type === 'interval') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (a.name || '').toLowerCase().includes(q);
        const matchDesc = (a.description || '').toLowerCase().includes(q);
        const matchCat = (a.category || '').toLowerCase().includes(q);
        const matchBlock = (a.blocks || []).some(
          (b) =>
            (b.params?.command || '').toLowerCase().includes(q) ||
            (b.label || '').toLowerCase().includes(q)
        );
        return matchName || matchDesc || matchCat || matchBlock;
      }
      return true;
    });
  }, [automations, selectedFilter, searchQuery]);

  const openStudio = (auto = null) => {
    if (auto) {
      setEditingId(auto.id);
      setDraft(JSON.parse(JSON.stringify(auto)));
    } else {
      setEditingId(null);
      setDraft(JSON.parse(JSON.stringify(blankWorkflow)));
    }
    setSimLogs([]);
    setStudioOpen(true);
  };

  const saveWorkflow = async () => {
    if (!draft.name?.trim()) {
      toast('Please provide a name for this automation', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api(`/automations/${encodeURIComponent(editingId)}`, {
          method: 'PATCH',
          body: JSON.stringify(draft),
        });
        toast('Automation workflow updated', 'success');
      } else {
        await api('/automations', {
          method: 'POST',
          body: JSON.stringify(draft),
        });
        toast('New automation workflow created', 'success');
      }
      setStudioOpen(false);
      await loadAutomations();
    } catch (err) {
      toast(err.message || 'Failed to save automation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkflow = async (auto, e) => {
    e?.stopPropagation();
    try {
      await api(`/automations/${encodeURIComponent(auto.id)}/toggle`, {
        method: 'POST',
      });
      toast(`Workflow ${auto.enabled ? 'paused' : 'activated'}`, 'success');
      await loadAutomations();
    } catch (err) {
      toast(err.message || 'Failed to toggle automation', 'error');
    }
  };

  const deleteWorkflow = async (auto, e) => {
    e?.stopPropagation();
    if (!window.confirm(`Delete workflow "${auto.name}"?`)) return;
    try {
      await api(`/automations/${encodeURIComponent(auto.id)}`, {
        method: 'DELETE',
      });
      toast('Workflow deleted', 'success');
      await loadAutomations();
    } catch (err) {
      toast(err.message || 'Failed to delete automation', 'error');
    }
  };

  const runWorkflow = async (auto, e) => {
    e?.stopPropagation();
    setRunningId(auto.id);
    try {
      const res = await api(`/automations/${encodeURIComponent(auto.id)}/run`, {
        method: 'POST',
      });
      toast(`Triggered workflow on ${res.count || 1} bots`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to execute workflow', 'error');
    } finally {
      setRunningId('');
    }
  };

  const runSimulationTest = async () => {
    const targetBot = simBotId || bots[0]?.id;
    if (!targetBot) {
      toast('No bots online to test against.', 'error');
      return;
    }
    setSimulating(true);
    setSimLogs([`[sim] Initializing sequence test on ${targetBot}...`]);
    try {
      await api(`/bots/${encodeURIComponent(targetBot)}/cmd`, {
        method: 'POST',
        body: JSON.stringify({ cmd: '!ping' }),
      });
      setSimLogs((prev) => [...prev, `[sim] Bot ping acknowledged. Executing ${draft.blocks.length} blocks sequentially...`]);

      for (let i = 0; i < draft.blocks.length; i++) {
        const blk = draft.blocks[i];
        await new Promise((r) => setTimeout(r, 600));
        setSimLogs((prev) => [
          ...prev,
          `[step ${i + 1}] ${blk.label} -> ${JSON.stringify(blk.params)}`,
        ]);
      }
      setSimLogs((prev) => [...prev, '[sim] Sequence simulation completed with 0 errors.']);
      toast('Test run finished', 'success');
    } catch (err) {
      setSimLogs((prev) => [...prev, `[sim error] ${err.message}`]);
      toast(err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  const addBlockToDraft = (blockDef) => {
    const newBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: blockDef.type,
      category: blockDef.category,
      label: blockDef.label,
      params: { ...blockDef.defaultParams },
    };
    setDraft((d) => ({ ...d, blocks: [...d.blocks, newBlock] }));
  };

  const removeBlock = (index) => {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.filter((_, i) => i !== index),
    }));
  };

  const moveBlock = (index, dir) => {
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= draft.blocks.length) return;
    const updated = [...draft.blocks];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);
    setDraft((d) => ({ ...d, blocks: updated }));
  };

  const duplicateBlock = (index) => {
    const original = draft.blocks[index];
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [...draft.blocks];
    updated.splice(index + 1, 0, clone);
    setDraft((d) => ({ ...d, blocks: updated }));
  };

  const updateBlockParam = (index, paramKey, val) => {
    setDraft((d) => {
      const updated = [...d.blocks];
      updated[index] = {
        ...updated[index],
        params: { ...updated[index].params, [paramKey]: val },
      };
      return { ...d, blocks: updated };
    });
  };

  const loadPreset = (preset) => {
    setDraft({
      ...JSON.parse(JSON.stringify(preset)),
      id: undefined,
      enabled: true,
    });
    setEditingId(null);
    setPresetsOpen(false);
    setStudioOpen(true);
    toast(`Loaded preset "${preset.name}"`, 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow Engine"
        title="Automations"
        description="Construct visual, block-based bot routines, reactive event triggers, interval loops, and cross-cluster command pipelines."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPresetsOpen(true)}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Preset Library
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => openStudio()}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> New Automation
            </Button>
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Total Flows</span>
            <div className="text-2xl font-black text-white">{automations.length}</div>
          </div>
          <Workflow className="h-5 w-5 text-white/40" />
        </Panel>
        <Panel className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Active Flows</span>
            <div className="text-2xl font-black text-white">
              {automations.filter((a) => a.enabled).length}
            </div>
          </div>
          <Zap className="h-5 w-5 text-white/40" />
        </Panel>
        <Panel className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Interval Ticks</span>
            <div className="text-2xl font-black text-white">
              {automations.filter((a) => a.trigger?.type === 'interval' && a.enabled).length}
            </div>
          </div>
          <Clock3 className="h-5 w-5 text-white/40" />
        </Panel>
        <Panel className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Online Fleet</span>
            <div className="text-2xl font-black text-white">
              {bots.filter((b) => b.status === 'running').length} / {bots.length}
            </div>
          </div>
          <Bot className="h-5 w-5 text-white/40" />
        </Panel>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflows by name, trigger, command..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {[
            { id: 'all', label: `All (${automations.length})` },
            { id: 'active', label: `Active (${automations.filter((a) => a.enabled).length})` },
            { id: 'interval', label: 'Intervals' },
            { id: 'event', label: 'Events' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition active:scale-95',
                selectedFilter === tab.id
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows Grid */}
      {filteredAutomations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAutomations.map((auto) => {
            const isInterval = auto.trigger?.type === 'interval';
            const triggerLabel = isInterval
              ? `Every ${auto.trigger?.params?.intervalSec || 60}s`
              : auto.trigger?.type === 'on_spawn'
              ? 'On Bot Connect'
              : auto.trigger?.type === 'on_chat'
              ? `Chat: "${auto.trigger?.params?.pattern || ''}"`
              : auto.trigger?.type === 'on_health_low'
              ? `Health < ${auto.trigger?.params?.healthThreshold || 10}`
              : auto.trigger?.type === 'on_inventory_full'
              ? 'Inventory Full'
              : 'Manual Trigger';

            return (
              <Panel
                key={auto.id}
                className="group relative flex flex-col justify-between p-5 transition hover:border-white/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-sm">
                      {isInterval ? (
                        <Clock3 className="h-3.5 w-3.5 text-white/80" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-white/80" />
                      )}
                      <span>{triggerLabel}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-white/40">
                        {auto.category || 'General'}
                      </span>
                      <Switch
                        checked={auto.enabled}
                        onChange={(e) => toggleWorkflow(auto, e)}
                      />
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <h3 className="text-base font-extrabold text-white tracking-tight">
                      {auto.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/50">
                      {auto.description || 'Custom sequential bot workflow.'}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60">
                      <Users className="h-3.5 w-3.5 text-white/40" />
                      {auto.targetMode === 'all'
                        ? 'All Bots Scope'
                        : auto.targetMode === 'category'
                        ? `Category: ${auto.targetCategory}`
                        : `${(auto.targetBotIds || []).length} Specific Bots`}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/50 p-3 space-y-1.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/40">
                      Block Chain ({auto.blocks?.length || 0} Steps)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden">
                      {(auto.blocks || []).slice(0, 4).map((blk, idx) => (
                        <span
                          key={blk.id || idx}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/80"
                        >
                          <span className="text-white/40">#{idx + 1}</span>
                          <span className="truncate max-w-[110px]">{blk.label}</span>
                        </span>
                      ))}
                      {(auto.blocks || []).length > 4 && (
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/40">
                          +{(auto.blocks || []).length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => runWorkflow(auto, e)}
                    loading={runningId === auto.id}
                    className="gap-1.5 text-xs font-bold"
                  >
                    <Play className="h-3 w-3" /> Run Now
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openStudio(auto)}
                      className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition active:scale-95"
                      title="Edit in Visual Studio"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => deleteWorkflow(auto, e)}
                      className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition active:scale-95"
                      title="Delete Workflow"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Workflow}
          title="No automations found"
          description={
            searchQuery
              ? 'Try changing your search query or filter.'
              : 'Create your first Scratch-style visual automation workflow to begin.'
          }
          action={
            <Button variant="primary" onClick={() => openStudio()}>
              <Plus className="h-4 w-4" /> Create Workflow
            </Button>
          }
        />
      )}

      {/* Studio Modal */}
      <Modal
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        title={editingId ? 'Edit Automation Workflow' : 'Visual Scratch Studio'}
        description="Construct reactive bot routines using Scratch-inspired puzzle blocks and interactive parameters."
        size="4xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={runSimulationTest}
                loading={simulating}
                className="gap-1.5 text-xs font-bold"
              >
                <CirclePlay className="h-3.5 w-3.5" /> Test Run
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setStudioOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveWorkflow}
                loading={saving}
                className="gap-2 px-6 font-bold"
              >
                <Check className="h-4 w-4" /> Save Workflow
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/15 bg-white/[0.02] p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/50">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. AFK Shard Farmer"
                  className="field-control"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/50">
                  Category
                </label>
                <input
                  type="text"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="e.g. Mining, Economy, AFK"
                  className="field-control"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-white/50">
                  Target Fleet Scope
                </label>
                <select
                  value={draft.targetMode}
                  onChange={(e) => setDraft({ ...draft, targetMode: e.target.value })}
                  className="field-control"
                >
                  <option value="all">All Managed Bots</option>
                  <option value="category">Fleet Category</option>
                  <option value="bots">Specific Selected Bots</option>
                </select>
              </div>
            </div>

            {draft.targetMode === 'category' && (
              <div className="pt-2 border-t border-white/[0.06]">
                <label className="mb-1.5 block text-xs font-semibold text-white/60">
                  Target Category Name
                </label>
                <input
                  type="text"
                  value={draft.targetCategory}
                  onChange={(e) => setDraft({ ...draft, targetCategory: e.target.value })}
                  placeholder="e.g. Mining"
                  className="field-control max-w-sm"
                />
              </div>
            )}

            {draft.targetMode === 'bots' && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <label className="block text-xs font-semibold text-white/60">
                  Select Target Bots ({draft.targetBotIds.length} Selected)
                </label>
                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto console-scrollbar">
                  {bots.map((b) => {
                    const selected = draft.targetBotIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          const updated = selected
                            ? draft.targetBotIds.filter((id) => id !== b.id)
                            : [...draft.targetBotIds, b.id];
                          setDraft({ ...draft, targetBotIds: updated });
                        }}
                        className={cn(
                          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono transition',
                          selected
                            ? 'border-white bg-white text-black font-bold shadow-sm'
                            : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white'
                        )}
                      >
                        <span>{b.config?.username || b.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-white/12 bg-black/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-white">
                  <Boxes className="h-4 w-4 text-white/70" /> Block Palette
                </div>
                <p className="text-[11px] text-white/45">
                  Click any block below to append it to your visual execution stack.
                </p>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 console-scrollbar">
                  {BLOCK_CATALOG.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => addBlockToDraft(item)}
                        className="group flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left transition hover:border-white/25 hover:bg-white/[0.08] active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                            <IconComp className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <strong className="block truncate text-xs font-bold text-white">
                              {item.label}
                            </strong>
                            <span className="block truncate text-[10px] text-white/40">
                              {item.desc}
                            </span>
                          </div>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-white/30 group-hover:text-white transition" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {simLogs.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/90 p-3 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-white/50 border-b border-white/10 pb-1.5">
                    <span className="font-bold uppercase tracking-wider">Test Simulator</span>
                    <button
                      type="button"
                      onClick={() => setSimLogs([])}
                      className="text-[10px] hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 console-scrollbar text-white/80">
                    {simLogs.map((l, i) => (
                      <div key={i} className="leading-tight">{l}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-white/15 bg-black/40 p-4 sm:p-5 space-y-4">
                <div className="relative rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-4 shadow-md space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <strong className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                        When Trigger Occurs (Event Hat)
                      </strong>
                    </div>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                      Starting Hat
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-white/60">
                        Trigger Type
                      </label>
                      <select
                        value={draft.trigger?.type}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            trigger: { ...draft.trigger, type: e.target.value },
                          })
                        }
                        className="field-control text-xs"
                      >
                        <option value="on_spawn">When Bot Connects / Spawns</option>
                        <option value="interval">Every X Seconds (Interval Loop)</option>
                        <option value="on_chat">On Chat Message Matches Pattern</option>
                        <option value="on_health_low">When Health Drops Below Threshold</option>
                        <option value="on_inventory_full">When Inventory is Full</option>
                        <option value="manual">Manual / Instant Execution Only</option>
                      </select>
                    </div>

                    {draft.trigger?.type === 'interval' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-white/60">
                          Interval Duration (Seconds)
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="3600"
                          value={draft.trigger?.params?.intervalSec || 60}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              trigger: {
                                ...draft.trigger,
                                params: {
                                  ...draft.trigger?.params,
                                  intervalSec: parseInt(e.target.value) || 60,
                                },
                              },
                            })
                          }
                          className="field-control text-xs"
                        />
                      </div>
                    )}

                    {draft.trigger?.type === 'on_chat' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-white/60">
                          Match Text Pattern
                        </label>
                        <input
                          type="text"
                          value={draft.trigger?.params?.pattern || ''}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              trigger: {
                                ...draft.trigger,
                                params: {
                                  ...draft.trigger?.params,
                                  pattern: e.target.value,
                                },
                              },
                            })
                          }
                          placeholder="e.g. login with /login, payed you"
                          className="field-control text-xs"
                        />
                      </div>
                    )}

                    {draft.trigger?.type === 'on_health_low' && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-white/60">
                          Health Threshold (0 - 20)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={draft.trigger?.params?.healthThreshold || 8}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              trigger: {
                                ...draft.trigger,
                                params: {
                                  ...draft.trigger?.params,
                                  healthThreshold: parseInt(e.target.value) || 8,
                                },
                              },
                            })
                          }
                          className="field-control text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center -my-2">
                  <div className="h-4 w-1 bg-white/20 rounded-full" />
                </div>

                <div className="space-y-3">
                  {draft.blocks.map((block, idx) => {
                    const blockDef = BLOCK_CATALOG.find((b) => b.type === block.type);
                    const IconComp = blockDef?.icon || Terminal;

                    return (
                      <div
                        key={block.id || idx}
                        className={cn(
                          'group relative rounded-2xl border p-4 transition-all duration-200 shadow-sm space-y-3',
                          blockDef?.color || 'bg-white/[0.04] border-white/10'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-black font-mono text-[10px] font-black">
                              {idx + 1}
                            </span>
                            <IconComp className="h-3.5 w-3.5 text-white" />
                            <strong className="truncate text-xs font-bold text-white">
                              {block.label}
                            </strong>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, -1)}
                              disabled={idx === 0}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                              title="Move Up"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(idx, 1)}
                              disabled={idx === draft.blocks.length - 1}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition disabled:opacity-20"
                              title="Move Down"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateBlock(idx)}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition"
                              title="Duplicate Block"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(idx)}
                              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white transition"
                              title="Remove Block"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {block.type === 'action_command' && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                Command Line
                              </label>
                              <input
                                type="text"
                                value={block.params?.command || ''}
                                onChange={(e) => updateBlockParam(idx, 'command', e.target.value)}
                                placeholder="e.g. /home safe, /pay Admin 500"
                                className="field-control font-mono text-xs"
                              />
                            </div>
                          )}

                          {block.type === 'action_chat' && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                Chat Message
                              </label>
                              <input
                                type="text"
                                value={block.params?.message || ''}
                                onChange={(e) => updateBlockParam(idx, 'message', e.target.value)}
                                placeholder="e.g. Hello everyone!"
                                className="field-control text-xs"
                              />
                            </div>
                          )}

                          {block.type === 'control_wait' && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                Delay Duration (ms)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="50"
                                  max="60000"
                                  step="100"
                                  value={block.params?.ms || 1000}
                                  onChange={(e) =>
                                    updateBlockParam(idx, 'ms', parseInt(e.target.value) || 1000)
                                  }
                                  className="field-control font-mono text-xs"
                                />
                                <span className="font-mono text-xs text-white/40 shrink-0">
                                  {((block.params?.ms || 1000) / 1000).toFixed(1)}s
                                </span>
                              </div>
                            </div>
                          )}

                          {block.type === 'action_slot' && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                Hotbar Slot Number (0 - 8)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="8"
                                value={block.params?.slot || 0}
                                onChange={(e) =>
                                  updateBlockParam(idx, 'slot', parseInt(e.target.value) || 0)
                                }
                                className="field-control font-mono text-xs"
                              />
                            </div>
                          )}

                          {block.type === 'action_look' && (
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                View Direction
                              </label>
                              <select
                                value={block.params?.direction || 'random'}
                                onChange={(e) => updateBlockParam(idx, 'direction', e.target.value)}
                                className="field-control text-xs"
                              >
                                <option value="random">Random View Angle</option>
                                <option value="north">North (0°)</option>
                                <option value="south">South (180°)</option>
                                <option value="east">East (90°)</option>
                                <option value="west">West (270°)</option>
                              </select>
                            </div>
                          )}

                          {block.type === 'action_module' && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                  Module Name
                                </label>
                                <select
                                  value={block.params?.module || 'boxpvp'}
                                  onChange={(e) => updateBlockParam(idx, 'module', e.target.value)}
                                  className="field-control text-xs"
                                >
                                  <option value="boxpvp">BoxPVP Miner</option>
                                  <option value="cleaner">Inventory Cleaner</option>
                                  <option value="candledropper">PV Candle Dropper</option>
                                  <option value="bonecollector">Bone Collector</option>
                                  <option value="tpkiller">TP Killer</option>
                                  <option value="mineandsell">Auto Mine & Sell</option>
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                  Action
                                </label>
                                <select
                                  value={block.params?.action || 'start'}
                                  onChange={(e) => updateBlockParam(idx, 'action', e.target.value)}
                                  className="field-control text-xs"
                                >
                                  <option value="start">Start Routine</option>
                                  <option value="stop">Stop Routine</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {block.type === 'notification_webhook' && (
                            <div className="space-y-2">
                              <div>
                                <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                  Discord Webhook URL
                                </label>
                                <input
                                  type="url"
                                  value={block.params?.webhookUrl || ''}
                                  onChange={(e) =>
                                    updateBlockParam(idx, 'webhookUrl', e.target.value)
                                  }
                                  placeholder="https://discord.com/api/webhooks/..."
                                  className="field-control text-xs"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-semibold text-white/60">
                                  Message Content
                                </label>
                                <input
                                  type="text"
                                  value={block.params?.content || ''}
                                  onChange={(e) =>
                                    updateBlockParam(idx, 'content', e.target.value)
                                  }
                                  placeholder="Notification alert text"
                                  className="field-control text-xs"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => addBlockToDraft(BLOCK_CATALOG[0])}
                    className="w-full justify-center gap-1.5 border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" /> Append Action Block
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Preset Library Modal */}
      <Modal
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        title="Automation Preset Library"
        description="Select any pre-configured automation template to load into the Scratch visual studio."
        size="lg"
      >
        <div className="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto pr-1 console-scrollbar">
          {WORKFLOW_PRESETS.map((preset, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/25 hover:bg-white/[0.05]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {preset.category}
                  </span>
                  <span className="text-[10px] font-mono text-white/40">
                    {preset.blocks.length} Blocks
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-extrabold text-white">{preset.name}</h4>
                <p className="mt-1 text-xs text-white/50 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-white/[0.06] flex items-center justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => loadPreset(preset)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Sparkles className="h-3 w-3" /> Load Preset
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
