'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Bot,
  Check,
  Compass,
  Copy,
  Crown,
  Dices,
  Flame,
  Globe,
  Heart,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { Button, IconButton, Modal, StatusBadge } from '@/components/ui';
import { api, cn } from '@/lib/api';
import { useToast } from '@/components/providers';

// ── 250+ Curated Mature, Witty & Aesthetic Lexicon ──
const WITTY_PHRASES = [
  'OhLlama', 'notyourllama', 'notyourfault', 'almosthuman', 'barelythere',
  'maybeoffline', 'definitelynot', 'whoasked', 'whynotboth', 'sorrynotsorry',
  'justvibing', 'needcoffee', 'outoffocus', 'nobraincells', 'zerocares',
  'lowbattery', 'offlineagain', 'ctrlaltdefeat', 'laggenerator', 'afkforever',
  'idkman', 'goodenough', 'whyamilike', 'itsfine', 'nocoffeenowork',
  'llamastrike', 'calmbeforestorm', 'sleepdeprived', 'thoughtpolice', 'overthinking',
  'worksforme', 'runtimepanic', 'zerotrust', 'didntask', 'blameproduction',
  'unattended', 'itcompiled', 'silenceisgolden', 'halfconscious', 'procrastinating',
  'overengineered', 'bareminimum', 'nodatatoshow', 'coffeeoverflow', 'systemoverload',
  'whoami', 'dontblameme', 'ghostinmachine', 'sleepisoptional', 'terminalvelocity'
];

const TECH_PHILOSOPHY = [
  'consensus', 'nullstate', 'zeroentropy', 'defragged', 'subroutine',
  'deadlock', 'hyperthread', 'paperplane', 'coldbrew', 'ambientnoise',
  'bitshift', 'monolith', 'subtlechaos', 'halftone', 'packetloss',
  'syntaxerror', 'stacktrace', 'eventloop', 'asyncawait', 'nullpointer',
  'runtimeerror', 'heapexhaust', 'garbagecollect', 'bytecode', 'checksum',
  'hashcollision', 'racecondition', 'coredecay', 'endianness', 'statemachine',
  'microcode', 'pointermath', 'stackframe', 'pipelineflush', 'kernelpanic',
  'syscall', 'contextswitch', 'memleak', 'bitflip', 'zeroday',
  'entropist', 'monad', 'functor', 'closure', 'immutable',
  'deterministic', 'heuristic', 'polymorphic', 'tautology', 'solipsist'
];

const MINIMAL_AESTHETIC = [
  'velvet', 'zenith', 'solitude', 'lucid', 'echo',
  'frost', 'halcyon', 'obsidian', 'spectrum', 'solaris',
  'meridian', 'static', 'radiance', 'vertex', 'chroma',
  'monochrome', 'dusk', 'dawn', 'cinder', 'mirage',
  'vortex', 'quartz', 'nebula', 'ethereal', 'solace',
  'axiom', 'drift', 'vesper', 'valence', 'prism',
  'aegis', 'aurora', 'cascade', 'eclipse', 'glimmer',
  'horizon', 'luminance', 'nocturne', 'oblivion', 'paragon',
  'quintessence', 'reverie', 'seraph', 'silhouette', 'tesseract'
];

const CORPORATE_SATIRE = [
  'stakeholder', 'synergize', 'actionitem', 'circlingback', 'bandwidth',
  'deliverable', 'leverage', 'unprecedented', 'deepdive', 'touchbase',
  'lowhanging', 'paradigm', 'pivotnow', 'burnout', 'overleveraged',
  'q4deliverable', 'valueadd', 'corecompetency', 'missioncritical', 'blocker',
  'bandwidthzero', 'offlinealignment', 'synergydrain', 'scopecreep', 'hardstop'
];

// Smart Compound Prefixes & Suffixes for endless combinations
const ADJECTIVES = ['null', 'cold', 'zero', 'hyper', 'micro', 'macro', 'ambient', 'subtle', 'pure', 'deep', 'silent', 'raw', 'proto'];
const NOUNS = ['state', 'flow', 'logic', 'trace', 'thread', 'loop', 'pulse', 'spark', 'shift', 'core', 'mesh', 'drift', 'sync'];

export function UsernameStudioModal({ open, onClose, onSelectUsername }) {
  const { toast } = useToast();

  // Generator Configuration State
  const [styleEngine, setStyleEngine] = useState('all'); // 'all' | 'witty' | 'tech' | 'aesthetic' | 'corporate' | 'compounds'
  const [casingMode, setCasingMode] = useState('camel'); // 'camel' | 'lower' | 'pascal'
  const [numberSuffix, setNumberSuffix] = useState('single'); // 'none' | 'single' | 'random' | 'year'
  const [batchSize, setBatchSize] = useState(12);

  // Data & Results State
  const [generatedList, setGeneratedList] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [copiedName, setCopiedName] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'available' | 'premium' | 'favorites'

  // Live Real-Time Single Name Inspector State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [liveCheckResult, setLiveCheckResult] = useState(null);
  const [liveChecking, setLiveChecking] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Execute Live Mojang Check on debounced query
  useEffect(() => {
    if (!debouncedQuery) {
      setLiveCheckResult(null);
      setLiveChecking(false);
      return;
    }
    let isCurrent = true;
    setLiveChecking(true);
    api(`/check-username?name=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => {
        if (isCurrent) setLiveCheckResult(res);
      })
      .catch((err) => {
        if (isCurrent) setLiveCheckResult({ ok: false, reason: err.message, name: debouncedQuery });
      })
      .finally(() => {
        if (isCurrent) setLiveChecking(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  // Master Generator Engine
  const generateNames = useCallback(() => {
    let pool = [];

    if (styleEngine === 'witty') pool = [...WITTY_PHRASES];
    else if (styleEngine === 'tech') pool = [...TECH_PHILOSOPHY];
    else if (styleEngine === 'aesthetic') pool = [...MINIMAL_AESTHETIC];
    else if (styleEngine === 'corporate') pool = [...CORPORATE_SATIRE];
    else if (styleEngine === 'compounds') {
      // Procedurally generate smart compound words
      const compounds = [];
      for (let i = 0; i < 40; i++) {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        compounds.push(adj + noun.charAt(0).toUpperCase() + noun.slice(1));
      }
      pool = compounds;
    } else {
      // Mix all curated banks
      pool = [...WITTY_PHRASES, ...TECH_PHILOSOPHY, ...MINIMAL_AESTHETIC, ...CORPORATE_SATIRE];
      for (let i = 0; i < 20; i++) {
        const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
        const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
        pool.push(adj + noun.charAt(0).toUpperCase() + noun.slice(1));
      }
    }

    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, batchSize);

    const formatted = selected.map((base) => {
      let name = base;

      // Apply casing
      if (casingMode === 'lower') {
        name = name.toLowerCase();
      } else if (casingMode === 'pascal') {
        name = name.charAt(0).toUpperCase() + name.slice(1);
      } else if (casingMode === 'camel') {
        name = name.charAt(0).toLowerCase() + name.slice(1);
      }

      // Apply number suffix
      if (numberSuffix === 'single') {
        name += Math.floor(Math.random() * 9) + 1; // 1-9 (e.g. consensus1)
      } else if (numberSuffix === 'random') {
        name += String(Math.floor(Math.random() * 90) + 10); // 10-99
      } else if (numberSuffix === 'year') {
        name += '25';
      }

      // Clamp to max 16 chars (Minecraft Java standard)
      if (name.length > 16) name = name.slice(0, 16);

      return {
        name,
        length: name.length,
        status: null,
        isPremium: false,
        uuid: null,
        avatar: null,
      };
    });

    setGeneratedList(formatted);
    verifyBatch(formatted);
  }, [styleEngine, casingMode, numberSuffix, batchSize]);

  // Batch Verify via Mojang API Endpoint
  const verifyBatch = async (list) => {
    setVerifying(true);
    const results = await Promise.all(
      list.map(async (item) => {
        try {
          const res = await api(`/check-username?name=${encodeURIComponent(item.name)}`);
          return {
            ...item,
            status: res.isPremium ? 'premium' : 'available',
            isPremium: res.isPremium,
            uuid: res.uuid || null,
            avatar: res.avatar || (res.isPremium ? `https://mc-heads.net/avatar/${res.uuid}/64` : null),
          };
        } catch (_) {
          return {
            ...item,
            status: 'available',
            isPremium: false,
            avatar: 'https://mc-heads.net/avatar/MHF_Steve/64',
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

  const toggleFavorite = (name) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        toast(`Removed "${name}" from saved list`, 'info');
      } else {
        next.add(name);
        toast(`Saved "${name}" to favorites`, 'success');
      }
      return next;
    });
  };

  // Filter List Logic
  const filteredList = useMemo(() => {
    return generatedList.filter((item) => {
      if (activeFilter === 'available') return !item.isPremium;
      if (activeFilter === 'premium') return item.isPremium;
      if (activeFilter === 'favorites') return favorites.has(item.name);
      return true;
    });
  }, [generatedList, activeFilter, favorites]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide={true}
      title="Atlas Mature Name Studio & Mojang Lab"
      description="Curated aesthetic, philosophical & witty usernames with real-time Minecraft Mojang Premium verification and 3D player skin rendering."
    >
      <div className="space-y-6">
        {/* Controls Configuration Bar */}
        <div className="grid grid-cols-1 gap-3.5 rounded-2xl border border-white/12 bg-white/[0.04] p-4.5 backdrop-blur-2xl sm:grid-cols-2 lg:grid-cols-4">
          {/* Style Engine Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Style Engine
            </label>
            <select
              value={styleEngine}
              onChange={(e) => setStyleEngine(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/60 px-3.5 text-sm font-medium text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            >
              <option value="all">All Styles Mix</option>
              <option value="witty">Witty & Wordplay (OhLlama)</option>
              <option value="tech">Tech & Philosophy (consensus1)</option>
              <option value="aesthetic">Minimal Aesthetic (velvet)</option>
              <option value="corporate">Corporate Satire (synergize)</option>
              <option value="compounds">Smart Compounds (nullState)</option>
            </select>
          </div>

          {/* Casing Mode */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Format Casing
            </label>
            <select
              value={casingMode}
              onChange={(e) => setCasingMode(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/60 px-3.5 text-sm font-medium text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            >
              <option value="camel">camelCase (e.g. notYourFault)</option>
              <option value="lower">lowercase (e.g. consensus1)</option>
              <option value="pascal">PascalCase (e.g. NotYourLlama)</option>
            </select>
          </div>

          {/* Number Suffix */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/60">
              Number Tag
            </label>
            <select
              value={numberSuffix}
              onChange={(e) => setNumberSuffix(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/12 bg-black/60 px-3.5 text-sm font-medium text-white outline-none transition focus:border-white/40 focus:ring-1 focus:ring-white/30"
            >
              <option value="single">Single Digit 1-9 (e.g. consensus1)</option>
              <option value="none">None (Clean Word Only)</option>
              <option value="random">Two Digits (10-99)</option>
              <option value="year">Year Tag ('25)</option>
            </select>
          </div>

          {/* Action Generate Button */}
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={generateNames}
              loading={verifying}
              className="h-11 w-full gap-2.5 text-sm font-bold shadow-lg"
            >
              <Dices className="h-4.5 w-4.5" /> Roll New Batch
            </Button>
          </div>
        </div>

        {/* Live Real-Time Custom Name Inspector */}
        <div className="rounded-2xl border border-white/12 bg-[#121216]/90 p-3.5 backdrop-blur-2xl shadow-xl">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Live test any custom name against Mojang (e.g. consensus1, Notch, notyourllama)..."
              className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-12 pr-12 text-sm font-mono font-medium text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-white/[0.08]"
            />
            {liveChecking && (
              <Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 animate-spin text-white/60" />
            )}
          </div>

          {/* Live Typing Result Box */}
          {searchQuery.trim() && liveCheckResult && (
            <div
              className={cn(
                'anim-scale mt-3 flex items-center justify-between rounded-xl border p-4 backdrop-blur-3xl transition-all duration-300',
                liveCheckResult.isPremium
                  ? 'border-white/30 bg-white/[0.12] shadow-[0_4px_24px_rgba(255,255,255,0.1)]'
                  : 'border-white/15 bg-white/[0.05]'
              )}
            >
              <div className="flex items-center gap-4">
                <img
                  src={
                    liveCheckResult.avatar ||
                    (liveCheckResult.isPremium
                      ? `https://mc-heads.net/avatar/${liveCheckResult.uuid}/64`
                      : 'https://mc-heads.net/avatar/MHF_Steve/64')
                  }
                  alt={liveCheckResult.name}
                  className="h-12 w-12 rounded-xl border border-white/20 bg-black/60 object-cover shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <strong className="font-mono text-base font-bold text-white">
                      {liveCheckResult.name}
                    </strong>
                    {liveCheckResult.isPremium ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/25 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                        <Crown className="h-3.5 w-3.5" /> Mojang Premium Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3 py-0.5 text-xs font-bold text-white/80">
                        <Sparkles className="h-3.5 w-3.5" /> Available / Unclaimed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    {liveCheckResult.isPremium
                      ? `Player UUID: ${liveCheckResult.uuid || 'Verified'}`
                      : 'Free clean name ready for registration or cracked bot deployment.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleCopy(liveCheckResult.name)}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                {onSelectUsername && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onSelectUsername(liveCheckResult.name);
                      onClose();
                    }}
                  >
                    Use for Bot <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              Generated Roster ({generatedList.length})
            </span>
            {verifying && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] p-1 backdrop-blur-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition duration-200',
                activeFilter === 'all'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              )}
            >
              All ({generatedList.length})
            </button>
            <button
              onClick={() => setActiveFilter('available')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition duration-200',
                activeFilter === 'available'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              )}
            >
              Available ({generatedList.filter((i) => !i.isPremium).length})
            </button>
            <button
              onClick={() => setActiveFilter('premium')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition duration-200',
                activeFilter === 'premium'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              )}
            >
              Premium ({generatedList.filter((i) => i.isPremium).length})
            </button>
            <button
              onClick={() => setActiveFilter('favorites')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition duration-200',
                activeFilter === 'favorites'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white'
              )}
            >
              Saved ({favorites.size})
            </button>
          </div>
        </div>

        {/* Generated Cards Grid */}
        <div className="grid max-h-[440px] grid-cols-1 gap-3.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {verifying && generatedList.length === 0 ? (
            <div className="col-span-full flex h-48 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              <p className="text-sm font-semibold text-white/50">Consulting Mojang servers...</p>
            </div>
          ) : filteredList.length ? (
            filteredList.map((item) => {
              const isFav = favorites.has(item.name);
              return (
                <div
                  key={item.name}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-2xl transition-all duration-300 hover:border-white/30 hover:bg-white/[0.07] hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            item.avatar ||
                            (item.isPremium
                              ? `https://mc-heads.net/avatar/${item.uuid}/64`
                              : 'https://mc-heads.net/avatar/MHF_Steve/64')
                          }
                          alt={item.name}
                          className="h-11 w-11 shrink-0 rounded-xl border border-white/15 bg-black/60 object-cover shadow-sm transition group-hover:scale-105"
                        />
                        <div className="min-w-0">
                          <strong className="block truncate font-mono text-sm font-extrabold text-white">
                            {item.name}
                          </strong>
                          <div className="mt-1 flex items-center gap-1.5">
                            {item.isPremium ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                                <Crown className="h-3 w-3" /> Premium
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-white/80">
                                <Sparkles className="h-3 w-3" /> Available
                              </span>
                            )}
                            <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/50">
                              {item.length}c
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Favorite Heart Button */}
                      <button
                        onClick={() => toggleFavorite(item.name)}
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition active:scale-90',
                          isFav
                            ? 'border-white/40 bg-white text-black shadow-md'
                            : 'border-white/10 bg-white/[0.04] text-white/40 hover:border-white/25 hover:text-white'
                        )}
                        title={isFav ? 'Remove from saved' : 'Save to favorites'}
                      >
                        <Heart className={cn('h-3.5 w-3.5', isFav && 'fill-black')} />
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.08] pt-3">
                    <button
                      onClick={() => handleCopy(item.name)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      {copiedName === item.name ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>

                    {onSelectUsername && (
                      <button
                        onClick={() => {
                          onSelectUsername(item.name);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/30 bg-white px-3.5 py-1.5 text-xs font-bold text-black shadow-sm transition hover:bg-white/90 active:scale-95"
                      >
                        <Bot className="h-3.5 w-3.5" /> Deploy
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 text-center">
              <p className="text-sm font-semibold text-white/50">No names match the current filter</p>
              <Button size="sm" variant="ghost" onClick={() => setActiveFilter('all')} className="mt-3 text-xs">
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
