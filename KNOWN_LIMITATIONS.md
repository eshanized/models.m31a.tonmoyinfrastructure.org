# Known Upstream Data Limitations

1. **Provider-Wide Load & GPU Utilization**:
   NVIDIA Build's shared inference service does not publicly expose real-time GPU cluster utilization, global queue depths, or node concurrency metrics. Our dashboard marks these metrics as *"Not publicly exposed by upstream provider"* and never manufactures speculative utilization percentages.

2. **Self-Hosted NIM vs. Shared Build Service**:
   Metrics that are available when self-hosting an NVIDIA NIM container on private Kubernetes clusters (e.g. Prometheus endpoints `/metrics` exposing GPU memory and vLLM KV-cache metrics) are not accessible on `integrate.api.nvidia.com`.

3. **Pricing Transparency on Emerging Preview Models**:
   Certain early-access or research preview models hosted on NVIDIA Build do not have published per-token billing rates. These models are explicitly labeled as `pricing: not_published` rather than assuming a free tier.

4. **Multi-Turn Canary State**:
   Synthetic probes intentionally execute stateless single-turn canary requests (`{"role": "user", "content": "Ping"}`) with `max_tokens: 4` to minimize cost and latency while verifying endpoint health. Multi-turn conversational latency or large batch throughput may exhibit different characteristics.
