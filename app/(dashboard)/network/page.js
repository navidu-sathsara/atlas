'use client';

import { useMemo, useState } from 'react';
import { Gauge, Network, Plus, RefreshCw, ShieldCheck, Trash2, Unplug, WandSparkles } from 'lucide-react';
import { useDashboard } from '@/components/dashboard-provider';
import { useToast } from '@/components/providers';
import { Button, Checkbox, EmptyState, Modal, PageHeader, Panel, StatCard, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, proxyLabel } from '@/lib/format';

export default function NetworkPage() {
  const { bots, proxies, proxyCapacity, refreshProxies, refreshBots } = useDashboard();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [text, setText] = useState('');
  const [replace, setReplace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [onlyWorking, setOnlyWorking] = useState(true);
  const [overwrite, setOverwrite] = useState(false);
  const [noteProxy, setNoteProxy] = useState(null);
  const [note, setNote] = useState('');

  const stats = useMemo(() => {
    const used = proxies.reduce((sum, proxy) => sum + proxyCapacity - Number(proxy.freeSlots ?? proxyCapacity), 0);
    const capacity = proxies.length * proxyCapacity;
    return { used, capacity, free: Math.max(0, capacity - used), healthy: proxies.filter((proxy) => proxy.alive).length, failed: proxies.filter((proxy) => proxy.lastCheck && !proxy.alive).length };
  }, [proxies, proxyCapacity]);

  const add = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await api('/proxies', { method: 'POST', body: JSON.stringify({ text, replace }) });
      await refreshProxies();
      toast('Proxy pool updated', 'success');
      setAddOpen(false);
      setText('');
      setReplace(false);
    } catch (error) { toast(error.message, 'error'); } finally { setSubmitting(false); }
  };

  const checkAll = async () => {
    setChecking(true);
    try {
      const result = await api('/proxies/check-all', { method: 'POST', body: '{}' });
      await refreshProxies();
      toast(`${result.working || 0} online · ${result.failed || 0} offline`, result.failed ? 'warning' : 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setChecking(false); }
  };

  const assign = async () => {
    setAssigning(true);
    try {
      const result = await api('/proxies/assign', { method: 'POST', body: JSON.stringify({ onlyWorking, overwrite }) });
      await Promise.all([refreshProxies(), refreshBots()]);
      toast(`Assigned ${result.assigned?.length || 0} bot${result.assigned?.length === 1 ? '' : 's'}`, 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setAssigning(false); }
  };

  const checkOne = async (proxy) => {
    try {
      const result = await api(`/proxies/${encodeURIComponent(proxy.id)}/check`, { method: 'POST', body: '{}' });
      await refreshProxies();
      toast(result.check?.ok ? `${proxyLabel(proxy)} is online` : `${proxyLabel(proxy)} failed`, result.check?.ok ? 'success' : 'warning');
    } catch (error) { toast(error.message, 'error'); }
  };

  const remove = async (proxy) => {
    if (!window.confirm(`Remove ${proxyLabel(proxy)} from this pool? Assigned bots will return to a direct connection.`)) return;
    try {
      const result = await api(`/proxies/${encodeURIComponent(proxy.id)}`, { method: 'DELETE' });
      await Promise.all([refreshProxies(), refreshBots()]);
      toast(result.detached ? `Proxy removed · ${result.detached} bot(s) detached` : 'Proxy removed', 'success');
    } catch (error) { toast(error.message, 'error'); }
  };

  const saveNote = async () => {
    try {
      await api(`/proxies/${encodeURIComponent(noteProxy.id)}`, { method: 'PATCH', body: JSON.stringify({ note }) });
      await refreshProxies();
      setNoteProxy(null);
      toast('Proxy note saved', 'success');
    } catch (error) { toast(error.message, 'error'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Network Infrastructure"
        title="Network & Proxies"
        description="Configure SOCKS5 proxy pools, inspect latency and throughput, and dynamically balance bot connections."
        actions={
          <>
            <Button size="sm" onClick={assign} loading={assigning}>
              <WandSparkles className="h-3.5 w-3.5" /> Auto-assign
            </Button>
            <Button size="sm" onClick={checkAll} loading={checking}>
              <RefreshCw className="h-3.5 w-3.5" /> Test all
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add proxies
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Endpoints" value={proxies.length} icon={Network} />
        <StatCard label="Online" value={stats.healthy} icon={ShieldCheck} tone="green" />
        <StatCard label="Slots used" value={stats.used} hint={`${stats.capacity} total capacity`} icon={Gauge} tone="blue" />
        <StatCard label="Slots free" value={stats.free} hint={`${proxyCapacity} bots per endpoint`} icon={Unplug} />
        <StatCard label="Failed" value={stats.failed} icon={RefreshCw} tone={stats.failed ? 'red' : 'default'} />
      </div>

      <Panel className="p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Checkbox
            checked={onlyWorking}
            onChange={setOnlyWorking}
            label="Verified endpoints only"
            description="Auto-assignment skips endpoints that have not passed a recent health check."
          />
          <Checkbox
            checked={overwrite}
            onChange={setOverwrite}
            label="Replace current assignments"
            description={`Redistribute all ${bots.length} visible bots across the pool.`}
          />
        </div>
      </Panel>

      {proxies.length ? (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Health</th>
                <th>Capacity</th>
                <th>Assigned Bots</th>
                <th>Owner / Note</th>
                <th>Last Checked</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {proxies.map((proxy) => {
                const used = proxyCapacity - Number(proxy.freeSlots ?? proxyCapacity);
                return (
                  <tr key={proxy.id}>
                    <td>
                      <div className="font-mono text-xs font-semibold text-white">{proxyLabel(proxy)}</div>
                      <div className="mt-1 text-[10px] text-white/35">
                        {proxy.hasAuth ? 'Authenticated SOCKS5' : 'SOCKS5'}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={proxy.lastCheck ? (proxy.alive ? 'online' : 'error') : 'pending'} />
                      {proxy.latency && <div className="mt-1 text-[10px] text-white/40">{proxy.latency} ms</div>}
                    </td>
                    <td>
                      <div className="text-xs tabular-nums text-white/80">
                        {used}/{proxyCapacity}
                      </div>
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white transition-all"
                          style={{ width: `${Math.min(100, (used / proxyCapacity) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {(proxy.assignedTo || []).length ? (
                          proxy.assignedTo.map((item) => (
                            <span
                              key={item.id || item}
                              className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/70"
                            >
                              {item.username || item.id || item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-white/35">Unassigned</span>
                        )}
                        {proxy.hiddenAssignments > 0 && (
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/40">
                            +{proxy.hiddenAssignments} hidden
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setNoteProxy(proxy);
                          setNote(proxy.note || '');
                        }}
                        className="max-w-48 text-left text-xs text-white/60 transition hover:text-white"
                      >
                        <span className="block truncate font-medium">{proxy.ownerLabel || 'Your pool'}</span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-white/35">
                          {proxy.note || 'Add a note...'}
                        </span>
                      </button>
                    </td>
                    <td className="text-xs text-white/40">
                      {proxy.checkedAt ? formatDate(proxy.checkedAt) : 'Never'}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => checkOne(proxy)} aria-label="Test proxy">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => remove(proxy)} aria-label="Delete proxy">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Panel>
          <EmptyState
            icon={Network}
            title="No proxies in this workspace"
            description="Add SOCKS5 endpoints, run automated latency tests, and balance bot traffic seamlessly."
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add proxies
              </Button>
            }
          />
        </Panel>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add proxy endpoints"
        description="One SOCKS5 endpoint per line (e.g. host:port or user:pass@host:port)."
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={add} loading={submitting} disabled={!text.trim()}>
              Update pool
            </Button>
          </>
        }
      >
        <label>
          <span className="field-label">SOCKS5 endpoints</span>
          <textarea
            className="field-control min-h-44 resize-y font-mono text-xs"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'host:port\nhost:port:user:password\nsocks5://user:password@host:port'}
          />
        </label>
        <div className="mt-4">
          <Checkbox
            checked={replace}
            onChange={setReplace}
            label="Replace the current pool"
            description="Existing endpoints owned by this account will be removed first."
          />
        </div>
      </Modal>

      <Modal open={!!noteProxy} onClose={() => setNoteProxy(null)} title="Proxy note" description={noteProxy ? proxyLabel(noteProxy) : ''} footer={<><Button onClick={() => setNoteProxy(null)}>Cancel</Button><Button variant="primary" onClick={saveNote}>Save note</Button></>}>
        <label><span className="field-label">Internal note</span><input className="field-control" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Residential · Europe" /></label>
      </Modal>
    </div>
  );
}
