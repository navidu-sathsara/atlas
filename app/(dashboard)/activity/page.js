'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock3, RefreshCw, Send, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { Button, EmptyState, PageHeader, Panel, StatCard, StatusBadge } from '@/components/ui';
import { useToast } from '@/components/providers';

export default function ActivityPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const result = await api('/jobs');
      setJobs(result.jobs || []);
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  const counts = useMemo(() => ({
    running: jobs.filter((job) => job.status === 'running').length,
    complete: jobs.filter((job) => job.status === 'done' || job.status === 'completed').length,
    failed: jobs.filter((job) => ['failed', 'partial'].includes(job.status)).length,
  }), [jobs]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation Logs"
        title="Activity"
        description="Persistent execution telemetry for mass broadcast jobs and automated background queues."
        actions={
          <Button size="sm" onClick={() => load()} loading={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="All jobs" value={jobs.length} icon={Activity} />
        <StatCard label="Running" value={counts.running} icon={Clock3} tone="blue" />
        <StatCard label="Completed" value={counts.complete} icon={CheckCircle2} tone="green" />
        <StatCard label="Attention" value={counts.failed} icon={XCircle} tone={counts.failed ? 'red' : 'default'} />
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-white/[0.07] px-6 py-4">
          <h2 className="font-semibold text-white">Broadcast Jobs</h2>
          <p className="mt-0.5 text-xs text-white/35">Background tasks continue reliably even when disconnected.</p>
        </div>
        {!jobs.length && !loading ? (
          <EmptyState
            icon={Send}
            title="No activity yet"
            description="Broadcast a command from Overview or Bots and its execution telemetry will stream here."
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {jobs.map((job) => {
              const total = Number(job.total || 0);
              const done = Number(job.done || 0);
              const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
              return (
                <article key={job.id} className="p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <Send className="h-4 w-4 shrink-0 text-white/70" />
                        <code className="truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-sm font-semibold text-white">
                          {job.cmd}
                        </code>
                      </div>
                      <p className="mt-2 text-xs text-white/35">
                        Created {formatDate(job.createdAt)} by {job.ownerLabel || 'workspace user'}
                      </p>
                    </div>
                    <StatusBadge status={job.status === 'running' ? 'running_job' : job.status} />
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/40">
                    <span>
                      {done}/{total} processed ({progress}%)
                    </span>
                    <span className="text-white/80">{job.ok || 0} successful</span>
                    <span>{job.skipped || 0} skipped</span>
                    <span>{job.staggerMs ? `${job.staggerMs}ms stagger` : 'Immediate'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
