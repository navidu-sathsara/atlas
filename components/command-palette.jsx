'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/api';

/**
 * Cmd/Ctrl+K command palette. Specified in design_guidelines.json and absent
 * from the previous build - restored here with full keyboard control.
 */
export function CommandPalette({ items }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.group || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const run = (item) => {
    if (!item) return;
    setOpen(false);
    if (item.href) router.push(item.href);
    else item.action?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(results.length, 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      run(results[cursor]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-[90] flex items-start justify-center bg-black/75 p-4 pt-[12vh] backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="anim-scale w-full max-w-xl overflow-hidden rounded-[22px] border border-white/12 bg-[#0b0b0b]/92 shadow-[0_40px_120px_rgba(0,0,0,.95)] backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5">
          <Search className="h-4 w-4 shrink-0 text-white/30" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a page or run a command"
            className="h-14 w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/25"
          />
          <kbd className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/30">ESC</kbd>
        </div>

        <div className="console-scrollbar max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-white/30">No matches found</p>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onMouseEnter={() => setCursor(i)}
                onClick={() => run(item)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors duration-200',
                  i === cursor ? 'bg-white/[0.09] text-white' : 'text-white/55 hover:bg-white/[0.05]'
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                <span className="flex-1 truncate text-sm">{item.label}</span>
                {item.group && (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.13em] text-white/25">{item.group}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-white/25">
          <span className="flex items-center gap-1.5">
            <ArrowUp className="h-3 w-3" />
            <ArrowDown className="h-3 w-3" /> Navigate
          </span>
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" /> Open
          </span>
        </div>
      </div>
    </div>
  );
}
