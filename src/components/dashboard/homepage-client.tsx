'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Database,
  Shield,
  Zap,
  TrendingUp,
  Cpu,
  BarChart3,
  Server,
} from 'lucide-react';
import { CanonicalModel, ObservedHealthStatus } from '@/lib/types/registry';
import { StatusBadge } from '@/components/status-badge';
import { formatNumber, formatCurrency, formatTimeAgo } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface HomepageClientProps {
  totalModels: number;
  lastSyncedAt: string;
  schemaVersion: string;
  publishers: string[];
  statusDistribution: Record<ObservedHealthStatus, number>;
  publisherCounts: Array<{ name: string; count: number }>;
  modalityCounts: Array<{ name: string; count: number }>;
  recentModels: CanonicalModel[];
  monitoringAvailable: boolean;
  monitoringFresh: boolean;
  lastProbeAt: string | null;
  recentCyclesCount: number;
}

export function HomepageClient({
  totalModels,
  lastSyncedAt,
  schemaVersion,
  publishers,
  statusDistribution,
  publisherCounts,
  modalityCounts,
  recentModels,
  monitoringAvailable,
  monitoringFresh,
  lastProbeAt,
  recentCyclesCount,
}: HomepageClientProps) {
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');

  const operationalCount = statusDistribution.operational || 0;
  const degradedCount = statusDistribution.degraded || 0;
  const unavailableCount = statusDistribution.unavailable || 0;
  const unknownCount = statusDistribution.unknown || 0;
  const catalogOnlyCount = (statusDistribution.catalog_only || 0) + (statusDistribution.downloadable_only || 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Three Core Questions Section */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-b from-card to-secondary/30 p-6 md:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>NVIDIA Build Model Intelligence Platform</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Authoritative Specifications & Synthetic Observability for NVIDIA NIM
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Continuously tracking canonical foundation model specifications, verified pricing, endpoint availability, and synthetic response latencies across official NVIDIA Build endpoints.
          </p>
        </div>

        {/* 3 Core Questions Answers Quick Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border/60">
          <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-mono text-[10px]">1</span>
              <span>What models are in the catalog?</span>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground font-mono">{totalModels} models</strong> across {publishers.length} publishers, deterministically derived from canonical TOML records.
            </p>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-mono text-[10px]">2</span>
              <span>Which endpoints pass availability checks?</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Synthetic canaries verify health. {monitoringAvailable ? (
                <span><strong className="text-emerald-600 dark:text-emerald-400 font-mono">{operationalCount} operational</strong>, {degradedCount} degraded, {unavailableCount} unavailable.</span>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">Monitoring observations are not published yet. Catalog synchronization remains independent.</span>
              )}
            </p>
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary font-mono text-[10px]">3</span>
              <span>How has observed latency changed?</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Per-model canaries track observed HTTP duration and token usage. TTFT is reported only when a streaming probe measures it.
            </p>
          </div>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalog Entries */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Catalog Models</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatNumber(totalModels)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>{publishers.length} publishers</span>
            <span className="font-mono">v{schemaVersion}</span>
          </div>
        </div>

        {/* Operational Status */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Observed Operational</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {monitoringAvailable ? operationalCount : '—'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {monitoringAvailable ? `${recentCyclesCount} published monitoring cycles` : 'Awaiting first published cycle'}
          </div>
        </div>

        {/* Degraded / Unavailable */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Degraded / Elevated</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {monitoringAvailable ? degradedCount : '—'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {monitoringAvailable ? `${unavailableCount} unavailable` : 'No probe data; status unknown'}
          </div>
        </div>

        {/* Catalog Freshness / Database Mode */}
        <div className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Catalog Freshness</span>
            <Database className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-base font-bold font-mono text-foreground truncate">
            {formatTimeAgo(lastSyncedAt)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${monitoringFresh ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>{monitoringAvailable ? (monitoringFresh ? 'Monitoring snapshot: fresh' : 'Monitoring snapshot: stale') : 'Monitoring snapshot: awaiting data'}{lastProbeAt ? ` · Last cycle ${formatTimeAgo(lastProbeAt)}` : ''}</span>
          </div>
        </div>
      </section>

      {/* Publisher Distribution & Modalities */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Publisher Breakdown Chart */}
        <div className="lg:col-span-2 p-5 rounded-lg border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Top Model Publishers in Registry</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                Distribution of canonical models indexed across NVIDIA Build ecosystem
              </p>
            </div>
            <Link
              href="/models"
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <span>Explore all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publisherCounts.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.375rem',
                    fontSize: '12px',
                    color: 'var(--foreground)',
                  }}
                  cursor={{ fill: 'rgba(120, 120, 120, 0.08)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#10b981">
                  {publisherCounts.slice(0, 8).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#8b5cf6' : '#64748b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Modality & Access Breakdown */}
        <div className="p-5 rounded-lg border border-border bg-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-500" />
              <span>Modalities & Capabilities</span>
            </h2>
            <div className="space-y-2">
              {modalityCounts.map((m) => (
                <div key={m.name} className="flex items-center justify-between text-xs py-1 border-b border-border/40">
                  <span className="capitalize font-mono text-foreground">{m.name}</span>
                  <span className="px-2 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                    {m.count} models
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-2">
            <div className="text-xs font-medium text-foreground">Observability Integrity Rule</div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              Authentication failures, rate limits, and unconfigured probes are never mislabeled as provider outages. Provider-wide utilization or GPU load is never fabricated.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Models Quick Inspection Table */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <span>Canonical Foundation Models</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Authoritative NVIDIA Build catalog entries with verified context windows and pricing
            </p>
          </div>
          <Link
            href="/models"
            className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <span>View Full Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/50 text-muted-foreground border-b border-border font-medium">
              <tr>
                <th className="py-2.5 px-4">Model & Identifier</th>
                <th className="py-2.5 px-4">Publisher</th>
                <th className="py-2.5 px-4">Context Window</th>
                <th className="py-2.5 px-4">Input / Output Price</th>
                <th className="py-2.5 px-4">Modalities</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {recentModels.slice(0, 8).map((model) => (
                <tr key={model.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link href={`/models/${encodeURIComponent(model.id)}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                      {model.name}
                    </Link>
                    <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate max-w-xs">
                      {model.id}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                      {model.publisher}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {model.context_window ? `${formatNumber(model.context_window)} tokens` : 'Not published'}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {model.pricing.status === 'published' && model.pricing.input_per_million !== null ? (
                      <span>{formatCurrency(model.pricing.input_per_million)} / {formatCurrency(model.pricing.output_per_million)} / 1M</span>
                    ) : (
                      <span className="text-muted-foreground">Not published</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {model.input_modalities.map((mod) => (
                        <span key={mod} className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-mono capitalize">
                          {mod}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/models/${encodeURIComponent(model.id)}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
