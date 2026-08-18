'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Database,
  Layers,
  Network,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button, Panel, StatusBadge } from '@/components/ui';
import { api, cn } from '@/lib/api';

export function ShardTelemetryCard({ className }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShards = async () => {
    try {
      setRefreshing(true);
      const res = await api('/shards');
      if (res.ok) setData(res);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShards();
    const interval = setInterval(fetchShards, 8000);
    return () => clearInterval(interval);
  }, []);

  const shardIcons = {
    'shard-00': Zap,
    'shard-01': Network,
    'shard-02': Activity,
    'shard-03': Server,
  };

  return (
    <Panel className={cn('p-6 sm:p-7', className)}>
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] text-white shadow-sm">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-extrabold tracking-tight text-white">Cluster Fleet Shards</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]" />
                {data?.healthyShards || 4}/{data?.totalShards || 4} Active
              </span>
            </div>
            <p className="mt-1 text-xs font-medium text-white/60">
              Region: <span className="font-mono text-white/80">{data?.region || 'ap-singapore-1'}</span> · Cluster:{' '}
              <span className="font-mono text-white/80">{data?.clusterId || 'atlas-singapore-01'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={fetchShards} loading={refreshing} className="h-9 text-xs font-semibold">
            <RefreshCw className="h-4 w-4" /> Sync Shards
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.shards || [
          { id: 'shard-00', name: 'Core Ingress', role: 'SSE Event Pipeline', status: 'healthy', load: 8, memoryMb: '12.4' },
          { id: 'shard-01', name: 'Network Pool', role: 'SOCKS5 Tunnels', status: 'idle', load: 0, proxiesAllocated: 0 },
          { id: 'shard-02', name: 'Automation', role: 'Scheduler & Jobs', status: 'healthy', load: 4, tickRate: '1.0 Hz' },
          { id: 'shard-03', name: 'Process Mesh', role: 'Bot Spawner', status: 'ready', load: 12, activeBots: 2 },
        ]).map((shard) => {
          const Icon = shardIcons[shard.id] || Server;
          return (
            <div
              key={shard.id}
              className="flex flex-col justify-between rounded-2xl border border-white/12 bg-white/[0.03] p-5 backdrop-blur-2xl transition-all duration-300 hover:border-white/30 hover:bg-white/[0.07]"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-white">{shard.name}</strong>
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/50">
                        {shard.id}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {shard.status}
                  </span>
                </div>

                <p className="mt-3 text-xs font-medium text-white/70">{shard.role}</p>

                {/* Shard Load Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-white/60">
                    <span>Shard Load</span>
                    <span className="font-mono text-white/90">{shard.load}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                      style={{ width: `${Math.max(6, shard.load)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Shard Metadata Footer */}
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-xs font-semibold text-white/60">
                {shard.memoryMb ? (
                  <span>Heap: {shard.memoryMb} MB</span>
                ) : shard.proxiesAllocated !== undefined ? (
                  <span>Proxies: {shard.proxiesAllocated} pool</span>
                ) : shard.tickRate ? (
                  <span>Tick: {shard.tickRate}</span>
                ) : (
                  <span>Workers: {shard.activeBots || 0} bots</span>
                )}

                <span>{shard.pingMs ? `${shard.pingMs}ms latency` : 'Isolated'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
