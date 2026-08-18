'use client';

import { useCallback, useEffect, useState } from 'react';
import { Command, Pencil, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers';
import { Button, EmptyState, Modal, PageHeader, Panel } from '@/components/ui';

const blankAlias = { name: '', cmd: '', desc: '' };

export default function AliasesPage() {
  const { toast } = useToast();
  const [aliases, setAliases] = useState([]);
  const [syncedTo, setSyncedTo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(blankAlias);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api('/custom-cmds');
      setAliases(result.cmds || []);
      setSyncedTo(result.syncedTo || 0);
    } catch (error) { toast(error.message, 'error'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const open = (alias = null) => {
    setEditing(alias);
    setModalOpen(true);
    setForm(alias ? { name: alias.name || '', cmd: alias.cmd || '', desc: alias.desc || '' } : blankAlias);
  };

  const save = async () => {
    if (!form.name.trim() || !form.cmd.trim()) return;
    setSaving(true);
    try {
      const path = editing ? `/custom-cmds/${encodeURIComponent(editing.id)}` : '/custom-cmds';
      await api(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      toast(editing ? 'Alias updated' : 'Alias created', 'success');
      setEditing(null);
      setModalOpen(false);
      setForm(blankAlias);
      await load();
    } catch (error) { toast(error.message, 'error'); } finally { setSaving(false); }
  };

  const remove = async (alias) => {
    if (!window.confirm(`Delete the alias ${alias.name}?`)) return;
    try { await api(`/custom-cmds/${encodeURIComponent(alias.id)}`, { method: 'DELETE' }); toast('Alias deleted', 'success'); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const sync = async () => {
    setSyncing(true);
    try { const result = await api('/custom-cmds/sync', { method: 'POST', body: '{}' }); setSyncedTo(result.pushed || 0); toast(`Aliases synced to ${result.pushed || 0} running bots`, 'success'); }
    catch (error) { toast(error.message, 'error'); } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation & Macros"
        title="Aliases"
        description="Private command shortcuts that sync exclusively to bots owned by this account."
        actions={
          <>
            <Button size="sm" onClick={sync} loading={syncing}>
              <RefreshCw className="h-3.5 w-3.5" /> Sync to {syncedTo} bots
            </Button>
            <Button size="sm" variant="primary" onClick={() => open()}>
              <Plus className="h-3.5 w-3.5" /> New alias
            </Button>
          </>
        }
      />

      {aliases.length ? (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Alias</th>
                <th>Target Command</th>
                <th>Description</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias) => (
                <tr key={alias.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg border border-white/10 bg-white/[0.05] p-1.5 text-white">
                        <Command className="h-3.5 w-3.5" />
                      </span>
                      <strong className="text-sm font-semibold text-white">{alias.name}</strong>
                    </div>
                  </td>
                  <td>
                    <code className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-white">
                      {alias.cmd}
                    </code>
                  </td>
                  <td className="max-w-md text-xs text-white/40">{alias.desc || 'No description provided.'}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(alias)} aria-label="Edit alias">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(alias)} aria-label="Delete alias">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <Panel>
            <EmptyState
              icon={Command}
              title="No aliases yet"
              description="Create reusable names for commands you send often."
              action={
                <Button variant="primary" onClick={() => open()}>
                  <Plus className="h-4 w-4" /> Create alias
                </Button>
              }
            />
          </Panel>
        )
      )}

      <Panel className="flex items-start gap-4 p-6">
        <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white/50">
          <Send className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">Isolated Tenant Execution</h2>
          <p className="mt-1 text-xs leading-6 text-white/40">
            These aliases are stored securely inside your account workspace. Other accounts or bots will never receive or overwrite your personal macro aliases.
          </p>
        </div>
      </Panel>

      <Modal
        open={modalOpen}
        onClose={() => {
          setEditing(null);
          setModalOpen(false);
          setForm(blankAlias);
        }}
        title={editing ? 'Edit alias' : 'New alias'}
        footer={
          <>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(false);
                setForm(blankAlias);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={save} loading={saving} disabled={!form.name.trim() || !form.cmd.trim()}>
              {editing ? 'Save alias' : 'Create alias'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label>
            <span className="field-label">Alias name</span>
            <input
              className="field-control"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="home"
            />
          </label>
          <label>
            <span className="field-label">Command</span>
            <input
              className="field-control font-mono"
              value={form.cmd}
              onChange={(event) => setForm({ ...form, cmd: event.target.value })}
              placeholder="!home"
            />
          </label>
          <label>
            <span className="field-label">Description</span>
            <textarea
              className="field-control min-h-24 resize-y"
              value={form.desc}
              onChange={(event) => setForm({ ...form, desc: event.target.value })}
              placeholder="Optional note..."
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
