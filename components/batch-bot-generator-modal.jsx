'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  Globe,
  KeyRound,
  Layers,
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

const MATURE_DICTIONARY = [
  'consensus', 'zeroentropy', 'nullstate', 'defragged', 'subroutine',
  'deadlock', 'hyperthread', 'paperplane', 'coldbrew', 'ambientnoise',
  'bitshift', 'monolith', 'subtlechaos', 'halftone', 'packetloss',
  'syntaxerror', 'stacktrace', 'eventloop', 'asyncawait', 'nullpointer',
  'heapexhaust', 'bytecode', 'checksum', 'hashcollision', 'racecondition',
  'coredecay', 'microcode', 'immutable', 'deterministic', 'OhLlama',
  'notyourllama', 'notyourfault', 'almosthuman', 'barelythere', 'maybeoffline',
  'definitelynot', 'whoasked', 'whynotboth', 'sorrynotsorry', 'justvibing',
  'needcoffee', 'nocoffeenowork', 'worksforme', 'runtimepanic', 'ghostinmachine',
  'velvet', 'zenith', 'solitude', 'lucid', 'frost', 'halcyon', 'obsidian',
  'spectrum', 'static', 'radiance', 'vertex', 'chroma', 'monochrome', 'mirage'
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

    for (let i = 0; i < qty; i++) {
      let uname = '';
      if (namingMode === 'custom') {
        uname = customNames[i] || `bot_${i + 1}`;
      } else if (namingMode === 'mature') {
        const base = MATURE_DICTIONARY[i % MATURE_DICTIONARY.length];
        const suffix = Math.floor(i / MATURE_DICTIONARY.length) + 1;
        uname = suffix > 1 ? `${base}${suffix}` : base;
      } else {
        uname = `${prefix || 'bot_'}${parseInt(startNumber) + i}`;
      }

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
  }, [quantity, namingMode, prefix, startNumber, customText, useProxies, proxies]);

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
      description="Deploy dozens of configured bots instantly with automated Round-Robin proxy mesh distribution and cracked auto-auth handshakes."
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
                        'rounded-lg px-2.5 py-1 text-xs font-bold transition',
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
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Server IP / Host</label>
                  <input
                    type="text"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="play.bananasmp.net"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value) || 25565)}
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.20.1"
                    className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Auth Mode</label>
                  <select
                    value={auth}
                    onChange={(e) => setAuth(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-3.5 py-2 text-sm font-medium text-white outline-none focus:border-white"
                  >
                    <option value="offline">Offline / Cracked</option>
                    <option value="microsoft">Microsoft Account</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/50">Category Tag</label>
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

            {/* Section 3: Auto-Register & Auto-Login Handshake */}
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-white/70" />
                  <div>
                    <strong className="block text-xs font-bold text-white">
                      Auto-Register & Auto-Login Handshake
                    </strong>
                    <p className="text-[11px] text-white/50">
                      Executes <code className="text-white font-mono">/register</code> & <code className="text-white font-mono">/login</code> on spawn.
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
              <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                3. Bot Naming Strategy
              </label>
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
                      'rounded-xl px-3 py-1.5 text-xs font-bold transition',
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

              {useProxies && (
                <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70 space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">
                      {proxies.length > 0
                        ? `🟢 ${proxies.length} Proxies in Pool`
                        : '⚠️ No proxies in pool (direct connection)'}
                    </span>
                    <span className="font-mono text-[10px] text-white/50">
                      Cycle: 1➔1, 2➔2 ... {proxies.length > 0 ? `${proxies.length + 1}➔1` : ''}
                    </span>
                  </div>
                  {proxies.length > 0 && (
                    <p className="text-[11px] text-white/50">
                      When deploying {quantity} bots, proxy #{1} to #{proxies.length} are attached in sequence and wrap around automatically.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Section 6: Live Deployment Preview Roster */}
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Live Preview ({previewRoster.length} Bots)
                </span>
                <span className="text-[11px] text-white/40 font-mono">First 12 bots</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 console-scrollbar">
                {previewRoster.slice(0, 12).map((b) => (
                  <div
                    key={b.index}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-black/50 p-2"
                  >
                    <img
                      src={`https://mc-heads.net/avatar/${encodeURIComponent(b.username)}/48`}
                      alt={b.username}
                      className="h-7 w-7 rounded-lg border border-white/15 bg-black/60 object-cover shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/48';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-xs font-bold text-white">
                        {b.username}
                      </strong>
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
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} className="gap-2 px-8">
            <Zap className="h-4 w-4" /> Deploy {quantity} Bots Now
          </Button>
        </div>
      </form>
    </Modal>
  );
}
