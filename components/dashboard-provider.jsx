'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth, useToast } from '@/components/providers';

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [proxyCapacity, setProxyCapacity] = useState(3);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState('connecting');

  const refreshBots = useCallback(async () => {
    const result = await api('/bots');
    setBots(Array.isArray(result) ? result : (result.bots || []));
    return result.bots || [];
  }, []);

  const refreshProxies = useCallback(async () => {
    const result = await api('/proxies');
    setProxies(result.proxies || []);
    setProxyCapacity(result.capacity || 3);
    return result.proxies || [];
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    Promise.all([refreshBots(), refreshProxies()])
      .catch((error) => { if (active) toast(error.message, 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, refreshBots, refreshProxies, toast]);

  useEffect(() => {
    if (!user) return;
    const stream = new EventSource('/api/events');
    stream.onopen = () => setConnection('live');
    stream.onerror = () => setConnection('reconnecting');
    stream.onmessage = (event) => {
      let payload;
      try { payload = JSON.parse(event.data); } catch { return; }
      if (!payload?.type) return;

      if (payload.type === 'hello' || payload.type === 'reloaded') {
        setBots(payload.bots || []);
        setConnection('live');
        return;
      }
      if ((payload.type === 'bot-added' || payload.type === 'bot-updated') && payload.bot) {
        setBots((current) => {
          const index = current.findIndex((bot) => bot.id === payload.bot.id);
          if (index < 0) return [...current, payload.bot];
          return current.map((bot) => bot.id === payload.bot.id ? payload.bot : bot);
        });
        return;
      }
      if (payload.type === 'bot-removed') {
        const id = payload.id || payload.bot?.id;
        setBots((current) => current.filter((bot) => bot.id !== id));
        return;
      }
      if (payload.type === 'status' || payload.type === 'shards') {
        setBots((current) => current.map((bot) => bot.id === payload.id
          ? { ...bot, ...(payload.type === 'status' ? { status: payload.status } : { shards: payload.shards }) }
          : bot));
      }
    };
    return () => stream.close();
  }, [user]);

  const value = useMemo(() => ({
    bots,
    setBots,
    proxies,
    setProxies,
    proxyCapacity,
    loading,
    connection,
    refreshBots,
    refreshProxies,
  }), [bots, proxies, proxyCapacity, loading, connection, refreshBots, refreshProxies]);

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('useDashboard must be used inside DashboardProvider');
  return value;
}
