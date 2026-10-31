'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ExternalLink,
  CheckSquare,
  Square,
  Layers,
  Check,
  ChevronLeft,
  ChevronRight,
  Split,
  Eye,
  Info,
} from 'lucide-react';
import { CanonicalModel, ObservedHealthStatus } from '@/lib/types/registry';
import { StatusBadge } from '@/components/status-badge';
import { formatNumber, formatCurrency, formatTimeAgo, cn } from '@/lib/utils';

interface ModelExplorerProps {
  initialModels: CanonicalModel[];
  publishers: string[];
  statusMap: Record<string, { status: ObservedHealthStatus; latencyMs: number | null }>;
}

export function ModelExplorer({ initialModels, publishers, statusMap }: ModelExplorerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Search & Filter state initialized from URL search params
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedPublisher, setSelectedPublisher] = useState(searchParams.get('pub') || 'all');
  const [selectedModality, setSelectedModality] = useState(searchParams.get('mod') || 'all');
  const [selectedAccess, setSelectedAccess] = useState(searchParams.get('access') || 'all');
  const [selectedCapability, setSelectedCapability] = useState(searchParams.get('cap') || 'all');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || 'all');
  const [priceOnly, setPriceOnly] = useState(searchParams.get('priceOnly') === 'true');
  const [probeOnly, setProbeOnly] = useState(searchParams.get('probeOnly') === 'true');

  // Sort state
  const [sortField, setSortField] = useState<'name' | 'publisher' | 'context' | 'pricing'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    publisher: true,
    status: true,
    context: true,
    pricing: true,
    modalities: true,
    capabilities: true,
  });

  // Filter and sort logic
  const filteredModels = useMemo(() => {
    return initialModels.filter((m) => {
      // Search text
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.publisher.toLowerCase().includes(q) ||
          (m.family && m.family.toLowerCase().includes(q)) ||
          (m.architecture && m.architecture.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Publisher
      if (selectedPublisher !== 'all' && m.publisher !== selectedPublisher) {
        return false;
      }

      // Modality
      if (selectedModality !== 'all' && !m.input_modalities.includes(selectedModality as any)) {
        return false;
      }

      // Access
      if (selectedAccess !== 'all' && m.access_classification !== selectedAccess) {
        return false;
      }

      // Capability
      if (selectedCapability !== 'all') {
        const cap = selectedCapability as keyof CanonicalModel['capabilities'];
        if (m.capabilities[cap] !== true) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        const modelHealth = statusMap[m.id]?.status || (m.eligibility.probe_eligible ? 'unknown' : 'catalog_only');
        if (modelHealth !== selectedStatus) return false;
      }

      // Price published only
      if (priceOnly && (m.pricing.status !== 'published' || m.pricing.input_per_million === null)) {
        return false;
      }

      // Probe eligible only
      if (probeOnly && !m.eligibility.probe_eligible) {
        return false;
      }

      return true;
    });
  }, [
    initialModels,
    search,
    selectedPublisher,
    selectedModality,
    selectedAccess,
    selectedCapability,
    selectedStatus,
    priceOnly,
    probeOnly,
    statusMap,
  ]);

  // Sort
  const sortedModels = useMemo(() => {
    const list = [...filteredModels];
    const mult = sortOrder === 'desc' ? -1 : 1;

    list.sort((a, b) => {
      switch (sortField) {
        case 'publisher':
          return a.publisher.localeCompare(b.publisher) * mult;
        case 'context':
          return ((a.context_window || 0) - (b.context_window || 0)) * mult;
        case 'pricing':
          return ((a.pricing.input_per_million || 0) - (b.pricing.input_per_million || 0)) * mult;
        case 'name':
        default:
          return a.name.localeCompare(b.name) * mult;
      }
    });

    return list;
  }, [filteredModels, sortField, sortOrder]);

  // Paginate
  const totalPages = Math.ceil(sortedModels.length / pageSize) || 1;
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedModels.slice(start, start + pageSize);
  }, [sortedModels, currentPage, pageSize]);

  // Handle sort click
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedPublisher('all');
    setSelectedModality('all');
    setSelectedAccess('all');
    setSelectedCapability('all');
    setSelectedStatus('all');
    setPriceOnly(false);
    setProbeOnly(false);
    setCurrentPage(1);
  };

  // Toggle comparison selection
  const toggleComparison = (id: string) => {
    if (selectedForComparison.includes(id)) {
      setSelectedForComparison(selectedForComparison.filter((item) => item !== id));
    } else {
      if (selectedForComparison.length >= 4) {
        alert('You can compare up to 4 models simultaneously.');
        return;
      }
      setSelectedForComparison([...selectedForComparison, id]);
    }
  };

  const comparedModels = useMemo(() => {
    return initialModels.filter((m) => selectedForComparison.includes(m.id));
  }, [initialModels, selectedForComparison]);

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedPublisher !== 'all' ||
    selectedModality !== 'all' ||
    selectedAccess !== 'all' ||
    selectedCapability !== 'all' ||
    selectedStatus !== 'all' ||
    priceOnly ||
    probeOnly;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <span>NVIDIA Build Model Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Authoritative foundation models cataloged from NVIDIA Build with verified context limits, capabilities, and synthetic health
          </p>
        </div>

        {selectedForComparison.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComparisonModal(true)}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium text-xs flex items-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Compare Selected ({selectedForComparison.length})</span>
            </button>
            <button
              onClick={() => setSelectedForComparison([])}
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground text-xs"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-lg border border-border bg-card space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by model ID, name, publisher, family, architecture..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 rounded-md bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPublisher}
              onChange={(e) => {
                setSelectedPublisher(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-md bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Publishers ({publishers.length})</option>
              {publishers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={selectedModality}
              onChange={(e) => {
                setSelectedModality(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-md bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Modalities</option>
              <option value="text">Text Only</option>
              <option value="image">Vision / Multimodal</option>
              <option value="audio">Audio</option>
              <option value="embedding">Embedding</option>
            </select>

            <select
              value={selectedCapability}
              onChange={(e) => {
                setSelectedCapability(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-2 rounded-md bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Capabilities</option>
              <option value="reasoning">Reasoning / Thinking</option>
              <option value="tool_calling">Tool Calling</option>
              <option value="vision">Vision</option>
              <option value="structured_output">Structured Output</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-2 rounded-md border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Checkbox Toggles & Column Visibility */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={priceOnly}
                onChange={(e) => {
                  setPriceOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-border accent-emerald-500"
              />
              <span>Published Pricing Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={probeOnly}
                onChange={(e) => {
                  setProbeOnly(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-border accent-emerald-500"
              />
              <span>Probe Eligible Only</span>
            </label>
          </div>

          <div className="font-mono text-[11px]">
            Showing {sortedModels.length} of {initialModels.length} models
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {paginatedModels.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Info className="w-8 h-8 mx-auto text-muted-foreground opacity-60" />
            <div className="text-sm font-semibold text-foreground">No models matched your criteria</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your query or resetting filters to inspect the full canonical NVIDIA Build catalog.
            </p>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground border-b border-border font-medium">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Model & Family</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('publisher')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Publisher</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">Status</th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('context')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Context</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => handleSort('pricing')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Pricing (1M)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-2.5 px-4">Modalities</th>
                  <th className="py-2.5 px-4">Capabilities</th>
                  <th className="py-2.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedModels.map((model) => {
                  const isSelected = selectedForComparison.includes(model.id);
                  const health = statusMap[model.id]?.status || (model.eligibility.probe_eligible ? 'unknown' : 'catalog_only');

                  return (
                    <tr
                      key={model.id}
                      className={cn(
                        'hover:bg-secondary/30 transition-colors',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleComparison(model.id)}
                          className="text-muted-foreground hover:text-foreground"
                          title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/models/${encodeURIComponent(model.id)}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block"
                        >
                          {model.name}
                        </Link>
                        <div className="font-mono text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                          {model.id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {model.publisher}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={health} />
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {model.context_window ? (
                          <span>{formatNumber(model.context_window)}</span>
                        ) : (
                          <span className="text-muted-foreground">Not published</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {model.pricing.status === 'published' && model.pricing.input_per_million !== null ? (
                          <span>
                            {formatCurrency(model.pricing.input_per_million)} in / {formatCurrency(model.pricing.output_per_million)} out
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not published</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {model.input_modalities.map((mod) => (
                            <span
                              key={mod}
                              className="px-1.5 py-0.2 rounded bg-secondary text-[10px] font-mono capitalize"
                            >
                              {mod}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {model.capabilities.reasoning && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                              Reasoning
                            </span>
                          )}
                          {model.capabilities.tool_calling && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                              Tools
                            </span>
                          )}
                          {model.capabilities.vision && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-medium">
                              Vision
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/models/${encodeURIComponent(model.id)}`}
                          className="px-2.5 py-1 rounded border border-border hover:bg-secondary text-foreground text-xs font-medium transition-colors inline-block"
                        >
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {sortedModels.length > pageSize && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-secondary/20">
            <div>
              Page <span className="font-mono text-foreground">{currentPage}</span> of{' '}
              <span className="font-mono text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-border disabled:opacity-30 hover:bg-secondary text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-border disabled:opacity-30 hover:bg-secondary text-foreground"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparison Drawer / Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Split className="w-5 h-5 text-primary" />
                  <span>Model Comparison Matrix</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Side-by-side specification and pricing comparison. Unavailable values are explicitly marked.
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground border border-border hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {comparedModels.map((m) => {
                const health = statusMap[m.id]?.status || (m.eligibility.probe_eligible ? 'unknown' : 'catalog_only');
                return (
                  <div key={m.id} className="p-4 rounded-lg border border-border bg-secondary/20 space-y-4 text-xs">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{m.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground break-all">{m.id}</div>
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</div>
                        <div className="mt-1">
                          <StatusBadge status={health} />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Publisher</div>
                        <div className="font-mono font-medium text-foreground">{m.publisher}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Context Window</div>
                        <div className="font-mono font-medium text-foreground">
                          {m.context_window ? `${formatNumber(m.context_window)} tokens` : 'Not published'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Output</div>
                        <div className="font-mono font-medium text-foreground">
                          {m.max_output_tokens ? `${formatNumber(m.max_output_tokens)} tokens` : 'Not published'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Input Pricing</div>
                        <div className="font-mono font-medium text-foreground">
                          {m.pricing.input_per_million !== null ? formatCurrency(m.pricing.input_per_million) : 'Not published'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Output Pricing</div>
                        <div className="font-mono font-medium text-foreground">
                          {m.pricing.output_per_million !== null ? formatCurrency(m.pricing.output_per_million) : 'Not published'}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Architecture</div>
                        <div className="font-medium text-foreground">{m.architecture || 'Not published'}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tool Calling</div>
                        <div className="font-mono">{m.capabilities.tool_calling ? '✓ Supported' : '✕ Not supported'}</div>
                      </div>

                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Reasoning</div>
                        <div className="font-mono">{m.capabilities.reasoning ? '✓ Supported' : '✕ Standard'}</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/models/${encodeURIComponent(m.id)}`}
                        className="w-full py-1.5 px-3 rounded bg-secondary hover:bg-secondary/80 border border-border text-center block font-medium"
                      >
                        Inspect Full Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
