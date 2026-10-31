# Known Upstream Data Limitations

1. **Provider-Wide Load & GPU Utilization**:
   NVIDIA Build's shared inference service does not publicly expose real-time GPU cluster utilization, global queue depths, or node concurrency metrics. Our dashboard marks these metrics as *"Not publicly exposed by upstream provider"* and never manufactures speculative utilization percentages.

2. **Self-Hosted NIM vs. Shared Build Service**:
   Metrics that are available when self-hosting an NVIDIA NIM container on private Kubernetes clusters (e.g. Prometheus endpoints `/metrics` exposing GPU memory and vLLM KV-cache metrics) are not accessible on `integrate.api.nvidia.com`.

3. **Pricing Transparency on Emerging Preview Models**:
   Certain early-access or research preview models hosted on NVIDIA Build do not have published per-token billing rates. These models are explicitly labeled as `pricing: not_published` rather than assuming a free tier.

4. **Multi-Turn Canary State**:
   Synthetic probes intentionally execute stateless single-turn canary requests (`{"role": "user", "content": "Ping"}`) with `max_tokens: 4` to minimize cost and latency while verifying endpoint health. Multi-turn conversational latency or large batch throughput may exhibit different characteristics.


5. **Static publication latency**:
   Monitoring data is committed and deployed through GitHub Actions. Public observations therefore become visible after the publication and Pages deployment complete, not immediately at inference time. The dashboard labels a snapshot stale after three hours without a successful cycle.

6. **Non-streaming canary measurements**:
   Current canaries use non-streaming chat completions. They measure total HTTP request duration and observed output-token throughput; they do not measure time-to-first-token. TTFT is intentionally null until a streaming probe is implemented and validated.

7. **Public observation history**:
   Published observation records are public. The worker stores no API keys, prompts, or raw inference response content. The static contract is bounded to 14 days, 30 observations per model, 3,000 observations total, and a 2 MiB document maximum.

8. **Catalog discovery completeness**:
   The daily sync depends on NVIDIA's public `models.md` directory and model-card Markdown. Any HTTP error, missing card, invalid canonical ID, or unrecognized model-card front matter aborts the entire run before canonical files are written. Models absent from one successful snapshot are retained until retirement is independently verified.
