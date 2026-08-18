'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import { LandingNav } from '@/components/landing/landing-nav';
import { LandingFooter } from '@/components/landing/landing-footer';
import { Hero } from '@/components/landing/hero';
import {
  FeatureBento,
  Workflow,
  StatsBand,
  ModulesMarquee,
  Testimonials,
  Pricing,
  Faq,
} from '@/components/landing/sections';

const startRoutes = {
  overview: '/overview',
  bots: '/bots',
  proxies: '/network',
  commands: '/aliases',
  schedules: '/schedules',
  account: '/settings',
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(startRoutes[user.preferences?.startPage] || '/overview');
    }
  }, [loading, user, router]);

  if (!loading && user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingNav />
      <main>
        <Hero />
        <FeatureBento />
        <Workflow />
        <StatsBand />
        <ModulesMarquee />
        <Testimonials />
        <Pricing />
        <Faq />
      </main>
      <LandingFooter />
    </div>
  );
}
