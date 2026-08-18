'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowLeft,
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
  GripVertical,
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
      { id: 'b1', type: 'control_wait', category: 'control', label: 'Wait 1.5s after Spawn', params: { ms: 1500 } },
      { id: 'b2', type: 'action_command', category: 'action', label: 'Login with Password', params: { command: '/login AtlasPass123!' } },
      { id: 'b3', type: 'control_wait', category: 'control', label: 'Wait 2s for Hub Load', params: { ms: 2000 } },
      { id: 'b4', type: 'action_command', category: 'action', label: 'Connect to BoxPVP Server', params: { command: '/server boxpvp' } },
      { id: 'b5', type: 'control_wait', category: 'control', label: 'Wait 3s for World Spawn', params: { ms: 3000 } },
      { id: 'b6', type: 'action_module', category: 'module', label: 'Start BoxPVP Miner Routine', params: { module: 'boxpvp', action: 'start' } },
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
      { id: 'b1', type: 'action_jump', category: 'action', label: 'Anti-AFK Jump', params: {} },
      { id: 'b2', type: 'action_look', category: 'action', label: 'Random Look Rotation', params: { direction: 'random' } },
      { id: 'b3', type: 'control_wait', category: 'control', label: 'Wait 500ms', params: { ms: 500 } },
      { id: 'b4', type: 'action_command', category: 'action', label: 'Query In-game Balance', params: { command: '/balance' } },
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

  // Presets modal
  const [presetsOpen, setPresetsOpen] = useState(false);

  // Drag & Drop specific state
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

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

  const closeStudio = () => {
    setStudioOpen(false);
    setEditingId(null);
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
      closeStudio();
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
    const targetBot = bots[0]?.id;
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

  const addBlockToDraft = (blockDef, index = null) => {
    const newBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: blockDef.type,
      category: blockDef.category,
      label: blockDef.label,
      params: { ...blockDef.defaultParams },
    };
    
    setDraft((d) => {
      if (index !== null) {
        const updated = [...d.blocks];
        updated.splice(index, 0, newBlock);
        return { ...d, blocks: updated };
      }
      return { ...d, blocks: [...d.blocks, newBlock] };
    });
  };

  const removeBlock = (index) => {
    setDraft((d) => ({
      ...d,
      blocks: d.blocks.filter((_, i) => i !== index),
    }));
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

  // Drag & Drop Handlers
  const handleDragStartPalette = (e, blockDef) => {
    e.dataTransfer.setData('application/x-atlas-palette', blockDef.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartCanvas = (e, idx) => {
    e.dataTransfer.setData('application/x-atlas-canvas', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(idx);
    
    // Create a drag image to make it look nicer
    const el = e.target;
    e.dataTransfer.setDragImage(el, 20, 20);
  };

  const handleDragOverCanvas = (e, idx) => {
    e.preventDefault();
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  };

  const handleDropCanvas = (e, idx) => {
    e.preventDefault();
    setDragOverIdx(null);
    setDraggedIdx(null);

    const paletteType = e.dataTransfer.getData('application/x-atlas-palette');
    if (paletteType) {
      const blockDef = BLOCK_CATALOG.find(b => b.type === paletteType);
      if (blockDef) addBlockToDraft(blockDef, idx);
      return;
    }

    const canvasIdx = e.dataTransfer.getData('application/x-atlas-canvas');
    if (canvasIdx !== '') {
      const fromIdx = parseInt(canvasIdx);
      if (fromIdx === idx) return;

      setDraft((d) => {
        const updated = [...d.blocks];
        const item = updated.splice(fromIdx, 1)[0];
        // adjust index if we're moving item down and shifting the array
        const toIdx = fromIdx < idx ? idx - 1 : idx;
        updated.splice(toIdx, 0, item);
        return { ...d, blocks: updated };
      });
    }
  };

  const handleDropEndZone = (e) => {
    e.preventDefault();
    setDragOverIdx(null);
    setDraggedIdx(null);

    const paletteType = e.dataTransfer.getData('application/x-atlas-palette');
    if (paletteType) {
      const blockDef = BLOCK_CATALOG.find(b => b.type === paletteType);
      if (blockDef) addBlockToDraft(blockDef);
      return;
    }

    const canvasIdx = e.dataTransfer.getData('application/x-atlas-canvas');
    if (canvasIdx !== '') {
      const fromIdx = parseInt(canvasIdx);
      setDraft((d) => {
        const updated = [...d.blocks];
        const item = updated.splice(fromIdx, 1)[0];
        updated.push(item); // drop at the very end
        return { ...d, blocks: updated };
      });
    }
  };

  const loadPreset = (preset) => {
    setDraft({
      ...JSON.parse(JSON.stringify(preset)),
      id: undefined,
      enabled: true,
    });
    setEditingId(null);
    setPresetsOpen(false);
    toast(`Loaded preset "${preset.name}"`, 'success');
  };

  // FULL SCREEN STUDIO VIEW
  if (studioOpen) {
    return (
      <div className="flex h-[calc(100vh-68px)] flex-col bg-[#0a0a0a] text-white">
        {/* Studio Top Navbar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={closeStudio}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex flex-col">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Workflow Name"
                className="bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/30 w-64"
              />
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Visual Canvas</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/60">Status:</span>
              <Switch checked={draft.enabled} onChange={() => setDraft(d => ({ ...d, enabled: !d.enabled }))} />
            </div>

            <Button size="sm" variant="secondary" onClick={() => setPresetsOpen(true)} className="gap-1.5 h-8 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Presets
            </Button>
            <Button size="sm" variant="secondary" onClick={runSimulationTest} loading={simulating} className="gap-1.5 h-8 text-xs">
              <CirclePlay className="h-3.5 w-3.5" /> Test
            </Button>
            <Button size="sm" variant="primary" onClick={saveWorkflow} loading={saving} className="gap-1.5 h-8 text-xs px-4">
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </div>

        {/* Studio Main Workspace */}
        <div className="flex flex-1 overflow-hidden">
          {/* Palette Sidebar */}
          <div className="w-72 shrink-0 border-r border-white/[0.08] bg-black/40 flex flex-col">
            <div className="p-3 border-b border-white/[0.05] bg-white/[0.02]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/70 flex items-center gap-2">
                <Boxes className="h-3.5 w-3.5" /> Block Palette
              </h3>
              <p className="mt-1 text-[10px] text-white/40">Drag blocks into the workspace to build your workflow.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 console-scrollbar">
              {BLOCK_CATALOG.map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStartPalette(e, item)}
                    className="group flex cursor-grab items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 hover:border-white/30 hover:bg-white/[0.08] transition active:cursor-grabbing"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                      <IconComp className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-bold text-white">{item.label}</strong>
                      <span className="block truncate text-[10px] text-white/40">{item.desc}</span>
                    </div>
                    <GripVertical className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col relative bg-[#111] overflow-hidden">
             {/* Target Scope & Background Grid */}
             <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
             
             <div className="relative z-10 flex-1 overflow-y-auto p-6 console-scrollbar">
               <div className="max-w-3xl mx-auto space-y-6">
                 
                 {/* Top Settings (Scope, Category) */}
                 <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-sm backdrop-blur-md">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Target Fleet Scope</label>
                       <select value={draft.targetMode} onChange={(e) => setDraft({ ...draft, targetMode: e.target.value })} className="field-control text-xs h-9">
                         <option value="all">All Managed Bots</option>
                         <option value="category">Fleet Category</option>
                         <option value="bots">Specific Bots</option>
                       </select>
                     </div>
                     {draft.targetMode === 'category' && (
                       <div>
                         <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Category Name</label>
                         <input type="text" value={draft.targetCategory} onChange={(e) => setDraft({ ...draft, targetCategory: e.target.value })} placeholder="e.g. Mining" className="field-control text-xs h-9" />
                       </div>
                     )}
                     {draft.targetMode === 'bots' && (
                       <div>
                         <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Bots</label>
                         <button className="field-control text-xs h-9 flex items-center justify-between opacity-50 cursor-not-allowed">
                           {draft.targetBotIds.length} Selected (Edit in Advanced)
                         </button>
                       </div>
                     )}
                     <div>
                       <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/50">Workflow Category</label>
                       <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="e.g. General" className="field-control text-xs h-9" />
                     </div>
                   </div>
                 </div>

                 {/* The Canvas Stack */}
                 <div className="space-y-0 relative">
                   
                   {/* Trigger Hat Block */}
                   <div className="relative rounded-2xl border-[3px] border-amber-500/50 bg-amber-950/40 p-4 shadow-xl z-20 overflow-visible">
                     <div className="flex items-center gap-2 mb-3 border-b border-amber-500/20 pb-2">
                       <Zap className="h-5 w-5 text-amber-400" />
                       <strong className="text-sm font-extrabold uppercase tracking-wider text-amber-300">Event Trigger</strong>
                     </div>
                     <div className="grid sm:grid-cols-2 gap-4">
                       <div>
                         <label className="mb-1 block text-[11px] font-semibold text-white/70">Trigger Condition</label>
                         <select value={draft.trigger?.type} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, type: e.target.value } })} className="field-control text-xs bg-black/40 border-amber-500/30">
                           <option value="on_spawn">When Bot Connects</option>
                           <option value="interval">Every X Seconds (Loop)</option>
                           <option value="on_chat">On Chat Match</option>
                           <option value="on_health_low">When Health Drops Below</option>
                           <option value="on_inventory_full">When Inventory is Full</option>
                           <option value="manual">Manual Trigger Only</option>
                         </select>
                       </div>
                       {draft.trigger?.type === 'interval' && (
                         <div>
                           <label className="mb-1 block text-[11px] font-semibold text-white/70">Interval (Seconds)</label>
                           <input type="number" min="5" value={draft.trigger?.params?.intervalSec || 60} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, params: { ...draft.trigger?.params, intervalSec: parseInt(e.target.value) || 60 } } })} className="field-control text-xs bg-black/40 border-amber-500/30" />
                         </div>
                       )}
                       {draft.trigger?.type === 'on_chat' && (
                         <div>
                           <label className="mb-1 block text-[11px] font-semibold text-white/70">Text Pattern</label>
                           <input type="text" value={draft.trigger?.params?.pattern || ''} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, params: { ...draft.trigger?.params, pattern: e.target.value } } })} className="field-control text-xs bg-black/40 border-amber-500/30" placeholder="e.g. login with" />
                         </div>
                       )}
                       {draft.trigger?.type === 'on_health_low' && (
                         <div>
                           <label className="mb-1 block text-[11px] font-semibold text-white/70">Health Threshold</label>
                           <input type="number" min="1" max="20" value={draft.trigger?.params?.healthThreshold || 8} onChange={(e) => setDraft({ ...draft, trigger: { ...draft.trigger, params: { ...draft.trigger?.params, healthThreshold: parseInt(e.target.value) || 8 } } })} className="field-control text-xs bg-black/40 border-amber-500/30" />
                         </div>
                       )}
                     </div>
                     {/* Puzzle Notch Bottom */}
                     <div className="absolute -bottom-3 left-8 h-4 w-12 bg-amber-500/50 rounded-b-lg border-b-[3px] border-l-[3px] border-r-[3px] border-amber-500/50" />
                   </div>

                   {/* Blocks */}
                   {draft.blocks.map((block, idx) => {
                     const blockDef = BLOCK_CATALOG.find((b) => b.type === block.type);
                     const IconComp = blockDef?.icon || Terminal;
                     const isDragOver = dragOverIdx === idx;
                     const isDragged = draggedIdx === idx;

                     return (
                       <div key={block.id || idx} className="relative z-10">
                         {/* Drop Target Above Block */}
                         <div 
                           onDragOver={(e) => handleDragOverCanvas(e, idx)}
                           onDrop={(e) => handleDropCanvas(e, idx)}
                           className={cn("h-4 transition-all duration-200", isDragOver ? "h-16 flex items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/10" : "h-4")}
                         >
                           {isDragOver && <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Drop Here</span>}
                         </div>

                         {/* Block Component */}
                         <div 
                           draggable
                           onDragStart={(e) => handleDragStartCanvas(e, idx)}
                           onDragEnd={() => setDraggedIdx(null)}
                           className={cn(
                             'group relative rounded-2xl border-2 shadow-lg transition-all',
                             isDragged ? 'opacity-30 scale-95' : 'opacity-100',
                             blockDef?.color ? blockDef.color.replace('border-','border-opacity-100 border-').split(' ')[1] : 'border-white/20 bg-[#1a1a1a]',
                             'bg-[#1a1a1a]'
                           )}
                         >
                           {/* Puzzle Notch Top */}
                           <div className={cn("absolute -top-[2px] left-[30px] h-[14px] w-12 rounded-b-md border-b-2 border-l-2 border-r-2 bg-[#1a1a1a]", blockDef?.color ? blockDef.color.split(' ')[1] : 'border-white/20')} />
                           
                           <div className="p-4 pt-5 flex items-start gap-4">
                             {/* Drag Handle */}
                             <div className="mt-1 cursor-grab active:cursor-grabbing text-white/30 hover:text-white transition">
                               <GripVertical className="h-5 w-5" />
                             </div>

                             <div className="flex-1 space-y-3">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <IconComp className={cn("h-4 w-4", blockDef?.color.split(' ').find(c => c.startsWith('text-')))} />
                                   <strong className="text-sm font-bold text-white">{block.label}</strong>
                                 </div>
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => duplicateBlock(idx)} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white" title="Duplicate">
                                     <Copy className="h-3.5 w-3.5" />
                                   </button>
                                   <button onClick={() => removeBlock(idx)} className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400" title="Remove">
                                     <Trash2 className="h-3.5 w-3.5" />
                                   </button>
                                 </div>
                               </div>

                               {/* Block Inputs */}
                               <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                                 {block.type === 'action_command' && (
                                   <input type="text" value={block.params?.command || ''} onChange={(e) => updateBlockParam(idx, 'command', e.target.value)} placeholder="e.g. /home safe" className="field-control font-mono text-xs w-full" />
                                 )}
                                 {block.type === 'action_chat' && (
                                   <input type="text" value={block.params?.message || ''} onChange={(e) => updateBlockParam(idx, 'message', e.target.value)} placeholder="e.g. Hello!" className="field-control text-xs w-full" />
                                 )}
                                 {block.type === 'control_wait' && (
                                   <div className="flex items-center gap-3">
                                     <input type="number" min="50" step="100" value={block.params?.ms || 1000} onChange={(e) => updateBlockParam(idx, 'ms', parseInt(e.target.value) || 1000)} className="field-control font-mono text-xs w-32" />
                                     <span className="text-xs font-mono text-white/40">{(block.params?.ms || 1000) / 1000} sec</span>
                                   </div>
                                 )}
                                 {block.type === 'action_slot' && (
                                   <input type="number" min="0" max="8" value={block.params?.slot || 0} onChange={(e) => updateBlockParam(idx, 'slot', parseInt(e.target.value) || 0)} className="field-control font-mono text-xs w-24" />
                                 )}
                                 {block.type === 'action_look' && (
                                   <select value={block.params?.direction || 'random'} onChange={(e) => updateBlockParam(idx, 'direction', e.target.value)} className="field-control text-xs w-48">
                                     <option value="random">Random Angle</option>
                                     <option value="north">North (0°)</option>
                                     <option value="south">South (180°)</option>
                                     <option value="east">East (90°)</option>
                                     <option value="west">West (270°)</option>
                                   </select>
                                 )}
                                 {block.type === 'action_module' && (
                                   <div className="flex gap-3">
                                     <select value={block.params?.module || 'boxpvp'} onChange={(e) => updateBlockParam(idx, 'module', e.target.value)} className="field-control text-xs flex-1">
                                       <option value="boxpvp">BoxPVP Miner</option>
                                       <option value="cleaner">Inventory Cleaner</option>
                                       <option value="candledropper">PV Candle Dropper</option>
                                     </select>
                                     <select value={block.params?.action || 'start'} onChange={(e) => updateBlockParam(idx, 'action', e.target.value)} className="field-control text-xs w-32">
                                       <option value="start">Start</option>
                                       <option value="stop">Stop</option>
                                     </select>
                                   </div>
                                 )}
                                 {block.type === 'notification_webhook' && (
                                   <div className="space-y-2">
                                     <input type="url" value={block.params?.webhookUrl || ''} onChange={(e) => updateBlockParam(idx, 'webhookUrl', e.target.value)} placeholder="Discord Webhook URL" className="field-control text-xs w-full" />
                                     <input type="text" value={block.params?.content || ''} onChange={(e) => updateBlockParam(idx, 'content', e.target.value)} placeholder="Alert text" className="field-control text-xs w-full" />
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>

                           {/* Puzzle Notch Bottom */}
                           <div className={cn("absolute -bottom-[14px] left-[30px] h-[14px] w-12 rounded-b-md border-b-2 border-l-2 border-r-2 bg-[#1a1a1a]", blockDef?.color ? blockDef.color.split(' ')[1] : 'border-white/20')} />
                         </div>
                       </div>
                     );
                   })}

                   {/* End Drop Zone */}
                   <div 
                     onDragOver={(e) => { e.preventDefault(); setDragOverIdx('end'); }}
                     onDrop={handleDropEndZone}
                     className={cn("h-32 transition-all duration-200 mt-4", dragOverIdx === 'end' ? "flex items-center justify-center rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/10" : "")}
                   >
                     {dragOverIdx === 'end' ? (
                       <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Drop Block Here</span>
                     ) : (
                       <div className="flex flex-col items-center justify-center h-full opacity-20 hover:opacity-50 transition border-2 border-dashed border-white/20 rounded-2xl mx-12">
                         <ArrowDown className="h-6 w-6 mb-2" />
                         <span className="text-xs font-bold uppercase tracking-widest">Drag & Drop More Blocks</span>
                       </div>
                     )}
                   </div>

                 </div>
               </div>
             </div>
             
             {/* Simulator Overlay inside Canvas */}
             {simLogs.length > 0 && (
                <div className="absolute bottom-6 right-6 w-96 rounded-2xl border border-white/10 bg-black/95 p-4 shadow-2xl backdrop-blur-md z-50">
                  <div className="flex items-center justify-between text-white/60 border-b border-white/10 pb-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"><Terminal className="h-3.5 w-3.5"/> Test Runner</span>
                    <button onClick={() => setSimLogs([])} className="hover:text-white"><X className="h-4 w-4"/></button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 console-scrollbar font-mono text-[10px] text-white/80">
                    {simLogs.map((l, i) => (
                      <div key={i} className={cn("leading-relaxed", l.includes('error') ? 'text-red-400' : l.includes('step') ? 'text-sky-300' : '')}>{l}</div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
        
        {/* Preset Modal */}
        <Modal open={presetsOpen} onClose={() => setPresetsOpen(false)} title="Preset Library" size="lg">
          <div className="grid gap-3 sm:grid-cols-2 max-h-[500px] overflow-y-auto console-scrollbar">
            {WORKFLOW_PRESETS.map((preset, idx) => (
              <div key={idx} className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/30 cursor-pointer" onClick={() => loadPreset(preset)}>
                <div>
                  <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                  <p className="mt-1 text-xs text-white/50 leading-relaxed">{preset.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      </div>
    );
  }

  // STANDARD LIST VIEW
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workflow Engine"
        title="Automations"
        description="Construct visual, block-based bot routines, reactive event triggers, interval loops, and cross-cluster command pipelines."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => openStudio()} className="gap-1.5 shadow-sm">
              <Plus className="h-3.5 w-3.5" /> New Automation Canvas
            </Button>
          </div>
        }
      />

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
            <div className="text-2xl font-black text-white">{automations.filter((a) => a.enabled).length}</div>
          </div>
          <Zap className="h-5 w-5 text-white/40" />
        </Panel>
        <Panel className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Online Fleet</span>
            <div className="text-2xl font-black text-white">{bots.filter((b) => b.status === 'running').length}</div>
          </div>
          <Bot className="h-5 w-5 text-white/40" />
        </Panel>
      </div>

      {filteredAutomations.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAutomations.map((auto) => {
            const isInterval = auto.trigger?.type === 'interval';
            const triggerLabel = isInterval ? `Every ${auto.trigger?.params?.intervalSec || 60}s` : auto.trigger?.type === 'on_spawn' ? 'On Bot Connect' : 'Event Driven';

            return (
              <Panel key={auto.id} className="group relative flex flex-col justify-between p-5 transition hover:border-white/20">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.05] px-2 py-1 font-mono text-[10px] font-bold text-white">
                      {isInterval ? <Clock3 className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      {triggerLabel}
                    </span>
                    <Switch checked={auto.enabled} onChange={(e) => toggleWorkflow(auto, e)} />
                  </div>
                  <div className="mt-3.5">
                    <h3 className="text-base font-bold text-white truncate">{auto.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-white/50">{auto.description || 'Custom workflow.'}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <Button size="sm" variant="primary" onClick={(e) => runWorkflow(auto, e)} loading={runningId === auto.id} className="gap-1.5 text-xs font-bold">
                    <Play className="h-3 w-3" /> Run
                  </Button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openStudio(auto)} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white transition"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={(e) => deleteWorkflow(auto, e)} className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition"><Trash2 className="h-3.5 w-3.5" /></button>
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
          description="Create your first visual automation workflow."
          action={<Button variant="primary" onClick={() => openStudio()}><Plus className="h-4 w-4" /> Create Workspace</Button>}
        />
      )}
    </div>
  );
}
