'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  ChevronLeft,
  Copy,
  Check,
  Activity,
  Cpu,
  Layers,
  ShieldCheck,
  Clock,
  Terminal,
  FileCode,
  DollarSign,
  Zap,
  AlertCircle,
  HelpCircle,
  Server,
} from 'lucide-react';
import { CanonicalModel, ObservedHealthStatus } from '@/lib/types/registry';
import { StatusBadge } from '@/components/status-badge';
import { formatNumber, formatCurrency, formatTimeAgo, cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ModelDetailClientProps {
  model: CanonicalModel;
  observedStatus: {
    status: ObservedHealthStatus;
    reason: string;
    isStale: boolean;
    sampleCount: number;
    averageLatencyMs: number | null;
    successRate: number | null;
    lastObservedAt: string | null;
  };
  observations: Array<{
    timestamp: string;
    status: string;
    resultCategory: string;
    latencyMs: number;
    ttftMs: number | null;
    tokensOut: number | null;
    tokensPerSec: number | null;
    httpStatus: number | null;
    failureCategory: string | null;
  }>;
}

export function ModelDetailClient({
  model,
  observedStatus,
  observations,
}: ModelDetailClientProps) {
  const [activeTab, setActiveTab] = useState<'specs' | 'performance' | 'usage' | 'provenance'>('specs');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Prepare chart data from observations
  const chartData = observations.slice(0, 20).reverse().map((o, idx) => ({
    name: new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: o.latencyMs,
    ttft: o.ttftMs || o.latencyMs,
    tokensPerSec: o.tokensPerSec || 0,
  }));

  // Code snippets
  const curlCode = `curl https://integrate.api.nvidia.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $NVIDIA_API_KEY" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Hello NVIDIA NIM!"}],
    "temperature": 0.2,
    "max_tokens": 1024
  }'`;

  const pythonCode = `from openai import OpenAI
import os

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY")
)

completion = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Hello NVIDIA NIM!"}],
    temperature=0.2,
    max_tokens=1024
)

print(completion.choices[0].message.content)`;

  const tsCode = `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${model.id}",
    messages: [{ role: "user", content: "Hello NVIDIA NIM!" }],
    temperature: 0.2,
    max_tokens: 1024,
  });

  console.log(completion.choices[0]?.message?.content);
}

main();`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/models" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Models Directory</span>
        </Link>
        <span>/</span>
        <span className="font-mono">{model.publisher}</span>
        <span>/</span>
        <span className="text-foreground font-semibold truncate">{model.name}</span>
      </div>

      {/* Hero Header */}
      <div className="p-6 rounded-xl border border-border bg-card space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-secondary font-mono text-xs text-muted-foreground">
                {model.publisher}
              </span>
              <StatusBadge status={observedStatus.status} />
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-secondary/80 border border-border text-foreground">
                {model.access_classification.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{model.name}</h1>
            <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span>{model.id}</span>
              <button
                onClick={() => copyToClipboard(model.id, 'id')}
                className="hover:text-foreground transition-colors"
                title="Copy Model ID"
              >
                {copiedCode === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={model.official_detail_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors"
            >
              <span>NVIDIA Build Card</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
          {model.description}
        </p>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/50 text-xs">
          <div>
            <div className="text-muted-foreground text-[11px]">Context Length</div>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {model.context_window ? `${formatNumber(model.context_window)} tokens` : 'Not published'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">Input Pricing</div>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {model.pricing.input_per_million !== null ? `${formatCurrency(model.pricing.input_per_million)} / 1M` : 'Not published'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">Output Pricing</div>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {model.pricing.output_per_million !== null ? `${formatCurrency(model.pricing.output_per_million)} / 1M` : 'Not published'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px]">Recent Latency</div>
            <div className="font-mono font-semibold text-foreground mt-0.5">
              {observedStatus.averageLatencyMs ? `${Math.round(observedStatus.averageLatencyMs)} ms` : 'No probes'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border text-xs font-medium space-x-1">
        <button
          onClick={() => setActiveTab('specs')}
          className={cn(
            'px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'specs'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Specifications</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={cn(
            'px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'performance'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Observability & Latency</span>
        </button>
        <button
          onClick={() => setActiveTab('usage')}
          className={cn(
            'px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'usage'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>API & Code Snippets</span>
        </button>
        <button
          onClick={() => setActiveTab('provenance')}
          className={cn(
            'px-4 py-2 border-b-2 transition-colors flex items-center gap-1.5',
            activeTab === 'provenance'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Provenance & Trust</span>
        </button>
      </div>

      {/* Tab: Specifications */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-lg border border-border bg-card space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>Model Architecture & Limits</span>
            </h2>
            <div className="divide-y divide-border/60 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Canonical ID</span>
                <span className="font-mono text-foreground font-medium">{model.id}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Publisher / Originator</span>
                <span className="font-mono text-foreground font-medium">{model.publisher}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Model Family</span>
                <span className="text-foreground font-medium">{model.family || 'Not published'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Architecture</span>
                <span className="text-foreground font-medium">{model.architecture || 'Not published'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Context Window Limit</span>
                <span className="font-mono text-foreground font-medium">
                  {model.context_window ? `${formatNumber(model.context_window)} tokens` : 'Not published'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Max Output Tokens</span>
                <span className="font-mono text-foreground font-medium">
                  {model.max_output_tokens ? `${formatNumber(model.max_output_tokens)} tokens` : 'Not published'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted-foreground">Endpoint Protocol</span>
                <span className="font-mono text-foreground font-medium">{model.protocol}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg border border-border bg-card space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-500" />
              <span>Capabilities & Modal Surfaces</span>
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Chat Conversation</span>
                <span className="font-mono font-medium">{model.capabilities.chat ? '✓ Yes' : '✕ No'}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Tool / Function Calling</span>
                <span className="font-mono font-medium">{model.capabilities.tool_calling ? '✓ Yes' : '✕ No'}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Reasoning / Thinking</span>
                <span className="font-mono font-medium">{model.capabilities.reasoning ? '✓ Yes' : '✕ No'}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Structured Output (JSON)</span>
                <span className="font-mono font-medium">{model.capabilities.structured_output ? '✓ Yes' : '✕ No'}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Vision / Multimodal</span>
                <span className="font-mono font-medium">{model.capabilities.vision ? '✓ Yes' : '✕ No'}</span>
              </div>
              <div className="p-2.5 rounded bg-secondary/50 border border-border/60 flex items-center justify-between">
                <span className="text-muted-foreground">Audio Processing</span>
                <span className="font-mono font-medium">{model.capabilities.audio ? '✓ Yes' : '✕ No'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2 text-xs">
              <div className="font-medium text-foreground">License & Restrictions</div>
              <div className="text-muted-foreground leading-relaxed">{model.license || 'Not published'}</div>
              <div className="text-[11px] text-muted-foreground/80">{model.usage_restrictions || 'Standard terms apply.'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Observability & Latency */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Synthetic Canary Response Latency (ms)</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Measurements collected by M31A scheduled monitoring worker with dedicated server-side credentials
                </p>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Sample count: {observedStatus.sampleCount}
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.375rem',
                        fontSize: '12px',
                        color: 'var(--foreground)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="latency"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981' }}
                      name="Total Latency (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-lg">
                <AlertCircle className="w-6 h-6 mx-auto text-muted-foreground" />
                <div className="text-xs font-semibold text-foreground">No Probe Samples Recorded</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Either this model has not yet run through a synthetic canary cycle or the monitoring worker database is in static dry-run mode.
                </p>
              </div>
            )}
          </div>

          {/* Observations log */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">Recent Probe Observations</h3>
              <span className="text-[11px] font-mono text-muted-foreground">Latest 10 samples</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2 px-4">Timestamp</th>
                    <th className="py-2 px-4">Result</th>
                    <th className="py-2 px-4">HTTP Status</th>
                    <th className="py-2 px-4">Latency</th>
                    <th className="py-2 px-4">Throughput</th>
                    <th className="py-2 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {observations.length > 0 ? (
                    observations.map((obs, idx) => (
                      <tr key={idx} className="hover:bg-secondary/20 font-mono">
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {new Date(obs.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] uppercase font-bold',
                              obs.resultCategory === 'success'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-rose-500/10 text-rose-500'
                            )}
                          >
                            {obs.resultCategory}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">{obs.httpStatus || '—'}</td>
                        <td className="py-2.5 px-4">{obs.latencyMs} ms</td>
                        <td className="py-2.5 px-4">
                          {obs.tokensPerSec ? `${obs.tokensPerSec} tok/s` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                          {obs.failureCategory || 'Normal response verification'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No individual probe records in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: API & Code Snippets */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="p-5 rounded-lg border border-border bg-card space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span>Invoking this Model via NVIDIA NIM / OpenAI SDK</span>
              </h2>
              <p className="text-xs text-muted-foreground">
                NVIDIA Build exposes OpenAI-compatible inference endpoints under <code className="font-mono text-foreground">https://integrate.api.nvidia.com/v1</code>.
              </p>
            </div>

            {/* cURL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">cURL Command</span>
                <button
                  onClick={() => copyToClipboard(curlCode, 'curl')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedCode === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'curl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-md bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                {curlCode}
              </pre>
            </div>

            {/* Python */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Python (OpenAI SDK)</span>
                <button
                  onClick={() => copyToClipboard(pythonCode, 'python')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedCode === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'python' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-md bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                {pythonCode}
              </pre>
            </div>

            {/* TypeScript */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">TypeScript / Node.js</span>
                <button
                  onClick={() => copyToClipboard(tsCode, 'ts')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copiedCode === 'ts' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'ts' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-md bg-secondary/80 border border-border text-[11px] font-mono overflow-x-auto text-foreground">
                {tsCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Provenance & Trust */}
      {activeTab === 'provenance' && (
        <div className="p-5 rounded-lg border border-border bg-card space-y-4 text-xs">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Metadata Provenance & Traceability Ledger</span>
            </h2>
            <p className="text-muted-foreground">
              Every specification displayed for this model is verified against official primary sources.
            </p>
          </div>

          <div className="divide-y divide-border/60">
            <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-muted-foreground">Primary Source URL</span>
              <Link
                href={model.provenance.source_url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                <span>{model.provenance.source_url}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Discovery Source Type</span>
              <span className="font-mono text-foreground font-medium">{model.provenance.source_type}</span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Confidence Score</span>
              <span className="font-mono text-foreground font-medium">
                {(model.provenance.confidence * 100).toFixed(0)}% Authoritative
              </span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">First Discovered At</span>
              <span className="font-mono text-foreground">{new Date(model.first_seen_at).toUTCString()}</span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">Last Verified Observation</span>
              <span className="font-mono text-foreground">{new Date(model.last_seen_at).toUTCString()}</span>
            </div>

            <div className="py-2.5 flex justify-between">
              <span className="text-muted-foreground">M31A Machine-Readable Contract</span>
              <span className="font-mono text-emerald-500 font-semibold">Active & Synchronized</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
