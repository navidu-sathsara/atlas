'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Bot,
  Boxes,
  CircleStop,
  Network,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Tags,
} from 'lucide-react';
import { useDashboard } from '@/components/dashboard-provider';
import { useToast } from '@/components/providers';
import { ShardTelemetryCard } from '@/components/shard-telemetry';
import { Button, EmptyState, PageHeader, Panel, StatCard, StatusBadge } from '@/components/ui';
import { api, cn } from '@/lib/api';
import { botLabel, categoryOf, relativeTime } from '@/lib/format';

export default function OverviewPage() {
  const { bots, proxies, loading, refreshBots } = useDashboard();
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    api('/jobs').then((result) => setJobs(result.jobs || [])).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const running = bots.filter((bot) => bot.status === 'running').length;
    const errors = bots.filter((bot) => bot.status === 'error').length;
    const usedSlots = proxies.reduce(
      (total, proxy) => total + (proxy.assignedTo?.length || 0) + (proxy.hiddenAssignments || 0),
      0
    );
    return {
      running,
      stopped: bots.length - running - errors,
      errors,
      categories: new Set(bots.map(categoryOf)).size,
      healthyProxies: proxies.filter((proxy) => proxy.alive).length,
      usedSlots,
    };
  }, [bots, proxies]);

  const lifecycle = async (bot, action) => {
    setBusy(`${bot.id}:${action}`);
    try {
      await api(`/bots/${encodeURIComponent(bot.id)}/${action}`, { method: 'POST' });
      toast(`${botLabel(bot)} ${action === 'start' ? 'started' : 'stopped'}`, 'success');
      window.setTimeout(refreshBots, action === 'start' ? 500 : 1800);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const broadcast = async (event) => {
    event.preventDefault();
    const value = command.trim();
    if (!value) return;
    setSending(true);
    try {
      const result = await api('/mass-cmd', { method: 'POST', body: JSON.stringify({ cmd: value }) });
      toast(`Command queued for ${result.total} running bot${result.total === 1 ? '' : 's'}`, 'success');
      setCommand('');
      const data = await api('/jobs');
      setJobs(data.jobs || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace Control Plane"
        title="Overview"
        description="A live, real-time control plane of your bot fleet, network capacity, and automation activity."
        actions={
          <>
            <Link href="/network">
              <Button size="sm">
                <Network className="h-3.5 w-3.5" />
                Network
              </Button>
            </Link>
            <Link href="/bots">
              <Button size="sm" variant="primary">
                <Bot className="h-3.5 w-3.5" />
                Manage bots
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total bots" value={bots.length} hint="In your fleet" icon={Boxes} />
        <StatCard
          label="Running"
          value={stats.running}
          hint={`${bots.length ? Math.round((stats.running / bots.length) * 100) : 0}% active`}
          icon={Play}
          tone="green"
        />
        <StatCard label="Stopped" value={stats.stopped} hint="Ready to launch" icon={CircleStop} />
        <StatCard
          label="Errors"
          value={stats.errors}
          hint="Require attention"
          icon={Activity}
          tone={stats.errors ? 'red' : 'default'}
        />
        <StatCard
          label="Proxy pool"
          value={`${stats.healthyProxies}/${proxies.length}`}
          hint={`${stats.usedSlots} assigned`}
          icon={ShieldCheck}
          tone="blue"
        />
        <StatCard label="Categories" value={stats.categories} hint="Fleet groups" icon={Tags} tone="amber" />
      </div>

      {/* Cluster Fleet Shards & Telemetry Engine */}
      <ShardTelemetryCard />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.8fr)]">
        {/* Fleet Grid */}
        <Panel className="overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-6 py-4">
            <div>
              <h2 className="font-semibold text-white">Active Fleet</h2>
              <p className="mt-0.5 text-xs text-white/35">Live status from control service</p>
            </div>
            <Link
              href="/bots"
              className="flex items-center gap-1 text-xs font-semibold text-white/60 transition hover:text-white"
            >
              View all fleet <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="p-12 text-center text-sm text-white/35">Loading fleet…</div>
          ) : bots.length ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
              {bots.slice(0, 9).map((bot) => (
                <article
                  key={bot.id}
                  className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="relative h-11 w-11 shrink-0">
                          <img
                            src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.config?.username || 'MHF_Steve')}/48`}
                            alt={botLabel(bot)}
                            className="h-11 w-11 rounded-xl border border-white/15 bg-black/60 object-cover shadow-sm transition group-hover:scale-105"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/48';
                            }}
                          />
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black',
                              bot.status === 'running'
                                ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,1)]'
                                : bot.status === 'error'
                                ? 'bg-white/50'
                                : 'bg-white/20'
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/bots?bot=${encodeURIComponent(bot.id)}`}
                              className="block truncate text-sm font-extrabold text-white transition hover:underline"
                            >
                              {bot.config?.username || bot.id}
                            </Link>
                            <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/60">
                              {bot.id}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-white/60">
                            {bot.config?.host || 'No server'} · {categoryOf(bot)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={bot.status} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="font-mono text-[10px] text-white/30 truncate max-w-[120px]">{bot.id}</span>
                    {bot.status === 'running' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === `${bot.id}:stop`}
                        onClick={() => lifecycle(bot, 'stop')}
                      >
                        <CircleStop className="h-3.5 w-3.5" /> Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={busy === `${bot.id}:start`}
                        onClick={() => lifecycle(bot, 'start')}
                      >
                        <Play className="h-3.5 w-3.5" /> Start
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title="No bots deployed"
              description="Deploy your first bot to begin building your autonomous fleet."
              action={
                <Link href="/bots">
                  <Button variant="primary">Deploy a bot</Button>
                </Link>
              }
            />
          )}
        </Panel>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white">
                <Radio className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-white">Fleet Broadcast</h2>
                <p className="text-xs text-white/35">Send command to every running bot</p>
              </div>
            </div>
            <form onSubmit={broadcast} className="mt-4 space-y-3">
              <textarea
                className="field-control min-h-24 resize-none font-mono text-xs"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="!say Service update in 5 minutes..."
              />
              <Button type="submit" variant="primary" loading={sending} disabled={!command.trim()} className="w-full">
                <Send className="h-3.5 w-3.5" /> Queue broadcast
              </Button>
            </form>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                <p className="text-xs text-white/35">Background broadcast jobs</p>
              </div>
              <Link href="/activity" className="text-xs font-semibold text-white/50 hover:text-white">
                All activity
              </Link>
            </div>
            {jobs.length ? (
              <div className="divide-y divide-white/[0.05]">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="px-6 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-mono text-xs text-white/80">{job.cmd}</p>
                      <StatusBadge status={job.status === 'running' ? 'running_job' : job.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-white/35">
                      {job.done || 0}/{job.total || 0} processed · {relativeTime(job.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-white/30">No commands have been broadcast yet.</div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
