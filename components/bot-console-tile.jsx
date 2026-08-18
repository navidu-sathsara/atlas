'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleStop,
  Eraser,
  ExternalLink,
  Play,
  RotateCcw,
  Send,
  Terminal,
} from 'lucide-react';
import { api, cn } from '@/lib/api';
import { botLabel, categoryOf } from '@/lib/format';
import { Button, StatusBadge } from '@/components/ui';
import { useToast } from '@/components/providers';

const MAX_LOGS = 300;

function normalizeLog(row) {
  if (typeof row === 'string') return { t: null, line: row };
  return { t: row?.t || null, line: String(row?.line ?? '') };
}

function lineTone(line) {
  const value = String(line || '').toLowerCase();
  if (/(error|failed|crash|kicked|exception)/.test(value)) return 'text-white font-semibold bg-white/10 px-1 rounded';
  if (value.includes('warn')) return 'text-white/80';
  if (/(connected|spawned|success|logged in|ready)/.test(value)) return 'text-white font-medium';
  if (value.startsWith('[system]') || value.startsWith('[panel]')) return 'text-white/70';
  return 'text-white/45';
}

export function BotConsoleTile({ bot, onInspect, onStatusChange }) {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState('');
  const [streamState, setStreamState] = useState('connecting');
  const scrollRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!bot?.id) return;
    setLogs([]);
    const stream = new EventSource(`/api/bots/${encodeURIComponent(bot.id)}/events`);
    
    stream.onopen = () => setStreamState('live');
    stream.onerror = () => setStreamState('reconnecting');
    
    stream.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.type === 'snapshot') {
        setLogs((payload.logs || []).slice(-MAX_LOGS).map(normalizeLog));
        if (payload.status) onStatusChange?.(bot.id, payload.status);
      }
      if (payload.type === 'log') {
        setLogs((current) => [...current, normalizeLog(payload)].slice(-MAX_LOGS));
      }
      if (payload.type === 'status') {
        onStatusChange?.(bot.id, payload.status);
      }
    };

    return () => stream.close();
  }, [bot?.id, onStatusChange]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [logs]);

  const sendCommand = async (e) => {
    e?.preventDefault();
    const val = command.trim();
    if (!val) return;
    setSending(true);
    try {
      await api(`/bots/${encodeURIComponent(bot.id)}/cmd`, {
        method: 'POST',
        body: JSON.stringify({ cmd: val }),
      });
      setCommand('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const lifecycle = async (action) => {
    setBusy(action);
    try {
      await api(`/bots/${encodeURIComponent(bot.id)}/${action}`, { method: 'POST' });
      toast(`${botLabel(bot)} ${action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted'}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-black/70 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
      {/* Tile Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-9 w-9 shrink-0">
            <img
              src={`https://mc-heads.net/avatar/${encodeURIComponent(bot.config?.username || 'MHF_Steve')}/48`}
              alt={botLabel(bot)}
              className="h-9 w-9 rounded-lg border border-white/15 bg-black/60 object-cover shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://mc-heads.net/avatar/MHF_Steve/48';
              }}
            />
            <span
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-black',
                bot.status === 'running'
                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]'
                  : bot.status === 'error'
                  ? 'bg-white/40'
                  : 'bg-white/20'
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <strong className="truncate text-sm font-extrabold text-white">{bot.config?.username || bot.id}</strong>
              <span className="rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/60">
                {bot.id}
              </span>
              <StatusBadge status={bot.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-white/50">
              {bot.config?.host || 'No host'} · {categoryOf(bot)}
            </p>
          </div>
        </div>

        {/* Tile Actions */}
        <div className="flex items-center gap-1.5">
          {bot.status === 'running' ? (
            <>
              <button
                onClick={() => lifecycle('restart')}
                disabled={!!busy}
                title="Restart bot"
                aria-label="Restart bot"
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', busy === 'restart' && 'anim-spin')} />
              </button>
              <button
                onClick={() => lifecycle('stop')}
                disabled={!!busy}
                title="Stop bot"
                aria-label="Stop bot"
                className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <CircleStop className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => lifecycle('start')}
              disabled={!!busy}
              title="Start bot"
              aria-label="Start bot"
              className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={() => setLogs([])}
            title="Clear console"
            aria-label="Clear console"
            className="rounded-lg p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>

          {onInspect && (
            <button
              onClick={() => onInspect(bot.id)}
              title="Open full inspector"
              aria-label="Open full inspector"
              className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tile Logs View */}
      <div
        ref={scrollRef}
        className="console-scrollbar h-[220px] overflow-y-auto bg-black/40 p-3 font-mono text-[10.5px] leading-[1.6]"
      >
        {logs.length ? (
          logs.map((row, index) => (
            <div key={`${row.t || 'log'}-${index}`} className="flex gap-2">
              <span className="w-12 shrink-0 select-none text-[9.5px] text-white/20">
                {row.t ? new Date(row.t).toLocaleTimeString([], { hour12: false }) : ''}
              </span>
              <span className={cn('min-w-0 flex-1 whitespace-pre-wrap break-words', lineTone(row.line))}>
                {row.line}
              </span>
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-white/25">
            <Terminal className="h-5 w-5 opacity-40" />
            <p className="text-[11px]">No active output</p>
          </div>
        )}
      </div>

      {/* Inline Command Bar */}
      <form
        onSubmit={sendCommand}
        className="flex items-center gap-1.5 border-t border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5"
      >
        <span className="pl-1 font-mono text-xs text-white/30">&gt;</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="min-w-0 flex-1 bg-transparent px-1.5 py-1 font-mono text-[11px] text-white outline-none placeholder:text-white/20"
          placeholder={`Command ${bot.id}...`}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!command.trim() || sending}
          aria-label="Send command"
          className="rounded-md border border-white/10 bg-white/[0.06] p-1 text-white/60 transition hover:border-white/30 hover:bg-white hover:text-black disabled:opacity-30"
        >
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
