# KAIROS AI — Model Strategy, Rate Limiting & Architecture Decisions

> **Date:** 2026-03-11  
> **Author:** AI Architecture Review  
> **Scope:** Model evaluation, rate limiting, WebSocket migration, middleware→proxy

---

## 1. AI Model Analysis & Strategy

### 1.1 Current Setup

| Slot | Model | Params | Context | License | Cost |
|------|-------|--------|---------|---------|------|
| **Primary** | `Qwen/Qwen2.5-7B-Instruct` | 7.6B | 128K | Apache 2.0 | Medium |
| **Fallback** | `microsoft/Phi-3.5-mini-instruct` | 3.8B | 128K | MIT | Low |

**Deployment:** HuggingFace Inference API (OpenAI-compatible `/v1/chat/completions` via raw `fetch`).  
**Settings:** temperature=0.2, max_tokens=4096, 60s timeout, JSON mode enabled.

### 1.2 Token & Performance Analysis

**Per-request token budget:**
- System prompt: ~1,500–3,000 tokens (varies by agent; A4 Events Publisher is heaviest)
- Context pack (injected JSON): ~200–2,000 tokens (depends on project size)
- User message: up to ~5,000 tokens (20,000 char limit)
- Completion: ~100–1,000 tokens (JSON output)
- JSON repair rounds: up to 2 additional completion calls

**Estimated per-interaction cost:**
- Average: ~3,000–5,000 total tokens per A1 query
- Heavy: ~8,000–10,000 tokens for A2/A3/A4 draft with large context
- PDF extraction: up to ~15,000 tokens (30K char PDF → 8K tokens + prompt)

**Performance characteristics (HuggingFace Inference):**
- Qwen 7B: ~2–6s latency, serverless cold starts possible (~10–15s)
- Phi 3.5 mini: ~1–3s latency, lighter but less accurate for structured JSON
- No streaming—client waits for full response

**Current limitations:**
- HuggingFace free tier: rate-limited by API (varies, ~100–300 req/hour)
- No local inference fallback
- Fallback model (Phi) is configured but never explicitly triggered by code
- No token usage tracking or cost monitoring

### 1.3 Model Recommendations — Expanding Options

The current Qwen 7B + Phi 3.5 setup is solid but limited. Here's the recommended expansion strategy:

#### Tier 1: Immediate Upgrade — Meta Llama 3.1 8B Instruct

| Property | Value |
|----------|-------|
| Model | `meta-llama/Llama-3.1-8B-Instruct` |
| Params | 8B |
| Context | 128K |
| License | Llama 3.1 Community License (permissive, commercial OK under 700M MAU) |
| JSON reliability | High (strong instruction following) |
| Multilingual | EN, DE, FR, ES, IT, PT, HI, TH (covers KAIROS i18n minus BG) |

**Why Llama 3.1 8B:**
- Broadly regarded as the strongest open 8B model for instruction following
- Superior function calling and structured output compared to Qwen 7B in many benchmarks
- Massive ecosystem: HuggingFace, Ollama, vLLM, llama.cpp all support it
- Better multilingual coverage than Phi 3.5
- Available on HuggingFace Inference API (same integration path)

**Integration:** Drop-in replacement via `LLM_DEFAULT_MODEL` env var. No code changes needed.

#### Tier 2: Quality Upgrade — Qwen 2.5 14B or Llama 3.1 70B

For users or orgs needing higher-quality planning and analysis:

| Model | Params | Best For | Trade-off |
|-------|--------|----------|-----------|
| `Qwen/Qwen2.5-14B-Instruct` | 14.7B | JSON reliability, nuanced planning | 2x inference cost |
| `meta-llama/Llama-3.1-70B-Instruct` | 70B | Complex multi-step reasoning | 10x inference cost, needs GPU |

#### Tier 3: Lightweight Fallback — Llama 3.2 3B

| Property | Value |
|----------|-------|
| Model | `meta-llama/Llama-3.2-3B-Instruct` |
| Params | 3.2B |
| Context | 128K |
| Use case | Fallback when primary model is unavailable or for simple queries |

**Better than Phi 3.5 for:** Instruction following, function calling consistency.  
**Worse than Phi 3.5 for:** Very long context reasoning (Phi has slight edge per-parameter).

#### Recommended Model Configuration

```env
# Primary — best balance of quality/speed/cost
LLM_DEFAULT_MODEL=meta-llama/Llama-3.1-8B-Instruct

# Fallback — lightweight, fast
LLM_FALLBACK_MODEL=meta-llama/Llama-3.2-3B-Instruct

# Quality tier (optional, for premium orgs)
LLM_QUALITY_MODEL=Qwen/Qwen2.5-14B-Instruct
```

#### Automatic Fallback Implementation

The `modelClient.ts` should be enhanced to:
1. Try primary model
2. On 429/503/timeout → retry with fallback model
3. Log model used for each request (for cost tracking)

This is already architected (env vars exist) but never wired in code. The fallback logic should be added to `chatCompletion()`.

### 1.4 Decision Matrix

| Criteria | Qwen 7B (current) | Llama 3.1 8B (recommended) | Phi 3.5 mini | Llama 3.2 3B |
|----------|-------------------|--------------------------|-------------|-------------|
| JSON structured output | ★★★★ | ★★★★★ | ★★★ | ★★★ |
| Instruction following | ★★★★ | ★★★★★ | ★★★ | ★★★★ |
| Multilingual | ★★★★ | ★★★★ | ★★★ | ★★★ |
| Planning/Reasoning | ★★★ | ★★★★ | ★★★ | ★★★ |
| Speed (HF Inference) | ★★★★ | ★★★★ | ★★★★★ | ★★★★★ |
| License simplicity | ★★★★★ (Apache 2.0) | ★★★★ (Llama CL) | ★★★★★ (MIT) | ★★★★ (Llama CL) |
| Ecosystem / community | ★★★★ | ★★★★★ | ★★★ | ★★★★ |

**Verdict:** Switch primary to **Llama 3.1 8B**, keep Qwen 7B as alternate, use **Llama 3.2 3B** as fallback. Phi 3.5 mini retired from active use but stays as emergency fallback.

---

## 2. Rate Limiting Strategy

### 2.1 Implemented Design

**Limit: 50 AI messages per user per 24-hour sliding window.**

This number was chosen based on:
- **Typical usage patterns:** Power users send 20–30 AI queries/day. 50 gives generous headroom.
- **HuggingFace free tier alignment:** ~100–300 req/hour shared across all users. 50/user/day prevents any single user from exhausting the quota.
- **Cost control:** At ~5,000 tokens/request average, 50 requests = ~250K tokens/user/day. For 100 users that's 25M tokens/day — manageable on inference API.
- **UX balance:** High enough that casual users never hit it. Low enough that abuse is prevented.

### 2.2 What's Rate-Limited

| Procedure | Rate-Limited? | Reason |
|-----------|:------------:|--------|
| `agent.draft` (A1) | ✅ | LLM call |
| `agent.projectChatbot` (A1) | ✅ | LLM call |
| `agent.taskPlannerDraft` (A2) | ✅ | LLM call |
| `agent.notesVaultDraft` (A3) | ✅ | LLM call |
| `agent.eventsPublisherDraft` (A4) | ✅ | LLM call |
| `agent.generateTaskDrafts` | ✅ | LLM call |
| `agent.extractTasksFromPdf` | ✅ | LLM call |
| `agent.*Confirm` | ❌ | No LLM call, just token minting |
| `agent.*Apply` | ❌ | No LLM call, just DB writes |
| `agent.rateLimitStatus` | ❌ | Read-only status check |

### 2.3 User Experience

When the limit is hit:
1. **tRPC error:** `TOO_MANY_REQUESTS` with descriptive message
2. **Popup notification:** Modal overlay with Sparkles icon, explaining the limit and reset time
3. **Chat message:** Thinking indicator replaced with "You've reached your daily message limit."
4. **Header indicator:** Rate limit query refreshes to show current status

### 2.4 Storage

Currently using **in-memory Map** with periodic cleanup. This is appropriate for:
- Single-instance deployments (current)
- Development environments
- Resets on server restart (acceptable — generous limit)

**For multi-instance production:** Swap to Redis-backed counter with TTL:
```typescript
// Redis key: `ratelimit:ai:${userId}`
// INCR + EXPIRE with 86400s TTL
```

### 2.5 Future Enhancements

- **Tiered limits:** Free users = 50/day, Pro users = 200/day, Org admins = unlimited
- **Carry-over:** Unused quota partially rolls into next day
- **Burst protection:** Max 10 requests/minute (prevent rapid-fire)
- **Dashboard:** Admin panel showing usage across all users
- **Token-based billing:** Track actual token consumption, not just request count

---

## 3. Middleware → Proxy Migration

### What Changed

| Aspect | Before | After |
|--------|--------|-------|
| File | `src/middleware.ts` | `src/proxy.ts` |
| Export | `export default function middleware()` | `export default function proxy()` |
| Convention | Deprecated in Next.js 16 | New `proxy` convention |
| Behavior | Identical | Identical |

### Why

Next.js 16 deprecated the `middleware` file convention in favor of `proxy` to:
- Avoid confusion with Express.js middleware patterns
- Clarify that this runs at the network edge, not in the application
- Signal that Next.js is moving toward better APIs that replace middleware use cases

### Test Update

`tests/server/middleware.test.ts` updated to read from `src/proxy.ts` and match `proxy` function export.

---

## 4. WebSocket Plan Summary

Full plan: [`docs/additions/2026-03-11-websocket-implementation-plan.md`](../additions/2026-03-11-websocket-implementation-plan.md)

**Key decisions:**
- **Library:** Socket.IO (WebSocket + polling fallback, rooms, auto-reconnect)
- **Architecture:** Additive to tRPC. Socket.IO handles push events only. tRPC keeps all mutations/queries.
- **Auth:** Parse NextAuth session cookie from handshake headers
- **Rooms:** `user:{id}`, `conversation:{id}`, `org:{id}`, `project:{id}`
- **Migration order:** Chat → Notifications → Agent Status → Collaboration
- **Server:** Custom `server.ts` wrapping Next.js + HTTP server + Socket.IO
- **Current polling eliminated:** ~720 requests/user/hour saved

---

## 5. Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/server/rateLimit.ts` | **Created** | In-memory sliding window rate limiter |
| `src/server/api/routers/agent.ts` | **Modified** | Added `rateLimitedProcedure`, `rateLimitStatus` query |
| `src/components/projects/ProjectIntelligenceChat.tsx` | **Modified** | Rate limit popup, error handling, status query |
| `src/proxy.ts` | **Created** | Replacement for deprecated middleware.ts |
| `src/middleware.ts` | **Deleted** | Deprecated by Next.js 16 |
| `tests/server/middleware.test.ts` | **Modified** | Updated to reference proxy.ts |
| `docs/additions/2026-03-11-websocket-implementation-plan.md` | **Created** | Full Socket.IO implementation plan |
| `docs/additions/2026-03-11-model-strategy-ratelimiting.md` | **Created** | This document |
