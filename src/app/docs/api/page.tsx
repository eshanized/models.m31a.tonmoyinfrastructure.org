import React from 'react';
import Link from 'next/link';
import {
  Terminal,
  ExternalLink,
  Code2,
  Lock,
  Layers,
  CheckCircle2,
  FileJson,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { openApiSpec } from '@/lib/openapi';

export const metadata = {
  title: 'API Reference & Data Contract | NVIDIA Build Intelligence',
  description:
    'Comprehensive HTTP API documentation, OpenAPI 3.1 specification, and M31A autonomous agent data contract.',
};

export default function ApiDocsPage() {
  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/models',
      desc: 'Query, search, filter, and paginate through canonical NVIDIA models.',
      params: 'query, publisher, modality, access, capability, minContext, maxContext, priceOnly, probeEligibleOnly, page, pageSize, sort, order',
    },
    {
      method: 'GET',
      path: '/api/v1/models/[id]',
      desc: 'Retrieve full specifications, pricing, and observed status for a specific model.',
      params: 'id (path parameter, e.g. nvidia/nemotron-4-340b-instruct or meta/llama-3.3-70b-instruct)',
    },
    {
      method: 'GET',
      path: '/api/v1/models/[id]/status',
      desc: 'Retrieve derived public status, probe success rate, and average response latency.',
      params: 'id (path parameter)',
    },
    {
      method: 'GET',
      path: '/api/v1/models/[id]/history',
      desc: 'Retrieve historical synthetic probe time-series (latency, TTFT, throughput).',
      params: 'id (path parameter), limit (query parameter, default: 50)',
    },
    {
      method: 'GET',
      path: '/api/v1/status',
      desc: 'System health summary with operational status distributions and recent probe cycles.',
      params: 'None',
    },
    {
      method: 'GET',
      path: '/api/v1/catalog',
      desc: 'Export the complete validated canonical catalog metadata.',
      params: 'None',
    },
    {
      method: 'GET',
      path: '/api/v1/health',
      desc: 'Service health check and database persistence status.',
      params: 'None',
    },
    {
      method: 'POST',
      path: '/api/v1/ingest',
      desc: 'Protected internal endpoint for monitoring workers to submit batch probe results.',
      params: 'Authorization: Bearer <INGESTION_SECRET>, JSON body adhering to IngestionPayloadSchema',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span>Public API & Data Contracts</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Machine-readable REST API endpoints, OpenAPI 3.1 specification, and M31A autonomous agent contract
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/api/v1/openapi.json"
            target="_blank"
            className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-xs font-mono font-medium text-foreground flex items-center gap-1.5 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-emerald-500" />
            <span>openapi.json</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link
            href="/data/m31a-models.json"
            target="_blank"
            className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-xs font-mono font-medium text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>m31a-models.json</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* M31A Autonomous Agent Integration Summary */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-foreground">M31A Autonomous Agent Contract</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The canonical TOML registry publishes a deterministically derived JSON representation at <code className="font-mono text-foreground">/data/m31a-models.json</code> directly compatible with the M31A autonomous agent runtime cache (<code className="font-mono text-foreground">~/.config/m31a/models_cache.json</code>). Newly discovered models appear automatically with zero frontend or client code modifications.
        </p>
      </div>

      {/* Endpoints Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" />
          <span>Available HTTP Endpoints (v1)</span>
        </h2>

        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {endpoints.map((ep) => (
            <div key={ep.path} className="p-4 sm:p-5 space-y-2 hover:bg-secondary/20 transition-colors">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    ep.method === 'GET'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {ep.method}
                </span>
                <span className="font-mono text-xs font-bold text-foreground">{ep.path}</span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{ep.desc}</p>

              <div className="text-[11px] font-mono text-muted-foreground pt-1">
                <span className="text-foreground font-semibold">Parameters:</span> {ep.params}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Examples */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-500" />
          <span>Client Query Examples</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card space-y-2">
            <div className="text-xs font-semibold text-foreground">cURL Query Models</div>
            <pre className="p-3 rounded bg-secondary/80 text-[11px] font-mono overflow-x-auto text-foreground">
{`# Search models with reasoning capability
curl "https://models.m31a.tonmoyinfrastructure.org/api/v1/models?capability=reasoning&pageSize=10"`}
            </pre>
          </div>

          <div className="p-4 rounded-lg border border-border bg-card space-y-2">
            <div className="text-xs font-semibold text-foreground">Python Fetch Status</div>
            <pre className="p-3 rounded bg-secondary/80 text-[11px] font-mono overflow-x-auto text-foreground">
{`import requests

resp = requests.get("https://models.m31a.tonmoyinfrastructure.org/api/v1/status")
print(resp.json())`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
