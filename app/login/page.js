'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, LockKeyhole, UserRound, Box } from 'lucide-react';
import { useAuth } from '@/components/providers';
import { Button } from '@/components/ui';
import { Marquee } from '@/components/reveal';

const startRoutes = {
  overview: '/overview',
  bots: '/bots',
  proxies: '/network',
  commands: '/aliases',
  schedules: '/schedules',
  account: '/settings',
};

const STATS = [
  ['99.98%', 'Fleet uptime'],
  ['<40ms', 'Console latency'],
  ['SOCKS5', 'Proxy isolation'],
];

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace(startRoutes[user.preferences?.startPage] || '/overview');
  }, [loading, user, router]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const account = await login(email.trim(), password);
      router.replace(startRoutes[account.preferences?.startPage] || '/overview');
      router.refresh();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4 sm:p-6 lg:p-10">
      {/* Ambient background glow */}
      <div className="spotlight pointer-events-none fixed inset-x-0 top-0 h-[500px]" />
      <div className="grid-bg mask-radial pointer-events-none fixed inset-0 opacity-40" />

      <div className="anim-rise relative z-10 w-full max-w-md">
        {/* iOS Centered Glass Card */}
        <div className="ios-glass-card overflow-hidden p-7 sm:p-9">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/15 bg-white/[0.08] shadow-[0_8px_24px_rgba(255,255,255,0.1)] backdrop-blur-2xl">
              <Box className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Native</h1>
            <p className="mt-1.5 text-xs text-white/50">
              Sign in to your fleet control plane
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Username or email
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className="h-12 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-white/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  placeholder="admin or username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className="h-12 w-full rounded-[14px] border border-white/[0.09] bg-white/[0.03] pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-white/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-white/10"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="anim-scale rounded-xl border border-white/20 bg-white/[0.06] p-3 text-center text-xs text-white backdrop-blur-xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              className="mt-6 w-full shadow-lg"
            >
              Sign In <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-8 border-t border-white/[0.06] pt-5 text-center">
            <p className="text-[11px] text-white/30">
              End-to-end encrypted session · Atlas Fleet Network
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
