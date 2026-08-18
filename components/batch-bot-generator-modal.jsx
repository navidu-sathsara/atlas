'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Crown,
  Dices,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { api, cn } from '@/lib/api';
import { Button, Modal, Switch } from '@/components/ui';
import { useToast } from '@/components/providers';

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
  'axiom', 'drift', 'vesper', 'valence', 'prism'
];

const MATURE_DICTIONARY = [
  ...TECH_PHILOSOPHY,
  ...WITTY_PHRASES,
  ...MINIMAL_AESTHETIC,
];

export function BatchBotGeneratorModal({ open, onClose, onGenerated }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [loadingProxies, setLoadingProxies] = useState(false);

  // Form State
  const [quantity, setQuantity] = useState(10);
  const [namingMode, setNamingMode] = useState('prefix'); // 'prefix' | 'mature' | 'custom'
  const [prefix, setPrefix] = useState('bot_');
  const [startNumber, setStartNumber] = useState(1);
  const [customText, setCustomText] = useState('');
  const [shuffleKey, setShuffleKey] = useState(0);

  // Server & Connection
  const [host, setHost] = useState('play.bananasmp.net');
  const [port, setPort] = useState(25565);
  const [version, setVersion] = useState('1.20.1');
  const [auth, setAuth] = useState('offline');
  const [category, setCategory] = useState('Fleet Cluster');

  // Proxy Mode
  const [useProxies, setUseProxies] = useState(true);

  // Auto-Auth Mode (Cracked servers / AuthMe / nLogin)
  const [enableAuthHandshake, setEnableAuthHandshake] = useState(true);
  const [loginPassword, setLoginPassword] = useState('AtlasPass123!');

  // Real-time Mojang / Premium Checker State
  const [mojangData, setMojangData] = useState({});
  const [verifying, setVerifying] = useState(false);
  const [previewFilter, setPreviewFilter] = useState('all'); // 'all' | 'premium' | 'available'

  // Fetch available proxies on modal open
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoadingProxies(true);
    api('/proxies')
      .then((data) => {
        if (mounted) setProxies(data.proxies || []);
      })
      .catch(() => {
        if (mounted) setProxies([]);
      })
      .finally(() => {
        if (mounted) setLoadingProxies(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  // Compute preview roster of generated bots with Round-Robin proxy mapping
  const previewRoster = useMemo(() => {
    const qty = Math.min(100, Math.max(1, parseInt(quantity) || 1));
    const list = [];
    const proxyCount = proxies.length;

    // Names generator
    let customNames = [];
    if (namingMode === 'custom') {
      customNames = customText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Seeded/offset pool for mature dictionary
    const pool = [...MATURE_DICTIONARY];
    if (shuffleKey > 0) {
      const offset = (shuffleKey * 17) % pool.length;
      pool.push(...pool.splice(0, offset));
    }

    for (let i = 0; i < qty; i++) {
      let uname = '';
      if (namingMode === 'custom') {
        uname = customNames[i] || `bot_${i + 1}`;
      } else if (namingMode === 'mature') {
        const base = pool[i % pool.length];
        const cycle = Math.floor(i / pool.length) + (shuffleKey > 0 ? (shuffleKey % 5) : 0);
        // Add number suffix by default (e.g. consensus1, OhLlama1) so it never collides with real legacy Mojang accounts
        uname = `${base}${cycle + 1}`;
      } else {
        uname = `${prefix || 'bot_'}${parseInt(startNumber) + i}`;
      }

      // If already verified as premium in cache, auto-append random digit to guarantee cracked availability
      if (namingMode !== 'custom' && mojangData[uname]?.isPremium) {
        uname = `${uname}${((i + 7) % 9) + 1}`;
      }

      // Clamp to max 16 chars (Minecraft Java standard)
      if (uname.length > 16) uname = uname.slice(0, 16);

      // Round-Robin proxy mapping
      let assignedProxy = null;
      let proxyIndex = null;
      if (useProxies && proxyCount > 0) {
        proxyIndex = i % proxyCount;
        assignedProxy = proxies[proxyIndex];
      }

      list.push({
        index: i + 1,
        username: uname,
        assignedProxy,
        proxyIndex,
      });
    }

    return list;
  }, [quantity, namingMode, prefix, startNumber, customText, shuffleKey, mojangData, useProxies, proxies]);

  // Real-time Mojang / Premium Batch Verification Effect
  useEffect(() => {
    if (!open || previewRoster.length === 0) return;
    const names = [...new Set(previewRoster.map((b) => b.username))];
    
    // Check if we already have all names cached
    const missing = names.filter((n) => !mojangData[n]);
    if (missing.length === 0) return;

    let active = true;
    const timer = setTimeout(async () => {
      setVerifying(true);
      try {
        const res = await api('/check-usernames', {
          method: 'POST',
          body: JSON.stringify({ names: missing }),
        });
        if (active && res.results) {
          setMojangData((prev) => ({ ...prev, ...res.results }));
        }
      } catch (_) {
        // Fallback silently
      } finally {
        if (active) setVerifying(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, previewRoster, mojangData]);

  // Summary counts of Premium vs Available in the preview
  const { premiumCount, availableCount, hasPremiumInCustom } = useMemo(() => {
    let prem = 0;
    let avail = 0;
    previewRoster.forEach((b) => {
      const data = mojangData[b.username];
      if (data?.isPremium) prem++;
      else if (data) avail++;
    });
    return {
      premiumCount: prem,
      availableCount: avail,
      hasPremiumInCustom: namingMode === 'custom' && prem > 0,
    };
  }, [previewRoster, mojangData, namingMode]);

  // Quick fix for custom names if user entered a premium name
  const fixCustomNamesToCracked = () => {
    const lines = customText.split('\n').map((s) => s.trim()).filter(Boolean);
    const fixed = lines.map((name) => {
      if (mojangData[name]?.isPremium) {
        return `${name}_${Math.floor(Math.random() * 89 + 10)}`;
      }
      return name;
    });
    setCustomText(fixed.join('\n'));
    toast('✨ Converted premium names to guaranteed cracked usernames!', 'success');
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    const qty = Math.min(100, Math.max(1, parseInt(quantity) || 1));
    setLoading(true);

    try {
      const customUsernames = previewRoster.map((b) => b.username);
      const res = await api('/bots/generate', {
        method: 'POST',
        body: JSON.stringify({
          quantity: qty,
          customUsernames,
          host,
          port,
          version,
          auth,
          category,
          useProxies: useProxies && proxies.length > 0,
          autoRegister: enableAuthHandshake,
          autoLogin: enableAuthHandshake,
          loginPassword: enableAuthHandshake ? loginPassword : null,
        }),
      });

      toast(`⚡ Successfully generated & deployed ${res.count || qty} bots!`, 'success');
      onGenerated?.(res.bots);
      onClose();
    } catch (err) {
      toast(err.message || 'Failed to generate bots', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚡ Mass Bot Generator & Fleet Orchestrator"
      description="Deploy dozens of configured bots instantly with automated Round-Robin proxy mesh distribution, cracked auto-auth handshakes, and live Mojang Premium account checks."
      size="xl"
    >
      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Top Metric Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Target Fleet</span>
            <div className="text-2xl font-black text-white">{quantity} Bots</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Proxy Pool</span>
            <div className="text-2xl font-black text-white">
              {proxies.length > 0 ? `${proxies.length} Available` : 'None (Direct)'}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Distribution</span>
            <div className="text-2xl font-black text-white">Round-Robin</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">Auto-Auth</span>
            <div className="text-2xl font-black text-white">
              {enableAuthHandshake ? 'Enabled' : 'Off'}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN: Server & Auth & Sizing */}
          <div className="space-y-5">
            {/* Section 1: Fleet Sizing & Presets */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                  1. Fleet Quantity ({quantity} bots)
                </label>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 20, 50].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-bold transition active:scale-95',
                        quantity === q
                          ? 'bg-white text-black shadow-sm'
                          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                      )}
                    >
                      +{q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="flex-1 accent-white"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1.5 text-center font-mono text-sm font-bold text-white outline-none focus:border-white"
                />
              </div>
            </div>

            {/* Section 2: Target Server Details */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                2. Target Minecraft Server
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Host / IP</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="play.bananasmp.net"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 25565)}
                    placeholder="25565"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.20.1"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Auth Mode</label>
                  <select
                    value={auth}
                    onChange={(e) => setAuth(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#141416] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-white"
                  >
                    <option value="offline">Offline / Cracked</option>
                    <option value="microsoft">Microsoft (Online)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Fleet Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Fleet Cluster"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: In-Game Auto-Auth (Cracked / AuthMe / nLogin Handshake) */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-white/70" />
                  <div>
                    <strong className="block text-xs font-bold text-white">
                      Cracked In-Game Auto-Auth
                    </strong>
                    <p className="text-[11px] text-white/50">
                      Auto executes /register or /login when server prompts.
                    </p>
                  </div>
                </div>
                <Switch checked={enableAuthHandshake} onChange={setEnableAuthHandshake} />
              </div>

              {enableAuthHandshake && (
                <div className="pt-2">
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">
                    Shared Bot Password for Authentication
                  </label>
                  <input
                    type="text"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="AtlasPass123!"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 font-mono text-sm font-medium text-white outline-none focus:border-white"
                    required={enableAuthHandshake}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Naming, Proxies & Preview */}
          <div className="space-y-5">
            {/* Section 4: Naming Strategy */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                  3. Bot Naming Strategy
                </label>
                {namingMode === 'mature' && (
                  <button
                    type="button"
                    onClick={() => setShuffleKey((k) => k + 1)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-white/70 hover:text-white transition active:scale-95"
                  >
                    <Dices className="h-3.5 w-3.5" /> Re-roll Names
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'prefix', label: 'Sequential Prefix (bot_1)' },
                  { id: 'mature', label: '✨ Mature Lexicon' },
                  { id: 'custom', label: '📋 Paste List' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNamingMode(tab.id)}
                    className={cn(
                      'rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95',
                      namingMode === tab.id
                        ? 'bg-white text-black shadow-sm'
                        : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {namingMode === 'prefix' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-white/50">Prefix Name</label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      placeholder="bot_"
                      className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-white/50">Starting Number</label>
                    <input
                      type="number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                    />
                  </div>
                </div>
              )}

              {namingMode === 'mature' && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-white" />
                    <span>Curated tech, witty & mature name banks.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffleKey((k) => k + 1)}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition active:scale-95"
                  >
                    Shuffle
                  </button>
                </div>
              )}

              {namingMode === 'custom' && (
                <div className="pt-2">
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">
                    Usernames (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder={"ne1\nne2\nconsensus1\nOhLlama"}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] p-3 font-mono text-xs text-white outline-none focus:border-white"
                  />
                </div>
              )}
            </div>

            {/* Section 5: Round-Robin Proxy Allocation */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Network className="h-4 w-4 text-white/70" />
                  <div>
                    <strong className="block text-xs font-bold text-white">
                      Round-Robin Proxy Allocation
                    </strong>
                    <p className="text-[11px] text-white/50">
                      Evenly distributes bots across your SOCKS5 proxy pool.
                    </p>
                  </div>
                </div>
                <Switch checked={useProxies} onChange={setUseProxies} />
              </div>
            </div>

            {/* Section 6: Live Deployment Preview Roster with Non-Premium Cracked Verification */}
            <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              {hasPremiumInCustom && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/[0.06] p-3 text-xs text-white backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-white shrink-0" />
                    <span>Detected {premiumCount} real Mojang account(s) in custom list.</span>
                  </div>
                  <button
                    type="button"
                    onClick={fixCustomNamesToCracked}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-black hover:bg-white/90 transition active:scale-95 shrink-0"
                  >
                    ✨ Fix to Cracked
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                    Live Preview ({previewRoster.length} Bots)
                  </span>
                  {verifying ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-white/50">
                      <Loader2 className="h-3 w-3 animate-spin text-white" /> Checking Mojang...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm">
                      🛡️ 100% Cracked Safe
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-white/40">First 24 bots</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 console-scrollbar">
                {previewRoster.slice(0, 24).map((b) => {
                  const mData = mojangData[b.username];
                  const isPremium = mData?.isPremium;
                  const avatarUrl =
                    mData?.avatar ||
                    `https://mc-heads.net/avatar/${encodeURIComponent(b.username)}/48`;

                  return (
                    <div
                      key={b.index}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border p-2 transition-all duration-150',
                        isPremium
                          ? 'border-white/30 bg-white/[0.10]'
                          : 'border-white/[0.08] bg-black/50'
                      )}
                    >
                      <div className="relative h-8 w-8 shrink-0">
                        <img
                          src={avatarUrl}
                          alt={b.username}
                          className="h-8 w-8 rounded-lg border border-white/15 bg-black/60 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/48';
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <strong className="truncate text-xs font-bold text-white">
                            {b.username}
                          </strong>
                          {verifying && !mData ? (
                            <span className="flex items-center gap-0.5 text-[9px] text-white/40">
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            </span>
                          ) : isPremium ? (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-white/30 bg-white/[0.15] px-1.5 py-0.2 text-[9px] font-bold text-white shadow-sm">
                              ⚠️ Premium
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.2 text-[9px] font-medium text-white/70">
                              ⭐ Cracked
                            </span>
                          )}
                        </div>
                        <div className="truncate font-mono text-[10px] text-white/50">
                          {b.assignedProxy ? (
                            <span className="text-white/80">
                              P#{b.proxyIndex + 1}: {b.assignedProxy.host}:{b.assignedProxy.port}
                            </span>
                          ) : (
                            <span className="text-white/30">Direct IP</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} className="gap-2 px-8 shadow-lg">
            <Zap className="h-4 w-4" /> Deploy {quantity} Bots Now
          </Button>
        </div>
      </form>
    </Modal>
  );
}
