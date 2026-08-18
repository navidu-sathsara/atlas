'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Save, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth, useToast } from '@/components/providers';
import { Button, Checkbox, PageHeader, Panel } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function SettingsPage() {
  const { user, setUser, refresh } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState({ email: user.email, password: '', confirm: '' });
  const [preferences, setPreferences] = useState(user.preferences || {});
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  useEffect(() => { setAccount((current) => ({ ...current, email: user.email })); setPreferences(user.preferences || {}); }, [user]);

  const saveAccount = async (event) => {
    event.preventDefault();
    if (account.password && account.password !== account.confirm) return toast('Passwords do not match', 'error');
    setSavingAccount(true);
    try {
      const body = { email: account.email.trim() };
      if (account.password) body.password = account.password;
      await api('/account', { method: 'PATCH', body: JSON.stringify(body) });
      const updated = await refresh();
      if (updated) setUser(updated);
      setAccount((current) => ({ ...current, password: '', confirm: '' }));
      toast('Account updated', 'success');
    } catch (error) { toast(error.message, 'error'); } finally { setSavingAccount(false); }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    setSavingPreferences(true);
    try {
      const result = await api('/preferences', { method: 'PATCH', body: JSON.stringify(preferences) });
      setPreferences(result.preferences);
      setUser({ ...user, preferences: result.preferences });
      toast('Preferences saved', 'success');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSavingPreferences(false);
    }
  };

  const changePreference = (key, value) => setPreferences((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account Configuration"
        title="Settings"
        description="Profile security, tenant credentials, and interface preferences."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-white/[0.07] pb-5">
            <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Account Profile</h2>
              <p className="text-xs text-white/35">Provisioned on {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <form onSubmit={saveAccount} className="mt-5 space-y-4">
            <label>
              <span className="field-label">Username or email</span>
              <input
                className="field-control"
                value={account.email}
                onChange={(event) => setAccount({ ...account, email: event.target.value })}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="field-control"
                  value={account.password}
                  onChange={(event) => setAccount({ ...account, password: event.target.value })}
                  placeholder="Leave blank to keep current"
                />
              </label>
              <label>
                <span className="field-label">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="field-control"
                  value={account.confirm}
                  onChange={(event) => setAccount({ ...account, confirm: event.target.value })}
                />
              </label>
            </div>
            <div className="flex items-center justify-between gap-3 pt-3">
              <span className="text-xs text-white/40">
                Access Role: <strong className="uppercase text-white font-semibold">{user.role}</strong>
              </span>
              <Button type="submit" variant="primary" loading={savingAccount}>
                <Save className="h-4 w-4" /> Save account
              </Button>
            </div>
          </form>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-center gap-3 border-b border-white/[0.07] pb-5">
            <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white">
              <Settings className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Interface Preferences</h2>
              <p className="text-xs text-white/35">Saved per-account and applied dynamically</p>
            </div>
          </div>
          <form onSubmit={savePreferences} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">Theme</span>
                <select
                  className="field-control"
                  value={preferences.theme || 'dark'}
                  onChange={(event) => changePreference('theme', event.target.value)}
                >
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                  <option value="light">Light</option>
                </select>
              </label>
              <label>
                <span className="field-label">Density</span>
                <select
                  className="field-control"
                  value={preferences.density || 'comfortable'}
                  onChange={(event) => changePreference('density', event.target.value)}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label>
                <span className="field-label">Start page</span>
                <select
                  className="field-control"
                  value={preferences.startPage || 'overview'}
                  onChange={(event) => changePreference('startPage', event.target.value)}
                >
                  <option value="overview">Overview</option>
                  <option value="bots">Bots</option>
                  <option value="proxies">Network</option>
                  <option value="commands">Aliases</option>
                  <option value="schedules">Schedules</option>
                  <option value="account">Settings</option>
                </select>
              </label>
              <label>
                <span className="field-label">Sidebar</span>
                <select
                  className="field-control"
                  value={preferences.sidebar || 'expanded'}
                  onChange={(event) => changePreference('sidebar', event.target.value)}
                >
                  <option value="expanded">Expanded</option>
                  <option value="collapsed">Collapsed</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="field-label">Timezone</span>
                <input
                  className="field-control"
                  value={preferences.timezone || 'local'}
                  onChange={(event) => changePreference('timezone', event.target.value)}
                  placeholder="local or Asia/Colombo"
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Checkbox
                checked={preferences.confirmDanger !== false}
                onChange={(value) => changePreference('confirmDanger', value)}
                label="Confirm destructive actions"
                description="Ask confirmation before deleting accounts or bots."
              />
              <Checkbox
                checked={preferences.autoRefresh !== false}
                onChange={(value) => changePreference('autoRefresh', value)}
                label="Automatic background polling"
                description="Keep schedules and live activity updated."
              />
            </div>
            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" loading={savingPreferences}>
                <Save className="h-4 w-4" /> Save preferences
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <Panel className="flex items-start gap-4 p-6">
        <span className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white/50">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">Isolated Tenant Partitioning</h2>
          <p className="mt-1 text-xs leading-6 text-white/40">
            Your aliases, macros, scripts, schedules, proxy pool, preferences, and session logs are fully isolated and protected from every other tenant on the host.
          </p>
        </div>
      </Panel>
    </div>
  );
}
