'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';

const startRoutes = {
  overview: '/overview',
  bots: '/bots',
  proxies: '/network',
  commands: '/aliases',
  schedules: '/schedules',
  account: '/settings',
};

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(startRoutes[user.preferences?.startPage] || '/overview');
      } else {
        router.replace('/login');
      }
    }
  }, [loading, user, router]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-white" style={{ animationDuration: '0.85s' }} />
          <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,1)]" />
        </div>
        <p className="mt-5 font-mono text-xs tracking-wider uppercase text-white/40 animate-pulse">
          Opening Native...
        </p>
      </div>
    </div>
  );
}
