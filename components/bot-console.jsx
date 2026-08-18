'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, EmptyState } from '@/components/ui';
import { useToast } from '@/components/providers';
import { subscribeConsole } from '@/lib/console-stream';

const MAX_LOGS = 1200;

function normalizeLog(row) {
  if (typeof row === 'string') return { t: null, line: row };
  return { t: row?.t || null, line: String(row?.line ?? '') };
}

/* Monochrome log tones - severity is encoded as luminance + weight, not hue. */
function lineTone(line) {
  const value = line.toLowerCase();
  if (/(error|failed|crash|kicked)/.test(value)) return 'text-white font-medium';
  if (value.includes('warn')) return 'text-white/80';
  if (/(connected|spawned|success|logged in)/.test(value)) return 'text-white';
  if (value.startsWith('[system]') || value.startsWith('[panel]')) return 'text-white/70';
  return 'text-white/45';
}

export function BotConsole({ bot, onStatus }) {
  const [logs, setLogs] = useState([]);
  const [command, setCommand] = useState('');
  const [sending, setSending] = useState(false);
  const [streamState, setStreamState] = useState('connecting');
  const scrollRef = useRef(null);
  const { toast } = useToast();
  const onStatusRef = useRef(onStatus);
  const prevBotIdRef = useRef(null);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    if (!bot?.id) return;

    if (prevBotIdRef.current !== bot.id) {
      setLogs([]);
      prevBotIdRef.current = bot.id;
    }

    return subscribeConsole(bot.id, (payload) => {
      if (payload.type === 'snapshot') {
        const snapLogs = (payload.logs || []).slice(-MAX_LOGS).map(normalizeLog);
        setLogs((current) => {
          // If we already have logs and snapshot arrives on reconnect, merge or keep latest
          if (current.length > 0 && snapLogs.length <= current.length) {
            return current;
          }
          return snapLogs;
        });
        if (payload.status) onStatusRef.current?.(payload.status);
      }
      if (payload.type === 'log') {
        setLogs((current) => [...current, normalizeLog(payload)].slice(-MAX_LOGS));
      }
      if (payload.type === 'status') onStatusRef.current?.(payload.status);
    }, setStreamState);
  }, [bot?.id]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [logs]);

  const send = async (event) => {
    event.preventDefault();
    const value = command.trim();
    if (!value) return;
    setSending(true);
    try {
      await api(`/bots/${encodeURIComponent(bot.id)}/cmd`, { method: 'POST', body: JSON.stringify({ cmd: value }) });
      setCommand('');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (!bot) return <EmptyState title="Select a bot" description="Choose a bot from the list to open its live console." />;

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-black/60 backdrop-blur-2xl">
      <div className="flex h-12 items-center gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${streamState === 'live' ? 'bg-white shadow-[0_0_9px_rgba(255,255,255,.9)]' : 'anim-pulse bg-white/45'}`} />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/60">{bot.id} / console</span>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-white/25">{streamState}</span>
        <button
          onClick={() => setLogs([])}
          aria-label="Clear console"
          title="Clear console"
          className="shrink-0 rounded-lg p-1.5 text-white/25 transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
        >
          <Eraser className="h-3.5 w-3.5" />
        </button>
      </div>

      <div ref={scrollRef} className="console-scrollbar h-[440px] overflow-y-auto p-4 font-mono text-[11px] leading-5 sm:text-xs">
        {logs.length ? logs.map((row, index) => (
          <div key={`${row.t || 'log'}-${index}`} className="flex gap-3">
            <span className="w-16 shrink-0 select-none text-white/15">
              {row.t ? new Date(row.t).toLocaleTimeString([], { hour12: false }) : ''}
            </span>
            <span className={`min-w-0 whitespace-pre-wrap break-words ${lineTone(row.line)}`}>{row.line}</span>
          </div>
        )) : <p className="text-white/20">Waiting for bot output...</p>}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/[0.07] bg-white/[0.02] p-3">
        <span className="shrink-0 pl-1 font-mono text-sm text-white/40">&gt;</span>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs text-white outline-none placeholder:text-white/20"
          placeholder="Send a bot command"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="sm" variant="primary" loading={sending} disabled={!command.trim()}>
          <Send className="h-3.5 w-3.5" />Send
        </Button>
      </form>
    </div>
  );
}
