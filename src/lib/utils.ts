import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Not published';
  if (amount === 0) return 'Free';
  return `$${amount.toFixed(2)}`;
}

export function formatTimeAgo(isoString: string | null | undefined): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
