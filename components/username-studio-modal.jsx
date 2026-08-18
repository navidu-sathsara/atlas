'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Compass,
  Copy,
  Crown,
  Dices,
  Eye,
  Flame,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { Button, IconButton, Modal, StatusBadge, Tabs } from '@/components/ui';
import { api, cn } from '@/lib/api';
import { useToast } from '@/components/providers';

// ── Curated Mature & Aesthetic Word Banks ──
const WITTY_LLAMA_WORDS = [
  'OhLlama',
  'notyourllama',
  'notyourfault',
  'almosthuman',
  'barelythere',
  'maybeoffline',
  'definitelynot',
  'whoasked',
  'whynotboth',
  'sorrynotsorry',
  'justvibing',
  'needcoffee',
  'outoffocus',
  'nobraincells',
  'zerocares',
  'lowbattery',
  'offlineagain',
  'ctrlaltdefeat',
  'laggenerator',
  'afkforever',
  'idkman',
  'goodenough',
  'whyamilike',
  'itsfine',
  'nocoffeenowork',
  'llamastrike',
  'calmbeforestorm',
  'sleepdeprived',
  'thoughtpolice',
  'overthinking',
];

const TECH_PHILOSOPHY_WORDS = [
  'consensus',
  'nullstate',
  'zeroentropy',
  'defragged',
  'subroutine',
  'deadlock',
  'hyperthread',
  'paperplane',
  'coldbrew',
  'ambientnoise',
  'bitshift',
  'monolith',
  'subtlechaos',
  'halftone',
  'packetloss',
  'syntaxerror',
  'stacktrace',
  'eventloop',
  'asyncawait',
  'nullpointer',
  'runtimeerror',
  'heapexhaust',
  'garbagecollect',
  'bytecode',
  'checksum',
  'hashcollision',
  'racecondition',
  'coredecay',
  'endianness',
  'statemachine',
  'microcode',
  'pointermath',
];

const MINIMAL_AESTHETIC_WORDS = [
  'velvet',
  'zenith',
  'solitude',
  'lucid',
  'echo',
  'frost',
  'halcyon',
  'obsidian',
  'spectrum',
  'solaris',
  'meridian',
  'static',
  'radiance',
  'vertex',
  'chroma',
  'monochrome',
  'dusk',
  'dawn',
  'cinder',
  'mirage',
  'vortex',
  'quartz',
  'nebula',
  'ethereal',
  'solace',
  'axiom',
  'drift',
  'monad',
  'vesper',
  'valence',
];

const CORPORATE_SATIRE_WORDS = [
  'stakeholder',
  'synergize',
  'actionitem',
  'circlingback',
  'bandwidth',
  'deliverable',
  'leverage',
  'unprecedented',
  'deepdive',
  'touchbase',
  'lowhanging',
  'paradigm',
  'pivotnow',
  'burnout',
  'overleveraged',
  'q4deliverable',
  'valueadd',
  'corecompetency',
  'missioncritical',
  'blocker',
];

export function UsernameStudioModal({ open, onClose, onSelectUsername }) {
  const { toast } = useToast();
  const [category, setCategory] = useState('all'); // 'all' | 'witty' | 'tech' | 'aesthetic' | 'corporate'
  const [casing, setCasing] = useState('camel'); // 'camel' | 'lower' | 'pascal'
  const [numberSuffix, setNumberSuffix] = useState('single'); // 'none' | 'single' | 'random' | 'year'
  const [batchCount, setBatchCount] = useState(8);
  const [generatedList, setGeneratedList] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [copiedName, setCopiedName] = useState('');
  const [customCheck, setCustomCheck] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [checkingCustom, setCheckingCustom] = useState(false);
  const [filterView, setFilterView] = useState('all'); // 'all' | 'premium' | 'available'

  // Generator Function
  const generateNames = useCallback(() => {
    let pool = [];
    if (category === 'witty' || category === 'all') pool = pool.concat(WITTY_LLAMA_WORDS);
    if (category === 'tech' || category === 'all') pool = pool.concat(TECH_PHILOSOPHY_WORDS);
    if (category === 'aesthetic' || category === 'all') pool = pool.concat(MINIMAL_AESTHETIC_WORDS);
    if (category === 'corporate' || category === 'all') pool = pool.concat(CORPORATE_SATIRE_WORDS);

    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, batchCount);

    const formatted = selected.map((base) => {
      let name = base;

      // Apply casing
      if (casing === 'lower') {
        name = name.toLowerCase();
      } else if (casing === 'pascal') {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      } else if (casing === 'camel') {
        name = name.charAt(0).toLowerCase() + name.slice(1);
      }

      // Apply number suffix
      if (numberSuffix === 'single') {
        name += Math.floor(Math.random() * 9) + 1; // 1-9
      } else if (numberSuffix === 'random') {
        name += String(Math.floor(Math.random() * 90) + 10); // 10-99
      } else if (numberSuffix === 'year') {
        name += '25';
      }

      // Clamp to max 16 chars (Minecraft Java standard)
      if (name.length > 16) name = name.slice(0, 16);

      return {
        name,
        checking: false,
        status: null, // 'premium' | 'available' | 'offline_valid'
        uuid: null,
        avatar: null,
        message: null,
      };
    });

    setGeneratedList(formatted);
    verifyBatch(formatted);
  }, [category, casing, numberSuffix, batchCount]);

  // Batch Verify via Mojang API Endpoint
  const verifyBatch = async (list) => {
    setVerifying(true);
    const results = await Promise.all(
      list.map(async (item) => {
        try {
          const res = await api(`/check-username?name=${encodeURIComponent(item.name)}`);
          return {
            ...item,
            checking: false,
            status: res.isPremium ? 'premium' : 'available',
            isPremium: res.isPremium,
            uuid: res.uuid || null,
            avatar: res.avatar || (res.isPremium ? `https://mc-heads.net/avatar/${res.uuid}/64` : null),
            message: res.message,
          };
        } catch (_) {
          return {
            ...item,
            checking: false,
            status: 'offline_valid',
            isPremium: false,
            message: 'Offline valid',
          };
        }
      })
    );
    setGeneratedList(results);
    setVerifying(false);
  };

  useEffect(() => {
    if (open && generatedList.length === 0) {
      generateNames();
    }
  }, [open, generateNames, generatedList.length]);

  const handleCopy = (name) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    toast(`Copied "${name}" to clipboard`, 'success');
    setTimeout(() => setCopiedName(''), 2000);
  };

  const handleCheckCustom = async (e) => {
    e?.preventDefault();
    const query = customCheck.trim();
    if (!query) return;
    setCheckingCustom(true);
    setCustomResult(null);
    try {
      const res = await api(`/check-username?name=${encodeURIComponent(query)}`);
      setCustomResult(res);
    } catch (err) {
      setCustomResult({ ok: false, reason: err.message });
    } finally {
      setCheckingCustom(false);
    }
  };

  const filteredList = generatedList.filter((item) => {
    if (filterView === 'premium') return item.isPremium;
    if (filterView === 'available') return !item.isPremium;
    return true;
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide={true}
      title="Atlas Name Studio & Mojang Checker"
      description="Curated aesthetic, philosophical & witty usernames with live Minecraft Mojang Premium verification."
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Category */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
              Style Engine
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-white/30"
            >
              <option value="all">🎲 All Styles Mix</option>
              <option value="witty">🦙 Witty & Wordplay (OhLlama)</option>
              <option value="tech">🧠 Tech & Philosophy (consensus)</option>
              <option value="aesthetic">☕ Minimal Aesthetic (velvet)</option>
              <option value="corporate">💼 Corporate Satire (synergize)</option>
            </select>
          </div>

          {/* Casing */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
              Format Casing
            </label>
            <select
              value={casing}
              onChange={(e) => setCasing(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-white/30"
            >
              <option value="camel">camelCase (e.g. notYourFault)</option>
              <option value="lower">lowercase (e.g. consensus1)</option>
              <option value="pascal">PascalCase (e.g. NotYourLlama)</option>
            </select>
          </div>

          {/* Number Suffix */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
              Number Tag
            </label>
            <select
              value={numberSuffix}
              onChange={(e) => setNumberSuffix(e.target.value)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-xs text-white outline-none transition focus:border-white/30"
            >
              <option value="single">Single Digit 1-9 (e.g. consensus1)</option>
              <option value="none">None (Clean word only)</option>
              <option value="random">Two Digits (01-99)</option>
              <option value="year">Year Tag ('25)</option>
            </select>
          </div>

          {/* Action Generate */}
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={generateNames}
              loading={verifying}
              className="h-10 w-full gap-2 text-xs font-bold"
            >
              <Dices className="h-4 w-4" /> Roll New Names
            </Button>
          </div>
        </div>

        {/* Live Custom Name Inspector Bar */}
        <form
          onSubmit={handleCheckCustom}
          className="flex flex-col gap-2 rounded-2xl border border-white/[0.09] bg-[#111114]/80 p-3 backdrop-blur-xl sm:flex-row sm:items-center"
        >
          <div className="relative flex flex-1 items-center">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={customCheck}
              onChange={(e) => setCustomCheck(e.target.value)}
              placeholder="Test custom username against Mojang API (e.g. consensus1, Notch, notyourllama)..."
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-10 pr-3 text-xs font-mono text-white placeholder-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.06]"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" loading={checkingCustom}>
            Verify Name
          </Button>
        </form>

        {/* Custom Single Check Result Banner */}
        {customResult && (
          <div
            className={cn(
              'anim-scale flex items-center justify-between rounded-2xl border p-4 backdrop-blur-2xl',
              customResult.isPremium
                ? 'border-white/25 bg-white/[0.08]'
                : 'border-white/15 bg-white/[0.04]'
            )}
          >
            <div className="flex items-center gap-3.5">
              {customResult.avatar ? (
                <img
                  src={customResult.avatar}
                  alt={customResult.name}
                  className="h-10 w-10 rounded-xl border border-white/20 bg-black/40 object-cover shadow-sm"
                />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-white">
                  MC
                </span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-white">{customResult.name}</strong>
                  {customResult.isPremium ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <Crown className="h-3 w-3" /> Mojang Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-bold text-white/80">
                      <Sparkles className="h-3 w-3" /> Available / Unclaimed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-white/40">
                  {customResult.isPremium
                    ? `UUID: ${customResult.uuid || 'Registered on official Mojang servers'}`
                    : 'Clean name ready for registration or cracked/offline bot deployment.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleCopy(customResult.name)}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              {onSelectUsername && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onSelectUsername(customResult.name);
                    onClose();
                  }}
                >
                  Use for Bot <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Filter View Selector */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <span className="text-xs font-semibold text-white/50">
            Generated Candidates ({generatedList.length})
          </span>

          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              onClick={() => setFilterView('all')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                filterView === 'all' ? 'bg-white text-black font-semibold' : 'text-white/40 hover:text-white'
              )}
            >
              All ({generatedList.length})
            </button>
            <button
              onClick={() => setFilterView('available')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                filterView === 'available' ? 'bg-white text-black font-semibold' : 'text-white/40 hover:text-white'
              )}
            >
              🟢 Available ({generatedList.filter((i) => !i.isPremium).length})
            </button>
            <button
              onClick={() => setFilterView('premium')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                filterView === 'premium' ? 'bg-white text-black font-semibold' : 'text-white/40 hover:text-white'
              )}
            >
              🔵 Premium ({generatedList.filter((i) => i.isPremium).length})
            </button>
          </div>
        </div>

        {/* Generated Cards Grid */}
        <div className="grid max-h-[380px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {verifying && generatedList.length === 0 ? (
            <div className="col-span-full flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : filteredList.length ? (
            filteredList.map((item) => (
              <div
                key={item.name}
                className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-10 w-10 shrink-0 rounded-xl border border-white/15 bg-black/50 object-cover shadow-sm"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-black uppercase text-white/70">
                      {item.name.slice(0, 2)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <strong className="truncate font-mono text-xs font-bold text-white">{item.name}</strong>
                      {item.isPremium ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/15 px-1.5 py-0.5 text-[9px] font-bold text-white">
                          <Crown className="h-2.5 w-2.5" /> Premium
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-white/70">
                          <Sparkles className="h-2.5 w-2.5" /> Available
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-white/40">
                      {item.isPremium ? 'Mojang account' : 'Free / Unregistered'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(item.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition active:scale-95 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    title="Copy username"
                  >
                    {copiedName === item.name ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>

                  {onSelectUsername && (
                    <button
                      onClick={() => {
                        onSelectUsername(item.name);
                        onClose();
                      }}
                      className="flex h-8 items-center gap-1 rounded-xl border border-white/20 bg-white px-2.5 text-[11px] font-bold text-black shadow-sm transition active:scale-95 hover:bg-white/90"
                      title="Use in deployment"
                    >
                      <Bot className="h-3 w-3" /> Use
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
              <p className="text-xs text-white/40">No names match this filter</p>
              <Button size="sm" variant="ghost" onClick={() => setFilterView('all')} className="mt-2 text-xs">
                Show all candidates
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
