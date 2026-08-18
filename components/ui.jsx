'use client';

import { useEffect } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { cn } from '@/lib/api';

/* ------------------------------------------------------------------
   BotHive Monochrome primitives.
   Public API is unchanged - every dashboard page inherits the
   new glass/iOS language without markup edits.
   ------------------------------------------------------------------ */

export function Button({ children, variant = 'secondary', size = 'md', className, loading, disabled, ...props }) {
  const variants = {
    primary: 'border-white bg-white text-black font-semibold shadow-[0_4px_20px_rgba(255,255,255,0.25)] hover:bg-white/90 active:scale-[0.96]',
    secondary: 'border-white/12 bg-white/[0.06] text-white backdrop-blur-2xl hover:border-white/25 hover:bg-white/[0.12] active:scale-[0.96]',
    ghost: 'border-transparent bg-transparent text-white/50 hover:bg-white/[0.08] hover:text-white active:scale-[0.96]',
    danger: 'border-white/20 bg-white/[0.04] text-white hover:border-white hover:bg-white hover:text-black active:scale-[0.96]',
    success: 'border-white/20 bg-white/[0.09] text-white hover:bg-white/[0.18] active:scale-[0.96]',
  };
  const sizes = {
    sm: 'h-8.5 min-h-[34px] gap-1.5 rounded-[12px] px-3.5 text-xs',
    md: 'h-10.5 min-h-[42px] gap-2 rounded-[14px] px-4.5 text-[13px]',
    lg: 'h-12 min-h-[48px] gap-2.5 rounded-[16px] px-6 text-sm',
  };
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center border font-medium tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 anim-spin" />}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-10 w-10 min-h-[40px] min-w-[40px] items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.05] text-white/60 backdrop-blur-2xl transition-all duration-200 hover:border-white/25 hover:bg-white/[0.12] hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="anim-rise flex flex-col gap-4 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5 pt-1">{actions}</div>}
    </header>
  );
}

export function Panel({ children, className }) {
  return <section className={cn('ios-glass-card', className)}>{children}</section>;
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default' }) {
  const dots = {
    default: 'bg-white/30',
    blue: 'bg-white/80',
    green: 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]',
    red: 'bg-white anim-pulse',
    amber: 'bg-white/60',
  };
  return (
    <Panel className="group relative flex min-h-28 flex-col justify-between overflow-hidden p-5 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dots[tone] || dots.default)} />
          <span className="truncate">{label}</span>
        </p>
        {Icon && (
          <span className="shrink-0 rounded-[12px] border border-white/[0.08] bg-white/[0.04] p-2 text-white/40 transition-all duration-300 group-hover:border-white/20 group-hover:text-white">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="tnum text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 truncate text-[11px] text-white/40">{hint}</p>}
      </div>
    </Panel>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'stopped').toLowerCase();
  const tones = {
    running: { wrap: 'border-white/30 bg-white/[0.14] text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]', dot: 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]' },
    online: { wrap: 'border-white/30 bg-white/[0.14] text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]', dot: 'bg-white shadow-[0_0_8px_rgba(255,255,255,1)]' },
    done: { wrap: 'border-white/25 bg-white/[0.10] text-white', dot: 'bg-white' },
    stopped: { wrap: 'border-white/[0.09] bg-white/[0.03] text-white/40', dot: 'bg-white/30' },
    offline: { wrap: 'border-white/[0.09] bg-white/[0.03] text-white/40', dot: 'bg-white/30' },
    cancelled: { wrap: 'border-white/[0.09] bg-white/[0.03] text-white/40', dot: 'bg-white/30' },
    pending: { wrap: 'border-white/15 bg-white/[0.05] text-white/65', dot: 'bg-white/60 anim-pulse' },
    partial: { wrap: 'border-white/15 bg-white/[0.05] text-white/65', dot: 'bg-white/60' },
    running_job: { wrap: 'border-white/25 bg-white/[0.10] text-white', dot: 'bg-white anim-pulse' },
    error: { wrap: 'border-white/40 bg-white/[0.08] text-white', dot: 'bg-white anim-ring' },
    failed: { wrap: 'border-white/40 bg-white/[0.08] text-white', dot: 'bg-white anim-ring' },
  };
  const tone = tones[normalized] || tones.stopped;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-xl', tone.wrap)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
      {normalized.replace('_', ' ')}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="anim-fade flex min-h-60 flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-white/40 backdrop-blur-2xl">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-white">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/40">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="anim-fade fixed inset-0 z-[70] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'anim-scale max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-t-[28px] border border-white/12 bg-[#0d0d0f]/95 shadow-[0_-20px_80px_rgba(0,0,0,0.9)] backdrop-blur-3xl sm:rounded-[24px] sm:shadow-[0_40px_120px_rgba(0,0,0,0.95)]',
          wide ? 'max-w-3xl' : 'max-w-lg'
        )}
      >
        {/* iOS Mobile Grab Handle */}
        <div className="sticky top-0 z-20 flex flex-col border-b border-white/[0.08] bg-[#0d0d0f]/90 px-6 py-4 backdrop-blur-2xl">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="modal-title" className="text-base font-semibold tracking-tight text-white sm:text-lg">{title}</h2>
              {description && <p className="mt-1 text-xs leading-relaxed text-white/40">{description}</p>}
            </div>
            <IconButton label="Close" className="h-8 w-8 min-h-[32px] min-w-[32px] shrink-0 rounded-xl" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-white/[0.08] bg-white/[0.02] p-4 sm:px-6">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-white/10" />
        <span className="anim-spin absolute inset-0 rounded-full border-2 border-transparent border-t-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </span>
      <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="ios-segmented-control max-w-full overflow-x-auto">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn('ios-segmented-item', active && 'active')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, description, disabled }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-[16px] border p-3.5 transition-all duration-200',
        checked ? 'border-white/30 bg-white/[0.08]' : 'border-white/[0.08] bg-white/[0.02]',
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-white/20 hover:bg-white/[0.05]'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200',
          checked ? 'border-white bg-white text-black' : 'border-white/30 bg-transparent'
        )}
      >
        <svg viewBox="0 0 12 12" className={cn('h-3 w-3 transition-transform duration-200', checked ? 'scale-100' : 'scale-0')} fill="none">
          <path d="M2 6.5 4.5 9l5.5-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-white">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-white/40">{description}</span>}
      </span>
    </label>
  );
}
