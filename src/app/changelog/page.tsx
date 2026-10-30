import React from 'react';
import Link from 'next/link';
import {
  Clock,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Server,
  Layers,
} from 'lucide-react';
import { getCatalogMetadata, getAllModels } from '@/lib/catalog';
import { StatusRepository } from '@/lib/db/repository';
import { formatTimeAgo } from '@/lib/utils';
import changelogData from '@/data/changelog.json';

export const metadata = {
  title: 'Catalog Changelog & Sync Health | NVIDIA Build Intelligence',
  description:
    'Audit trail of canonical registry synchronization runs, newly indexed foundation models, and probe monitoring cycles.',
};

export default async function ChangelogPage() {
  const metadata = getCatalogMetadata();
  const models = getAllModels();
  const dbConnected = StatusRepository.isAvailable();
  const recentCycles = await StatusRepository.getRecentCycles(5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Catalog Changelog & Operational Health</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Traceable audit trail of canonical TOML registry updates, discovered models, and scheduled probe health
        </p>
      </div>

      {/* Operational Sync & Monitoring Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Catalog Sync */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Daily Catalog Sync</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Operational & Current</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Last successful sync: <span className="font-mono text-foreground">{formatTimeAgo(metadata.last_synced_at)}</span>
          </div>
        </div>

        {/* Registry Schema & Integrity */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">TOML Schema Integrity</span>
            <ShieldCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
            <span>Strict Schema v{metadata.schema_version}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {models.length} individual TOML files strictly validated
          </div>
        </div>

        {/* Monitoring Worker Health */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium">Synthetic Probe System</span>
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{dbConnected ? 'PostgreSQL Persistent' : 'Static Fallback Mode'}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {recentCycles.length > 0 ? `${recentCycles.length} recent probe cycles recorded` : 'Ready for scheduled workflow'}
          </div>
        </div>
      </div>

      {/* Changelog Timeline */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-primary" />
          <span>Historical Catalog Changes</span>
        </h2>

        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {changelogData.map((item) => (
            <div key={item.id} className="p-5 space-y-2 hover:bg-secondary/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-primary/10 text-primary border border-primary/20">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  {new Date(item.timestamp).toUTCString()}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground font-mono">
                <div>Source: <span className="text-foreground">{item.author}</span></div>
                <div>{item.affected_models_count} models indexed</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing-Entry Safeguards Info Box */}
      <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Anti-Flapping & Retirement Verification Policy</span>
        </div>
        <p className="leading-relaxed">
          The catalog synchronizer adheres to strict missing-entry safeguards: a model is never marked deprecated or withdrawn simply because an upstream discovery sweep intermittently omitted it. Deprecation requires confirmed lifecycle indicators or multiple consecutive daily synchronization confirmations.
        </p>
      </div>
    </div>
  );
}
