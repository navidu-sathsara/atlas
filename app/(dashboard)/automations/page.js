'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Blocks, Bot, Box, Check, ChevronDown, ChevronRight, CirclePlay, Clock3,
  Copy, Cpu, Flag, GripVertical, MessageSquare, MousePointer2, Play, Plus,
  Radio, Save, Search, Send, Settings2, Sparkles, Square, Terminal,
  Trash2, Webhook, Workflow, X, Zap,
} from 'lucide-react';
import { api, cn } from '@/lib/api';
import { useDashboard } from '@/components/dashboard-provider';
import { useToast } from '@/components/providers';
import { Button, EmptyState, Modal, PageHeader, Panel, StatusBadge, Switch } from '@/components/ui';
import { botLabel, categoryOf } from '@/lib/format';

const COLORS = {
  events: { solid: '#f4f4f5', dark: '#a1a1aa', soft: 'rgba(255,255,255,.10)', label: 'Events' },
  motion: { solid: '#52525b', dark: '#27272a', soft: 'rgba(255,255,255,.055)', label: 'Actions' },
  looks: { solid: '#71717a', dark: '#3f3f46', soft: 'rgba(255,255,255,.065)', label: 'Messages' },
  control: { solid: '#3f3f46', dark: '#18181b', soft: 'rgba(255,255,255,.045)', label: 'Control' },
  sensing: { solid: '#63636b', dark: '#303036', soft: 'rgba(255,255,255,.06)', label: 'Sensing' },
  modules: { solid: '#57575d', dark: '#29292d', soft: 'rgba(255,255,255,.055)', label: 'Modules' },
  output: { solid: '#737378', dark: '#3f3f43', soft: 'rgba(255,255,255,.07)', label: 'Output' },
};

const BLOCKS = [
  { type: 'action_command', category: 'motion', label: 'run command', icon: Terminal, params: { command: '/home' } },
  { type: 'action_chat', category: 'looks', label: 'say message', icon: MessageSquare, params: { message: 'Hello!' } },
  { type: 'action_jump', category: 'motion', label: 'jump once', icon: Zap, params: {} },
  { type: 'action_look', category: 'motion', label: 'look', icon: MousePointer2, params: { direction: 'random' } },
  { type: 'action_slot', category: 'motion', label: 'select hotbar slot', icon: Box, params: { slot: 0 } },
  { type: 'action_drop', category: 'motion', label: 'drop item', icon: Box, params: { item: '' } },
  { type: 'control_wait', category: 'control', label: 'wait', icon: Clock3, params: { ms: 1000 } },
  { type: 'condition_if', category: 'sensing', label: 'continue if', icon: Settings2, params: { field: 'chat', operator: 'contains', value: 'success' } },
  { type: 'action_module', category: 'modules', label: 'set module', icon: Cpu, params: { module: 'invCleaner', action: 'start' } },
  { type: 'notification_log', category: 'output', label: 'write log', icon: Terminal, params: { message: 'Automation completed' } },
  { type: 'notification_webhook', category: 'output', label: 'send webhook', icon: Webhook, params: { webhookUrl: '', content: 'Automation completed' } },
];

const TRIGGERS = [
  ['manual', 'when run is clicked'],
  ['on_spawn', 'when bot connects'],
  ['interval', 'every interval'],
  ['on_chat', 'when chat matches'],
  ['on_whisper', 'when whisper matches'],
  ['on_health_low', 'when health is low'],
  ['on_death', 'when bot dies'],
  ['on_inventory_full', 'when inventory is full'],
  ['on_shards_gain', 'when shards increase'],
];

const MODULES = [
  ['boneCollector', 'Bone Collector'], ['boneDropper', 'Bone Dropper'],
  ['mineAndSell', 'Mine & Sell'], ['pvCandleDropper', 'PV Candle Dropper'],
  ['tpKiller', 'TP Killer'], ['crystalTrap', 'Crystal Trap'],
  ['fight', 'Fight'], ['boxPvpMiner', 'BoxPVP Miner'], ['follower', 'Follower'],
  ['goTo', 'Go To'], ['autoHome', 'Auto Home'], ['invCleaner', 'Inventory Cleaner'],
  ['rewardChecker', 'Reward Checker'], ['chatGames', 'Chat Games'], ['antiStuck', 'Anti Stuck'],
];

const PRESETS = [
  {
    name: 'Safe AFK heartbeat', category: 'AFK', description: 'Moves lightly and checks balance every 45 seconds.',
    trigger: { type: 'interval', params: { intervalSec: 45 } }, targetMode: 'all', targetCategory: '', targetBotIds: [], enabled: true,
    blocks: [
      ['action_jump', {}], ['control_wait', { ms: 500 }], ['action_look', { direction: 'random' }],
      ['action_command', { command: '/balance' }], ['notification_log', { message: 'AFK heartbeat complete' }],
    ],
  },
  {
    name: 'Spawn sequence', category: 'Lifecycle', description: 'Waits for the world, enters BoxPVP, then starts the miner module.',
    trigger: { type: 'on_spawn', params: {} }, targetMode: 'all', targetCategory: '', targetBotIds: [], enabled: true,
    blocks: [
      ['control_wait', { ms: 2500 }], ['action_command', { command: '/server boxpvp' }],
      ['control_wait', { ms: 3000 }], ['action_command', { command: '!boxpvp on obsidian' }],
    ],
  },
  {
    name: 'Inventory rescue', category: 'Economy', description: 'Cleans inventory as soon as it becomes full.',
    trigger: { type: 'on_inventory_full', params: {} }, targetMode: 'all', targetCategory: '', targetBotIds: [], enabled: true,
    blocks: [
      ['notification_log', { message: 'Inventory full — starting cleaner' }],
      ['action_module', { module: 'invCleaner', action: 'start' }],
    ],
  },
];

function id() { return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function definition(type) { return BLOCKS.find((block) => block.type === type) || BLOCKS[0]; }
function makeBlock(type, params) {
  const def = definition(type);
  return { id: id(), type: def.type, category: def.category, label: def.label, params: { ...def.params, ...(params || {}) } };
}
function blankWorkflow() {
  return {
    name: 'Untitled program', category: 'General', description: '', enabled: true,
    targetMode: 'all', targetCategory: '', targetBotIds: [],
    trigger: { type: 'manual', params: { intervalSec: 60, pattern: '', matchType: 'contains', healthThreshold: 10 } },
    blocks: [makeBlock('control_wait', { ms: 1000 })],
  };
}
function presetWorkflow(preset) {
  return { ...clone(preset), blocks: preset.blocks.map(([type, params]) => makeBlock(type, params)) };
}
function triggerLabel(trigger) { return TRIGGERS.find(([value]) => value === trigger?.type)?.[1] || 'when run is clicked'; }

export default function AutomationsPage() {
  const { bots } = useDashboard();
  const { toast } = useToast();
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [studio, setStudio] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blankWorkflow);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [category, setCategory] = useState('motion');
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [presets, setPresets] = useState(false);
  const [logs, setLogs] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAutomations((await api('/automations')).automations || []); }
    catch (error) { toast(error.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => [...new Set(bots.map(categoryOf))].sort(), [bots]);
  const filtered = useMemo(() => automations.filter((automation) => {
    if (filter === 'active' && !automation.enabled) return false;
    if (filter === 'event' && automation.trigger?.type === 'interval') return false;
    if (filter === 'timer' && automation.trigger?.type !== 'interval') return false;
    const text = `${automation.name} ${automation.description} ${automation.category}`.toLowerCase();
    return !query.trim() || text.includes(query.trim().toLowerCase());
  }), [automations, filter, query]);

  const stats = useMemo(() => ({
    total: automations.length,
    active: automations.filter((automation) => automation.enabled).length,
    blocks: automations.reduce((sum, automation) => sum + (automation.blocks?.length || 0), 0),
    targets: bots.filter((bot) => bot.status === 'running').length,
  }), [automations, bots]);

  const openStudio = (automation) => {
    const next = automation ? clone(automation) : blankWorkflow();
    next.blocks = (next.blocks || []).map((block) => ({ ...block, category: definition(block.type).category }));
    setDraft(next); setEditingId(automation?.id || null); setSelectedBlock(next.blocks[0]?.id || null);
    setLogs([]); setStudio(true);
  };
  const closeStudio = () => { setStudio(false); setSelectedBlock(null); };
  const save = async () => {
    if (!draft.name.trim()) return toast('Give this program a name.', 'error');
    if (!draft.blocks.length) return toast('Add at least one block.', 'error');
    setSaving(true);
    try {
      await api(editingId ? `/automations/${encodeURIComponent(editingId)}` : '/automations', {
        method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(draft),
      });
      toast(editingId ? 'Program saved' : 'Program created', 'success');
      closeStudio(); await load();
    } catch (error) { toast(error.message, 'error'); }
    finally { setSaving(false); }
  };
  const run = async (automation, event) => {
    event?.stopPropagation(); setRunningId(automation.id);
    try {
      const result = await api(`/automations/${encodeURIComponent(automation.id)}/run`, { method: 'POST' });
      toast(`Program delivered to ${result.count} bot${result.count === 1 ? '' : 's'}`, 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { setRunningId(''); }
  };
  const toggle = async (automation, event) => {
    event?.stopPropagation();
    try { await api(`/automations/${encodeURIComponent(automation.id)}/toggle`, { method: 'POST' }); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };
  const remove = async (automation, event) => {
    event?.stopPropagation();
    if (!window.confirm(`Delete “${automation.name}”?`)) return;
    try { await api(`/automations/${encodeURIComponent(automation.id)}`, { method: 'DELETE' }); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const addBlock = (type, at) => {
    const block = makeBlock(type);
    setDraft((current) => {
      const blocks = [...current.blocks]; blocks.splice(at ?? blocks.length, 0, block);
      return { ...current, blocks };
    });
    setSelectedBlock(block.id);
  };
  const patchBlock = (blockId, params) => setDraft((current) => ({
    ...current,
    blocks: current.blocks.map((block) => block.id === blockId ? { ...block, params: { ...block.params, ...params } } : block),
  }));
  const deleteBlock = (blockId) => setDraft((current) => {
    const blocks = current.blocks.filter((block) => block.id !== blockId);
    setSelectedBlock(blocks[0]?.id || null); return { ...current, blocks };
  });
  const duplicateBlock = (block) => setDraft((current) => {
    const index = current.blocks.findIndex((item) => item.id === block.id);
    const copy = { ...clone(block), id: id() };
    const blocks = [...current.blocks]; blocks.splice(index + 1, 0, copy); setSelectedBlock(copy.id);
    return { ...current, blocks };
  });
  const drop = (event, at) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('native/palette');
    const fromValue = event.dataTransfer.getData('native/canvas');
    if (type) addBlock(type, at);
    else if (fromValue !== '') {
      const from = Number(fromValue);
      setDraft((current) => {
        const blocks = [...current.blocks]; const [block] = blocks.splice(from, 1);
        const target = from < at ? at - 1 : at; blocks.splice(target, 0, block); return { ...current, blocks };
      });
    }
    setDragIndex(null); setDropIndex(null);
  };
  const dryRun = () => {
    const next = [`[ready] ${triggerLabel(draft.trigger)}`, `[scope] ${targetDescription(draft, bots)}`];
    draft.blocks.forEach((block, index) => next.push(`[${String(index + 1).padStart(2, '0')}] ${blockSummary(block)}`));
    next.push(`[done] ${draft.blocks.length} blocks validated`); setLogs(next);
  };

  if (studio) return (
    <ScratchStudio
      draft={draft} setDraft={setDraft} bots={bots} categories={categories} selectedBlock={selectedBlock}
      setSelectedBlock={setSelectedBlock} paletteCategory={category} setPaletteCategory={setCategory}
      addBlock={addBlock} patchBlock={patchBlock} deleteBlock={deleteBlock} duplicateBlock={duplicateBlock}
      dragIndex={dragIndex} setDragIndex={setDragIndex} dropIndex={dropIndex} setDropIndex={setDropIndex} drop={drop}
      logs={logs} dryRun={dryRun} close={closeStudio} save={save} saving={saving} openPresets={() => setPresets(true)}
      presetsOpen={presets} closePresets={() => setPresets(false)} loadPreset={(preset) => {
        const next = presetWorkflow(preset); setDraft(next); setEditingId(null); setSelectedBlock(next.blocks[0]?.id || null); setPresets(false);
      }}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Visual automation" title="Programs" description="Build fleet behavior from real event, control, sensing, and action blocks."
        actions={<div className="flex gap-2"><Button onClick={() => setPresets(true)}><Sparkles className="h-4 w-4" /> Templates</Button><Button variant="primary" onClick={() => openStudio()}><Plus className="h-4 w-4" /> New program</Button></div>} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Programs', stats.total, Workflow], ['Running', stats.active, Radio], ['Blocks', stats.blocks, Blocks], ['Online targets', stats.targets, Bot]].map(([label, value, Icon]) => (
          <div key={label} className="rounded-[18px] border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-white/45"><span className="text-xs font-bold uppercase tracking-[.14em]">{label}</span><Icon className="h-4 w-4" /></div>
            <div className="mt-3 font-mono text-3xl font-bold tracking-tight text-white">{value}</div>
          </div>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" /><input className="field-control pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programs" /></div>
          <div className="flex rounded-xl border border-white/[0.08] bg-black/30 p-1">
            {['all', 'active', 'event', 'timer'].map((value) => <button key={value} onClick={() => setFilter(value)} className={cn('rounded-lg px-3.5 py-2 text-[13px] font-semibold capitalize', filter === value ? 'bg-white text-black' : 'text-white/50 hover:text-white')}>{value}</button>)}
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-white/35">Loading programs…</div> : filtered.length === 0 ? (
          <EmptyState icon={Blocks} title="No programs here" description="Start with a template or snap together your first workflow." action={<Button variant="primary" onClick={() => openStudio()}>Open block editor</Button>} />
        ) : <div className="grid gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">{filtered.map((automation) => (
          <article key={automation.id} role="button" tabIndex={0} onClick={() => openStudio(automation)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openStudio(automation); }} className="group cursor-pointer overflow-hidden rounded-[18px] border border-white/[0.08] bg-black/30 text-left transition hover:border-white/20 hover:bg-white/[0.045] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
            <div className="h-1" style={{ background: COLORS.events.solid }} />
            <div className="p-4">
              <div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: COLORS.events.soft, color: COLORS.events.solid }}><Flag className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="truncate text-sm text-white">{automation.name}</strong><StatusBadge status={automation.enabled ? 'running' : 'stopped'} /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-white/35">{automation.description || 'No description'}</p></div></div>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/35 p-3"><div className="flex items-center gap-2 text-xs font-semibold" style={{ color: COLORS.events.solid }}><Flag className="h-3.5 w-3.5" />{triggerLabel(automation.trigger)}</div><div className="mt-2 flex flex-wrap gap-1.5">{(automation.blocks || []).slice(0, 5).map((block) => <span key={block.id} className="h-2.5 w-7 rounded-full" style={{ background: COLORS[definition(block.type).category].solid }} />)}{automation.blocks?.length > 5 && <span className="text-[9px] text-white/30">+{automation.blocks.length - 5}</span>}</div></div>
              <div className="mt-4 flex items-center justify-between"><span className="text-xs font-medium text-white/45">{automation.blocks?.length || 0} blocks · {targetDescription(automation, bots)}</span><div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}><Switch checked={automation.enabled} onChange={() => toggle(automation)} /><button onClick={(event) => run(automation, event)} className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white" title="Run now">{runningId === automation.id ? <Square className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}</button><button onClick={(event) => remove(automation, event)} className="rounded-lg p-2 text-white/25 hover:bg-white/10 hover:text-white" title="Delete"><Trash2 className="h-4 w-4" /></button></div></div>
            </div>
          </article>
        ))}</div>}
      </Panel>
      <PresetModal open={presets} close={() => setPresets(false)} choose={(preset) => { setPresets(false); const next = presetWorkflow(preset); setDraft(next); setEditingId(null); setSelectedBlock(next.blocks[0]?.id || null); setStudio(true); }} />
    </div>
  );
}

function ScratchStudio(props) {
  const { draft, setDraft, bots, categories, selectedBlock, setSelectedBlock, paletteCategory, setPaletteCategory,
    addBlock, patchBlock, deleteBlock, duplicateBlock, dragIndex, setDragIndex, dropIndex, setDropIndex, drop,
    logs, dryRun, close, save, saving, openPresets, presetsOpen, closePresets, loadPreset } = props;
  const selected = draft.blocks.find((block) => block.id === selectedBlock);
  const palette = BLOCKS.filter((block) => block.category === paletteCategory);
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="Visual automation"
        title={draft.name || 'Untitled program'}
        description="Build and test bot behavior with native blocks inside your fleet workspace."
        actions={<>
          <Button size="sm" onClick={close}><ArrowLeft className="h-4 w-4" /> Back</Button>
          <Button size="sm" onClick={openPresets}><Sparkles className="h-4 w-4" /> Templates</Button>
          <Button size="sm" onClick={dryRun}><CirclePlay className="h-4 w-4" /> Preview</Button>
          <Button size="sm" variant="primary" loading={saving} onClick={save}><Save className="h-4 w-4" /> Save</Button>
        </>}
      />

      <Panel className="relative">
        <div className="grid gap-4 border-b border-white/[0.08] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
          <label className="min-w-0"><span className="field-label">Program name</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="field-control" placeholder="Program name" /></label>
          <label className="flex h-12 items-center justify-between gap-4 rounded-xl border border-white/[0.09] bg-white/[0.03] px-4 sm:min-w-44"><span><strong className="block text-xs text-white">Program active</strong><small className="text-[10px] text-white/35">Listen for its trigger</small></span><Switch checked={draft.enabled} onChange={(enabled) => setDraft((current) => ({ ...current, enabled }))} /></label>
        </div>

        <div className="border-b border-white/[0.08] bg-white/[0.015] p-4 2xl:hidden">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{Object.entries(COLORS).filter(([key]) => key !== 'events').map(([key, color]) => <button key={key} onClick={() => setPaletteCategory(key)} className={cn('flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition', paletteCategory === key ? 'border-white/25 bg-white/[0.10] text-white' : 'border-white/[0.07] bg-white/[0.02] text-white/50 hover:text-white')}><span className="h-2.5 w-2.5 rounded-full" style={{ background: color.solid }} />{color.label}</button>)}</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{palette.map((block) => <PaletteBlock key={block.type} block={block} add={() => addBlock(block.type)} />)}</div>
        </div>

        <div className="grid min-w-0 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
          <aside className="hidden border-r border-white/[0.08] bg-white/[0.015] 2xl:block">
            <div className="border-b border-white/[0.08] p-4"><p className="eyebrow">Block library</p><p className="mt-1 text-xs text-white/35">Click or drag into the stack.</p></div>
            <div className="flex flex-wrap gap-1.5 border-b border-white/[0.08] p-3">{Object.entries(COLORS).filter(([key]) => key !== 'events').map(([key, color]) => <button key={key} onClick={() => setPaletteCategory(key)} className={cn('rounded-lg px-3 py-2 text-xs font-semibold', paletteCategory === key ? 'bg-white text-black' : 'bg-white/[0.04] text-white/50 hover:text-white')} title={color.label}>{color.label}</button>)}</div>
            <div className="space-y-2 p-3">{palette.map((block) => <PaletteBlock key={block.type} block={block} add={() => addBlock(block.type)} />)}</div>
          </aside>

          <section className="min-w-0 p-4 sm:p-6" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.055) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <div className="mx-auto max-w-3xl">
              <div className="mb-5 grid gap-3 md:grid-cols-2"><TriggerHat draft={draft} setDraft={setDraft} /><TargetCard draft={draft} setDraft={setDraft} bots={bots} categories={categories} /></div>
              <div className="mx-auto w-full max-w-xl">
                <div className="rounded-t-[16px] border border-white/70 bg-white px-4 py-3.5 text-[15px] font-semibold text-black shadow-xl"><div className="flex items-center gap-2"><Flag className="h-4 w-4 fill-current" />{triggerLabel(draft.trigger)}<span className="ml-auto rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">trigger</span></div></div>
                {draft.blocks.map((block, index) => <div key={block.id} onDragOver={(event) => { event.preventDefault(); setDropIndex(index); }} onDrop={(event) => drop(event, index)}>
                  {dropIndex === index && <div className="my-1 h-1.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,.8)]" />}
                  <CanvasBlock block={block} index={index} selected={selectedBlock === block.id} dragging={dragIndex === index} select={() => setSelectedBlock(block.id)} drag={(event) => { event.dataTransfer.setData('native/canvas', String(index)); setDragIndex(index); }} duplicate={() => duplicateBlock(block)} remove={() => deleteBlock(block.id)} />
                </div>)}
                <button onDragOver={(event) => { event.preventDefault(); setDropIndex(draft.blocks.length); }} onDrop={(event) => drop(event, draft.blocks.length)} onClick={() => addBlock('action_command')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-black/30 py-4 text-xs text-white/35 transition hover:border-white/35 hover:text-white"><Plus className="h-4 w-4" /> Add command block</button>
              </div>
            </div>
          </section>

          <aside className="hidden border-l border-white/[0.08] bg-white/[0.015] 2xl:block">
            <div className="border-b border-white/[0.08] p-4"><p className="eyebrow">Inspector</p><p className="mt-1 text-xs text-white/35">Configure the selected block.</p></div>
            <div className="p-4">{selected ? <BlockInspector block={selected} patch={(params) => patchBlock(selected.id, params)} remove={() => deleteBlock(selected.id)} /> : <div className="py-12 text-center text-xs text-white/30">Select a block to edit it.</div>}</div>
          </aside>
        </div>
      </Panel>

      <div className="space-y-4">
        <Panel className="p-5 2xl:hidden"><div className="mb-4"><p className="eyebrow">Block inspector</p><p className="mt-1 text-xs text-white/35">Select a block in the stack, then edit it here.</p></div>{selected ? <BlockInspector block={selected} patch={(params) => patchBlock(selected.id, params)} remove={() => deleteBlock(selected.id)} /> : <p className="py-8 text-center text-xs text-white/30">No block selected.</p>}</Panel>
        <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4"><div><p className="eyebrow">Preview output</p><p className="mt-1 text-sm text-white/45">Validate the stack without controlling bots.</p></div><Button size="sm" onClick={dryRun}><Play className="h-3.5 w-3.5" /> Run preview</Button></div><div className="console-scrollbar min-h-36 max-h-64 overflow-y-auto bg-black/35 p-4 font-mono text-[13px] leading-7 text-white/60">{logs.length ? logs.map((line, index) => <div key={`${line}-${index}`} className={line.startsWith('[done]') ? 'text-white font-semibold' : ''}>{line}</div>) : <div className="text-white/30">Preview output will appear here.</div>}</div></Panel>
      </div>
      <PresetModal open={presetsOpen} close={closePresets} choose={loadPreset} />
    </div>
  );
}

function PaletteBlock({ block, add }) {
  const color = COLORS[block.category]; const Icon = block.icon;
  return <button draggable onDragStart={(event) => { event.dataTransfer.setData('native/palette', block.type); event.dataTransfer.effectAllowed = 'copy'; }} onClick={add} className="group relative min-h-12 w-full cursor-grab rounded-[11px] border-b-4 px-3.5 py-3 text-left text-[13px] font-bold text-white shadow-md transition hover:-translate-y-0.5 active:cursor-grabbing" style={{ background: color.solid, borderColor: color.dark }}><span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{block.label}<Plus className="ml-auto h-4 w-4 opacity-60 group-hover:opacity-100" /></span></button>;
}

function CanvasBlock({ block, index, selected, dragging, select, drag, duplicate, remove }) {
  const def = definition(block.type); const color = COLORS[def.category]; const Icon = def.icon;
  return <div draggable onDragStart={drag} onClick={select} className={cn('group relative -mt-px cursor-pointer border-b-4 px-3 py-3 text-white shadow-lg transition', index === 0 ? '' : 'rounded-t-sm', selected ? 'z-10 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:brightness-110', dragging && 'opacity-35')} style={{ background: color.solid, borderColor: color.dark, borderRadius: index === 0 ? '0 0 12px 12px' : '4px 4px 12px 12px' }}>
    <div className="flex items-center gap-2.5"><GripVertical className="h-4 w-4 opacity-50" /><Icon className="h-4 w-4" /><span className="text-sm font-bold leading-5">{blockSummary(block)}</span><span className="ml-auto flex items-center gap-1"><button onClick={(event) => { event.stopPropagation(); duplicate(); }} className="rounded-md bg-black/15 p-1.5 opacity-60 hover:bg-black/30 hover:opacity-100" title="Duplicate block"><Copy className="h-3.5 w-3.5" /></button><button onClick={(event) => { event.stopPropagation(); remove(); }} className="rounded-md bg-black/15 p-1.5 opacity-60 hover:bg-black/30 hover:opacity-100" title="Remove block"><X className="h-3.5 w-3.5" /></button></span></div>
  </div>;
}

function TriggerHat({ draft, setDraft }) {
  const type = draft.trigger.type; const params = draft.trigger.params || {};
  return <div className="rounded-2xl border border-white/[0.09] bg-black/35 p-4 shadow-xl"><GlassSelect label="Start event" icon={Flag} value={type} onChange={(value) => setDraft((current) => ({ ...current, trigger: { ...current.trigger, type: value } }))} options={TRIGGERS} />
    {type === 'interval' && <MiniField label="Seconds" type="number" value={params.intervalSec || 60} onChange={(value) => setDraft((current) => ({ ...current, trigger: { ...current.trigger, params: { ...current.trigger.params, intervalSec: Number(value) } } }))} />}
    {(type === 'on_chat' || type === 'on_whisper') && <MiniField label="Text or pattern" value={params.pattern || ''} onChange={(value) => setDraft((current) => ({ ...current, trigger: { ...current.trigger, params: { ...current.trigger.params, pattern: value } } }))} />}
    {type === 'on_health_low' && <MiniField label="Health at or below" type="number" value={params.healthThreshold ?? 10} onChange={(value) => setDraft((current) => ({ ...current, trigger: { ...current.trigger, params: { ...current.trigger.params, healthThreshold: Number(value) } } }))} />}
  </div>;
}

function TargetCard({ draft, setDraft, bots, categories }) {
  return <div className="rounded-2xl border border-white/[0.09] bg-black/35 p-4 shadow-xl"><GlassSelect label="Target bots" icon={Bot} value={draft.targetMode} onChange={(value) => setDraft((current) => ({ ...current, targetMode: value }))} options={[["all", "All managed bots"], ["category", "One category"], ["bots", "Selected bots"]]} />
    {draft.targetMode === 'category' && <div className="mt-3"><GlassSelect label="Bot category" value={draft.targetCategory} onChange={(value) => setDraft((current) => ({ ...current, targetCategory: value }))} options={[["", "Choose category"], ...categories.map((item) => [item, item])]} /></div>}
    {draft.targetMode === 'bots' && <div className="console-scrollbar mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-black/25 p-2">{bots.map((bot) => <label key={bot.id} className="flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/70 hover:bg-white/[0.07]"><input className="h-4 w-4 accent-white" type="checkbox" checked={draft.targetBotIds.includes(bot.id)} onChange={(event) => setDraft((current) => ({ ...current, targetBotIds: event.target.checked ? [...new Set([...current.targetBotIds, bot.id])] : current.targetBotIds.filter((id) => id !== bot.id) }))} />{botLabel(bot)}</label>)}</div>}
  </div>;
}

function BlockInspector({ block, patch, remove }) {
  const def = definition(block.type); const color = COLORS[def.category]; const p = block.params || {};
  return <div className="space-y-4"><div className="rounded-xl border-b-4 p-3 text-xs font-bold text-white" style={{ background: color.solid, borderColor: color.dark }}>{def.label}</div>
    {block.type === 'action_command' && <Field label="Command" value={p.command || ''} patch={(value) => patch({ command: value })} placeholder="/home or !inventory" />}
    {block.type === 'action_chat' && <Field label="Message" value={p.message || ''} patch={(value) => patch({ message: value })} />}
    {block.type === 'control_wait' && <Field label="Milliseconds" type="number" value={p.ms ?? 1000} patch={(value) => patch({ ms: Number(value) })} />}
    {block.type === 'action_look' && <SelectField label="Direction" value={p.direction || 'random'} patch={(value) => patch({ direction: value })} options={['random', 'left', 'right', 'up', 'down']} />}
    {block.type === 'action_slot' && <Field label="Hotbar slot (0–8)" type="number" value={p.slot ?? 0} patch={(value) => patch({ slot: Math.max(0, Math.min(8, Number(value))) })} />}
    {block.type === 'action_drop' && <Field label="Item filter (blank = all)" value={p.item || ''} patch={(value) => patch({ item: value })} />}
    {block.type === 'action_module' && <><GlassSelect label="Module" value={p.module || 'invCleaner'} onChange={(value) => patch({ module: value, ...(value === 'rewardChecker' && !p.opts ? { opts: { serverCmd: '/server boxpvp', warpCmd: '/warp afk', interval: 60 } } : {}) })} options={MODULES} /><SelectField label="State" value={p.action || 'start'} patch={(value) => patch({ action: value })} options={['start', 'stop']} />{p.module === 'rewardChecker' && <div className="space-y-4 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4"><div><strong className="text-sm text-white">Reward route</strong><p className="mt-1 text-xs leading-5 text-white/45">Commands used by this automation when it starts the checker.</p></div><Field label="Server command" value={p.opts?.serverCmd ?? '/server boxpvp'} patch={(value) => patch({ opts: { ...(p.opts || {}), serverCmd: value } })} /><Field label="Reward warp" value={p.opts?.warpCmd ?? '/warp afk'} patch={(value) => patch({ opts: { ...(p.opts || {}), warpCmd: value } })} /><Field label="Interval (seconds)" type="number" value={p.opts?.interval ?? 60} patch={(value) => patch({ opts: { ...(p.opts || {}), interval: Math.max(10, Number(value) || 60) } })} /></div>}</>}
    {block.type === 'condition_if' && <><SelectField label="Read value" value={p.field || 'chat'} patch={(value) => patch({ field: value })} options={['chat', 'health', 'shards', 'inventory', 'status']} /><SelectField label="Operator" value={p.operator || 'contains'} patch={(value) => patch({ operator: value })} options={['contains', 'equals', 'not_equals', 'greater', 'less']} /><Field label="Compare with" value={p.value ?? ''} patch={(value) => patch({ value })} /></>}
    {block.type === 'notification_log' && <Field label="Log message" value={p.message || ''} patch={(value) => patch({ message: value })} />}
    {block.type === 'notification_webhook' && <><Field label="Webhook URL" value={p.webhookUrl || ''} patch={(value) => patch({ webhookUrl: value })} /><Field label="Message" value={p.content || ''} patch={(value) => patch({ content: value })} /></>}
    {block.type === 'action_jump' && <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/40">This block wakes AFK physics, performs one jump, then returns the bot to low-power idle.</p>}
    <button onClick={remove} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs text-white/35 hover:border-white/25 hover:text-white"><Trash2 className="h-3.5 w-3.5" /> Remove block</button>
  </div>;
}

function GlassSelect({ label, icon: Icon, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const rows = options.map((option) => Array.isArray(option)
    ? { value: String(option[0]), label: String(option[1]) }
    : { value: String(option.value), label: String(option.label) });
  const selected = rows.find((option) => option.value === String(value)) || rows[0];

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [open]);

  return <div ref={rootRef} className="relative">
    {label && <span className="field-label flex items-center gap-2">{Icon && <Icon className="h-4 w-4" />}{label}</span>}
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn('flex min-h-12 w-full items-center gap-3 rounded-[14px] border px-4 text-left text-sm font-semibold transition-all', open ? 'border-white/40 bg-white/[0.09] ring-4 ring-white/[0.06]' : 'border-white/10 bg-white/[0.045] hover:border-white/25 hover:bg-white/[0.07]')}>
      <span className="min-w-0 flex-1 truncate text-white">{selected?.label || 'Select an option'}</span>
      <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/50 transition-transform', open && 'rotate-180 text-white')} />
    </button>
    {open && <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] max-h-72 overflow-y-auto rounded-[16px] border border-white/15 bg-[#111113]/98 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,.85)] backdrop-blur-3xl">
      {rows.map((option) => {
        const current = option.value === String(value);
        return <button key={option.value || '__empty'} type="button" role="option" aria-selected={current} onClick={() => { onChange(option.value); setOpen(false); }} className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition', current ? 'bg-white text-black' : 'text-white/70 hover:bg-white/[0.09] hover:text-white')}>
          <span className="min-w-0 flex-1">{option.label}</span>
          {current && <Check className="h-4 w-4 shrink-0" />}
        </button>;
      })}
    </div>}
  </div>;
}

function Field({ label, value, patch, type = 'text', placeholder }) { return <label className="block"><span className="field-label">{label}</span><input className="field-control" type={type} value={value} placeholder={placeholder} onChange={(event) => patch(event.target.value)} /></label>; }
function SelectField({ label, value, patch, options }) { return <GlassSelect label={label} value={value} onChange={patch} options={options.map((option) => [option, option.replaceAll('_', ' ')])} />; }
function MiniField({ label, value, onChange, type = 'text' }) { return <label className="mt-3 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/55">{label}</span><input className="field-control min-h-11 text-sm" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function PresetModal({ open, close, choose }) {
  return <Modal open={open} onClose={close} title="Starter programs" description="Load a clean, editable stack and make it yours." wide><div className="grid gap-3 md:grid-cols-3">{PRESETS.map((preset) => <button key={preset.name} onClick={() => choose(preset)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-white/25 hover:bg-white/[0.06]"><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: COLORS.events.soft, color: COLORS.events.solid }}><Flag className="h-5 w-5" /></div><strong className="text-sm text-white">{preset.name}</strong><p className="mt-2 text-xs leading-5 text-white/35">{preset.description}</p><div className="mt-4 flex items-center text-[10px] font-semibold" style={{ color: COLORS.events.solid }}>{preset.blocks.length} blocks <ChevronRight className="ml-auto h-4 w-4" /></div></button>)}</div></Modal>;
}

function targetDescription(automation, bots) {
  if (automation.targetMode === 'category') return automation.targetCategory || 'category';
  if (automation.targetMode === 'bots') return `${automation.targetBotIds?.length || 0} selected`;
  return `${bots.length} managed`;
}
function blockSummary(block) {
  const p = block.params || {};
  switch (block.type) {
    case 'action_command': return `run ${p.command || 'command'}`;
    case 'action_chat': return `say “${p.message || ''}”`;
    case 'control_wait': return `wait ${Math.max(0, Number(p.ms || 0)) / 1000} seconds`;
    case 'action_look': return `look ${p.direction || 'random'}`;
    case 'action_slot': return `select hotbar slot ${p.slot ?? 0}`;
    case 'action_drop': return `drop ${p.item || 'all items'}`;
    case 'action_module': return `${p.action || 'start'} ${MODULES.find(([key]) => key === p.module)?.[1] || p.module || 'module'}${p.module === 'rewardChecker' ? ` every ${p.opts?.interval || 60}s` : ''}`;
    case 'condition_if': return `continue if ${p.field || 'chat'} ${String(p.operator || 'contains').replaceAll('_', ' ')} ${p.value || '…'}`;
    case 'notification_log': return `write “${p.message || 'log'}”`;
    case 'notification_webhook': return `webhook “${p.content || 'message'}”`;
    default: return definition(block.type).label;
  }
}
