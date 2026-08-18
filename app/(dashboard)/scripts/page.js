'use client';

import { useCallback, useEffect, useState } from 'react';
import { Braces, Clock3, FileCode2, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useDashboard } from '@/components/dashboard-provider';
import { useToast } from '@/components/providers';
import { Button, Checkbox, EmptyState, Modal, PageHeader, Panel, StatusBadge, Tabs } from '@/components/ui';

const blankScript = { name: '', type: 'interval', enabled: true, description: '', actionType: 'command', actionValue: '', interval: '30', pattern: '', matchType: 'contains', cooldown: '3', botIds: [] };

export default function ScriptsPage() {
  const { bots } = useDashboard();
  const { toast } = useToast();
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankScript);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await api('/scripts'); setScripts(result.scripts || []); }
    catch (error) { toast(error.message, 'error'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const open = (script = null) => {
    setEditing(script);
    if (script) setForm({ name: script.name || '', type: script.type || 'interval', enabled: script.enabled !== false, description: script.description || '', actionType: script.action?.type || 'command', actionValue: script.action?.value || '', interval: String(Math.round((script.interval || 5000) / 1000)), pattern: script.trigger?.pattern || '', matchType: script.trigger?.matchType || 'contains', cooldown: String(Math.round((script.cooldown || 3000) / 1000)), botIds: script.botIds || [] });
    else setForm({ ...blankScript, botIds: [] });
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { name: form.name.trim(), type: form.type, enabled: form.enabled, description: form.description.trim(), action: { type: form.actionType, value: form.actionValue.trim() }, botIds: form.botIds };
      if (form.type === 'interval') body.interval = Math.max(1, Number(form.interval) || 30) * 1000;
      else { body.trigger = { pattern: form.pattern.trim(), matchType: form.matchType, ignoreCase: true, source: 'all' }; body.cooldown = Math.max(0, Number(form.cooldown) || 0) * 1000; }
      const path = editing ? `/scripts/${encodeURIComponent(editing.id)}` : '/scripts';
      await api(path, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      toast(editing ? 'Script saved' : 'Script created', 'success');
      setModalOpen(false);
      await load();
    } catch (error) { toast(error.message, 'error'); } finally { setSaving(false); }
  };

  const toggle = async (script) => {
    try { await api(`/scripts/${encodeURIComponent(script.id)}`, { method: 'PATCH', body: JSON.stringify({ enabled: script.enabled === false }) }); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const remove = async (script) => {
    if (!window.confirm(`Delete ${script.name} from the library and its target bots?`)) return;
    try { await api(`/scripts/${encodeURIComponent(script.id)}`, { method: 'DELETE' }); toast('Script deleted', 'success'); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleBot = (id, checked) => setForm((current) => ({ ...current, botIds: checked ? [...new Set([...current.botIds, id])] : current.botIds.filter((botId) => botId !== id) }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation Engine"
        title="Scripts"
        description="Reusable account automation deployed to selected bots, supporting interval ticks and reactive chat/message triggers."
        actions={
          <Button size="sm" variant="primary" onClick={() => open()}>
            <Plus className="h-3.5 w-3.5" /> New script
          </Button>
        }
      />
      {scripts.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {scripts.map((script) => (
            <Panel key={script.id} className="flex flex-col justify-between p-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white">
                    {script.type === 'interval' ? <Clock3 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                  </span>
                  <StatusBadge status={script.enabled === false ? 'stopped' : 'running'} />
                </div>
                <h2 className="mt-4 truncate text-base font-semibold text-white">{script.name}</h2>
                <p className="mt-1 min-h-10 text-xs leading-5 text-white/40">
                  {script.description || 'No description provided.'}
                </p>

                <div className="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-xs font-mono">
                  <div className="flex justify-between gap-3">
                    <span className="text-white/35 font-sans">Trigger</span>
                    <span className="text-right text-white/80">
                      {script.type === 'interval'
                        ? `Every ${Math.round((script.interval || 5000) / 1000)}s`
                        : `${script.trigger?.matchType || 'contains'}: ${script.trigger?.pattern || ''}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/35 font-sans">Action</span>
                    <code className="max-w-[65%] truncate text-right text-white">
                      {script.action?.type === 'chat' ? 'chat' : 'command'}: {script.action?.value}
                    </code>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-white/35 font-sans">Target Bots</span>
                    <span className="text-white/80 font-sans">
                      {script.botIds?.length || 0} bot{script.botIds?.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  variant={script.enabled === false ? 'success' : 'secondary'}
                  onClick={() => toggle(script)}
                >
                  {script.enabled === false ? 'Enable' : 'Disable'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => open(script)} aria-label="Edit script">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(script)} aria-label="Delete script">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        !loading && (
          <Panel>
            <EmptyState
              icon={Braces}
              title="No scripts yet"
              description="Create an interval or message-trigger script and deploy it to one or more of your bots."
              action={
                <Button variant="primary" onClick={() => open()}>
                  <Plus className="h-4 w-4" /> Create script
                </Button>
              }
            />
          </Panel>
        )
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit script' : 'New script'}
        description="Scripts are private and securely isolated to your account workspace."
        wide
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save} loading={saving} disabled={!form.name.trim() || !form.actionValue.trim()}>
              Save script
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={form.name} onChange={(value) => setField('name', value)} placeholder="Auto reconnect / AFK Loop" />
          <label>
            <span className="field-label">Trigger type</span>
            <select className="field-control" value={form.type} onChange={(event) => setField('type', event.target.value)}>
              <option value="interval">Interval (Periodic)</option>
              <option value="message-trigger">Message trigger (Chat/Log)</option>
            </select>
          </label>
          <label>
            <span className="field-label">Action type</span>
            <select className="field-control" value={form.actionType} onChange={(event) => setField('actionType', event.target.value)}>
              <option value="command">Bot command</option>
              <option value="chat">Chat message</option>
            </select>
          </label>
          <Field label="Action value" value={form.actionValue} onChange={(value) => setField('actionValue', value)} placeholder="home or !say hello" />
          {form.type === 'interval' ? (
            <Field label="Interval (seconds)" type="number" value={form.interval} onChange={(value) => setField('interval', value)} />
          ) : (
            <>
              <Field label="Message pattern" value={form.pattern} onChange={(value) => setField('pattern', value)} placeholder="server restarting" />
              <label>
                <span className="field-label">Match mode</span>
                <select className="field-control" value={form.matchType} onChange={(event) => setField('matchType', event.target.value)}>
                  <option value="contains">Contains</option>
                  <option value="exact">Exact</option>
                  <option value="regex">Regular expression</option>
                </select>
              </label>
              <Field label="Cooldown (seconds)" type="number" value={form.cooldown} onChange={(value) => setField('cooldown', value)} />
            </>
          )}
          <label className="sm:col-span-2">
            <span className="field-label">Description</span>
            <textarea
              className="field-control min-h-20 resize-y"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Optional internal note..."
            />
          </label>
          <div className="sm:col-span-2">
            <span className="field-label">Target bots</span>
            {bots.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {bots.map((bot) => (
                  <Checkbox
                    key={bot.id}
                    checked={form.botIds.includes(bot.id)}
                    onChange={(checked) => toggleBot(bot.id, checked)}
                    label={bot.config?.username || bot.id}
                    description={`${bot.id} · ${bot.config?.category || 'Uncategorized'}`}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-white/40">
                Deploy a bot before assigning scripts.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <Checkbox
              checked={form.enabled}
              onChange={(checked) => setField('enabled', checked)}
              label="Enabled"
              description="The script will be synced to its selected bot folders immediately."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) { return <label><span className="field-label">{label}</span><input className="field-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>; }
