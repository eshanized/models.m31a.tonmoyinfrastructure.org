'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error);
  }, [error]);

  return (
    <div className="py-20 text-center space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-foreground">Operational Anomaly Detected</h1>
      <p className="text-xs text-muted-foreground leading-relaxed">
        An error occurred while loading this view. Diagnostics have been recorded safely without exposing credentials or internal state.
      </p>
      <div className="pt-2 flex items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
