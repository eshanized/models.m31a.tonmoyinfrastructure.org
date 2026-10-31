# M31A Autonomous Agent Integration Contract

## 1. Overview

The **M31A autonomous coding agent** requires high-assurance, machine-readable model metadata to make deterministic routing and planning decisions.

The NVIDIA Build Model Intelligence Dashboard maintains and exports this contract directly from validated canonical TOML records at `public/data/m31a-models.json`.

---

## 2. JSON Schema Specification (`m31a-models.json`)

Each entry in the array adheres to the following contract (matching M31A's `~/.config/m31a/models_cache.json`):

```typescript
export interface M31AModelCandidate {
  /** Canonical NVIDIA slug, e.g. "nvidia/nemotron-4-340b-instruct" */
  slug: string;

  /** Human-readable display name */
  display_name: string;

  /** Model overview description */
  description: string;

  /** Maximum context capacity in tokens */
  context_window: number | null;

  /** Maximum generated output token limit */
  max_output_tokens: number | null;

  /** Whether the model supports function/tool execution */
  supports_tools: boolean | null;

  /** Whether the model supports native reasoning / chain-of-thought */
  supports_thinking: boolean | null;

  /** Whether the model supports image/vision inputs */
  supports_vision: boolean | null;

  /** Whether the model supports audio inputs */
  supports_audio: boolean | null;

  /** Default recommended temperature (0.0 to 1.0) */
  default_temperature: number;

  /** Tool calling mode: "direct" | "unsupported" */
  tool_mode: "direct" | "unsupported" | "unknown";

  /** Supported input modalities: ["text"], ["text", "image"], etc. */
  input_modalities: string[];

  /** Truncation policy when context is exceeded */
  truncation_policy: "truncate" | "error";

  /** Service tier: "fast" | "standard" | "reasoning" */
  service_tier: "fast" | "standard" | "reasoning";

  /** Version of M31A multi-agent specification */
  multi_agent_version: number;

  /** Auto-compact threshold percentage */
  auto_compact_threshold_percent: number;

  /** Custom system instruction template, if applicable */
  instructions_template: string | null;

  /** Whether the endpoint requires an NVIDIA API key */
  requires_auth: boolean;

  /** Whether this is the default M31A router model */
  is_default: boolean;

  /** Model originator / publisher */
  originator: string;
}
```

---

## 3. Automation & Fetch Instructions

M31A agents can directly fetch and refresh local runtime models using:

```bash
# Direct download into M31A config directory
curl -s -f "https://models.m31a.tonmoyinfrastructure.org/data/m31a-models.json" \
  -o "$HOME/.config/m31a/models_cache.json"
```

The exported file is deterministically sorted, validated, and updated during every daily catalog synchronization cycle.
