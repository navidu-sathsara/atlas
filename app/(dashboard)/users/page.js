'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import { Button, Checkbox, EmptyState, Modal, PageHeader, Panel, StatusBadge } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

const blankUser = { email: '', password: '', role: 'user', allBots: false };

export default function UsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankUser);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (me.role !== 'admin') return;
    setLoading(true);
    try { const result = await api('/users'); setUsers(result.users || []); }
    catch (error) { toast(error.message, 'error'); } finally { setLoading(false); }
  }, [me.role, toast]);
  useEffect(() => { load(); }, [load]);

  const open = (account = null) => {
    setEditing(account);
    setForm(account ? { email: account.email, password: '', role: account.role, allBots: !!account.permissions?.allBots } : blankUser);
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { email: form.email.trim(), role: form.role, permissions: { allBots: form.allBots, botIds: editing?.permissions?.botIds || [], categories: editing?.permissions?.categories || [] } };
      if (form.password) body.password = form.password;
      await api(editing ? `/users/${editing.id}` : '/users', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      toast(editing ? 'User updated' : 'User created', 'success');
      setModalOpen(false);
      await load();
    } catch (error) { toast(error.message, 'error'); } finally { setSaving(false); }
  };

  const remove = async (account) => {
    if (!window.confirm(`Delete ${account.email}? Their bots and proxies must be reassigned first.`)) return;
    try { await api(`/users/${account.id}`, { method: 'DELETE' }); toast('User deleted', 'success'); await load(); }
    catch (error) { toast(error.message, 'error'); }
  };

  if (me.role !== 'admin') return <div className="space-y-6"><PageHeader eyebrow="Administration" title="Users" description="Account administration is restricted to panel administrators." /><Panel><EmptyState icon={Shield} title="Administrator access required" description="Your account can manage its own resources, aliases, scripts, schedules, and preferences." /></Panel></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Access & Identity"
        title="Users"
        description="Provision tenant accounts and configure resource boundaries across the fleet."
        actions={
          <Button size="sm" variant="primary" onClick={() => open()}>
            <Plus className="h-3.5 w-3.5" /> New user
          </Button>
        }
      />
      {users.length ? (
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Fleet Access</th>
                <th>Created</th>
                <th>Last Login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold uppercase text-white">
                        {account.email.slice(0, 2)}
                      </span>
                      <div>
                        <strong className="block text-sm font-semibold text-white">{account.email}</strong>
                        <span className="font-mono text-[10px] text-white/30">{account.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={account.role === 'admin' ? 'running_job' : 'stopped'} />
                      <span className="text-xs capitalize text-white/70">{account.role}</span>
                    </div>
                  </td>
                  <td className="text-xs text-white/40">
                    {account.permissions?.allBots
                      ? 'All bots'
                      : `${account.permissions?.botIds?.length || 0} explicit · ${account.permissions?.categories?.length || 0} categories`}
                  </td>
                  <td className="text-xs text-white/40">{formatDate(account.createdAt, { dateOnly: true })}</td>
                  <td className="text-xs text-white/40">{formatDate(account.lastLoginAt)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => open(account)} aria-label="Edit user">
                        <UserCog className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={account.id === me.id}
                        onClick={() => remove(account)}
                        aria-label="Delete user"
                      >
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
              icon={Users}
              title="No users found"
              description="Create the first tenant account for this service."
              action={
                <Button variant="primary" onClick={() => open()}>
                  Create user
                </Button>
              }
            />
          </Panel>
        )
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit user' : 'Create user'}
        description="Every user receives an isolated aliases, scripts, schedules, and preferences workspace."
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={save}
              loading={saving}
              disabled={!form.email.trim() || (!editing && form.password.length < 6)}
            >
              {editing ? 'Save user' : 'Create user'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label>
            <span className="field-label">Username or email</span>
            <input
              className="field-control"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="tenant@example.com"
            />
          </label>
          <label>
            <span className="field-label">{editing ? 'New password' : 'Password'}</span>
            <span className="relative block">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                className="field-control pl-10"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder={editing ? 'Leave blank to keep current' : 'At least 6 characters'}
              />
            </span>
          </label>
          <label>
            <span className="field-label">Role</span>
            <select
              className="field-control"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <Checkbox
            checked={form.allBots}
            onChange={(checked) => setForm({ ...form, allBots: checked })}
            label="Manage every bot"
            description="Grant visibility and lifecycle control for all tenants' bots."
          />
        </div>
      </Modal>
    </div>
  );
}
