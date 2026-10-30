import React from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="py-20 text-center space-y-4 max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h1 className="text-xl font-bold text-foreground">Model or Resource Not Found</h1>
      <p className="text-xs text-muted-foreground leading-relaxed">
        The requested model identifier or page is not cataloged in the canonical NVIDIA Build registry.
      </p>
      <div className="pt-2">
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Models Directory</span>
        </Link>
      </div>
    </div>
  );
}
