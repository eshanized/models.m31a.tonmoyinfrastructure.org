import React from 'react';
import { ObservedHealthStatus } from '@/lib/types/registry';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ObservedHealthStatus;
  className?: string;
  showDot?: boolean;
}

const statusConfig: Record<
  ObservedHealthStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  operational: {
    label: 'Operational',
    dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  },
  degraded: {
    label: 'Degraded',
    dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    badgeClass: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
  unavailable: {
    label: 'Unavailable',
    dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    badgeClass: 'text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/20',
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-zinc-400',
    badgeClass: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  },
  stale: {
    label: 'Stale Data',
    dotClass: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    badgeClass: 'text-purple-700 dark:text-purple-300 bg-purple-500/10 border-purple-500/20',
  },
  catalog_only: {
    label: 'Catalog Only',
    dotClass: 'bg-sky-500',
    badgeClass: 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/20',
  },
  downloadable_only: {
    label: 'Downloadable',
    dotClass: 'bg-indigo-400',
    badgeClass: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  },
};

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
        config.badgeClass,
        className
      )}
    >
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />}
      <span>{config.label}</span>
    </span>
  );
}
