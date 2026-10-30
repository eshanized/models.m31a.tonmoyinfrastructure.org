import React from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck, Database, GitBranch } from 'lucide-react';
import { getCatalogMetadata } from '@/lib/catalog';

export function Footer() {
  const metadata = getCatalogMetadata();

  return (
    <footer className="w-full border-t border-border bg-card/40 py-8 mt-16 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">NVIDIA Build Model Intelligence</span>
              <span className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-mono">v{metadata.schema_version}</span>
            </div>
            <p className="text-muted-foreground/80 max-w-lg">
              Automated observability, canonical TOML registry, and verified performance benchmarks for NVIDIA NIM models, maintained by Tonmoy Infrastructure & Vision (TIV) for M31 Autonomous Agent.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link
              href="https://build.nvidia.com/models"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>NVIDIA Build Official</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="https://m31a.tonmoyinfrastructure.org"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <span>M31A Runtime</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <Link
              href="/api/v1/openapi.json"
              target="_blank"
              className="flex items-center gap-1 hover:text-foreground transition-colors font-mono"
            >
              <span>openapi.json</span>
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Traceable Provenance Enforced</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>Canonical Registry: {metadata.total_models} models</span>
            </span>
          </div>
          <div>
            <span>Synced: {new Date(metadata.last_synced_at).toUTCString()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
