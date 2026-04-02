# Kairos (KAIROS) — Free/Open Model Research + Repo-Tailored Recommendation

## 1) Executive summary

**Recommendation (primary):** **[`Qwen/Qwen2.5-7B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct)** (Apache 2.0) for the default “Kairos agent” model.

**Fallback (small + cheap):** **[`microsoft/Phi-3.5-mini-instruct`](https://huggingface.co/microsoft/Phi-3.5-mini-instruct)** (MIT) when you need low-cost CPU/small-GPU inference while retaining strong long-context capability.

Why these two fit **this repository**:
- Kairos is a **Next.js + tRPC + Postgres (Drizzle)** collaboration app (projects/tasks/events/notes/chat/orgs). The natural agent workloads are **planning, summarization, triage, timeline fitting, status updates, and grounded Q&A** over project/task/note data.
- Those workloads reward models that are **instruction-following**, robust at **structured outputs (JSON)**, and can handle **long context** (many tasks / activity logs / notes). Qwen2.5 explicitly emphasizes **long context (up to 128K)** and **structured outputs/JSON** in its model card; Phi-3.5-mini explicitly supports **128K context** and is intended for **memory/compute constrained environments**.

A note about “reasoning-first” models:
- **[`deepseek-ai/DeepSeek-R1`](https://huggingface.co/deepseek-ai/DeepSeek-R1)** is extremely strong, but is **very heavy (MoE; 671B total / 37B activated)** and carries usage guidance that conflicts with common “system prompt” based agent scaffolding (DeepSeek recommends avoiding system prompts). It’s better positioned as an **optional specialized backend** (or via distills) rather than the default for this repo.

---

## 2) Step 0 — Free-model landscape overview (broad inventory; no web)

Below is a “from scratch” catalog of **realistically usable free models** for agentic workflows (tool-use, planning, coding, summarization, extraction). “Free” here means **open weights runnable locally** or a **truly usable free tier**.

### Major open-weight model families

- **Qwen (Qwen2 / Qwen2.5)**
  - Typical sizes: ~0.5B, 1.5B, 3B, 7B, 14B, 32B, 72B (+ coder variants)
  - Strengths: instruction following, strong multilingual, strong coding variants, generally solid long-context and structured outputs
  - Deployment: `Transformers`, `vLLM`, `llama.cpp`/GGUF community conversions, **Ollama** community packaging

- **Microsoft Phi (Phi-3 / Phi-3.5 / Phi-4 mini variants)**
  - Typical sizes: ~3–4B for “mini”, larger for MoE/vision variants
  - Strengths: excellent “reasoning per parameter,” long-context, good for summaries + extraction; often strong for size
  - Deployment: `Transformers`, ONNX variants, many community runtimes

- **Meta Llama (Llama 3 / 3.1 / 3.2 / 3.3)**
  - Typical sizes: ~8B, 70B, etc.
  - Strengths: very strong general instruction models; huge ecosystem
  - Deployment: `Transformers`, `vLLM`, `llama.cpp`, Ollama
  - Caveat: license terms require review for product distribution.

- **Mistral / Mixtral / “NeMo”**
  - Typical sizes: ~7B, 8x7B MoE, 12B, etc.
  - Strengths: strong instruction models, good tool-use, strong multilingual; many Apache 2.0 releases
  - Deployment: `Transformers`, `vLLM`, `llama.cpp`, Ollama

- **Google Gemma / CodeGemma / FunctionGemma**
  - Typical sizes: ~2B–27B depending on generation
  - Strengths: solid instruction; FunctionGemma aimed at function calling
  - Deployment: `Transformers`, `vLLM`, `llama.cpp`
  - Caveat: “Terms of Use” (not an OSI-style open-source license).

- **DeepSeek (chat/coder/reasoning families)**
  - Typical sizes: 7B/14B/… plus MoE reasoning models
  - Strengths: coding and reasoning variants; R1 notable for reasoning
  - Deployment: depends on model; `vLLM` common for serving

- **Yi (01-ai)**
  - Typical sizes: 6B/9B/34B families
  - Strengths: strong general assistant; good multilingual
  - Deployment: `Transformers`, `vLLM`, `llama.cpp`

- **Other widely used open models**
  - **OLMo (AllenAI):** open science posture; strong instruct variants
  - **Tulu (AllenAI):** instruction fine-tunes in open ecosystem
  - **Nous Hermes / OpenChat / Zephyr:** community instruction models; quality varies
  - **SmolLM / MiniCPM:** small footprint options

### Common local deployment options

- **Ollama**: easiest “developer workstation” path (pull model + HTTP API)
- **llama.cpp / GGUF**: broad hardware support, great for CPU and quantized GPU
- **vLLM**: best for throughput + OpenAI-compatible serving patterns
- **Transformers**: easiest for experimentation and direct embedding into Python stacks

---

## 3) Step 1 — Repository needs & constraints (derived from repo, not folder assumptions)

### Repo reality (current)

From [`README.md`](README.md:1), [`package.json`](package.json:1), and the server routers (e.g. [`projectRouter`](src/server/api/routers/project.ts:6), [`taskRouter`](src/server/api/routers/task.ts:7), [`noteRouter`](src/server/api/routers/note.ts:9), [`chatRouter`](src/server/api/routers/chat.ts:49)):
- **Stack:** Next.js App Router + React + TypeScript + Tailwind; backend via Next.js API + **tRPC v11**; DB is **PostgreSQL** with **Drizzle ORM**.
- **Features & data:** projects, tasks, events (public), sticky notes (optionally password-protected), organizations & membership permissions, notifications, direct project chat.
- **Auth & security:** NextAuth; role-based access; note password handling indicates privacy sensitivity.

### Must-read: future direction

[`docs/PROJECT_DOCUMENTATION.md`](docs/PROJECT_DOCUMENTATION.md:1) describes a future where Kairos supports **multiple “agents”** operating over your existing domain objects (projects/tasks/notes/chat/org/notifications), with a pattern of:
- fetch context via tools
- prompt
- call an LLM for **structured output**
- validate via schema (Zod) and optionally write back

Even though the current workspace listing doesn’t show the referenced `src/agents/*` files, the **product direction is clear**: you want “agentic features” integrated into the app.

### Inferred agent workloads (current + planned)

High-value agent tasks for Kairos’ domain:
- Project planning → generate task lists, milestones, priorities
- Task decomposition → break tasks into subtasks/dependencies
- Backlog triage → identify blockers, propose next actions
- Timeline fitting → schedule tasks to dates (critical path-lite)
- Weekly status updates → summarize project progress from tasks/activity
- Notes clustering/summarization → group sticky notes, extract themes
- RAG Q&A → answer “what’s going on?” grounded in tasks/notes/chat

### Hard constraints (“must”)

- **Free to run** locally (open weights) OR at least open-friendly + realistic
- **Long-context friendly** (projects can have many tasks/notes/messages)
- **Strong instruction following + structured output reliability**
- **License suitable for redistribution/product use**
- Easy operationalization in a JS/TS backend: **prefer OpenAI-compatible HTTP** (vLLM/LM Studio/etc.)

### Preferences (“should”)

- Robust multi-lingual (Kairos has i18n: EN/BG/ES/FR/DE)
- Reasonable latency on a single GPU (or acceptable CPU fallback)
- Good “planning/summarization” behavior without heavy prompt hacks

### Model profiles worth supporting

- **Tiny / CPU-first:** 3–4B instruct (Phi-3.5-mini)
- **Default general agent model:** 7–8B instruct (Qwen2.5-7B)
- **Higher-quality upgrade path:** 12–14B instruct (Mistral NeMo 12B or Qwen2.5-14B)
- **Specialized reasoning (optional):** DeepSeek R1 distills (if you can integrate prompt constraints)

---

## 4) Step 2 — Evidence-backed model comparison (with citations)

### Comparison table (Kairos-focused)

| Model | Params | Context | License | Evidence highlights | Fit for Kairos |
|---|---:|---:|---|---|---|
| [`Qwen2.5-7B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct) | 7.61B | 131,072 | Apache 2.0 (family; see 14B license) | Model card highlights long context + structured outputs/JSON + system prompt resilience | **Best default** for planning + structured JSON + multilingual |
| [`Qwen2.5-14B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-14B-Instruct) | 14.7B | 131,072 | Apache 2.0 | Higher quality; still 128K; JSON + long-context | Best “upgrade” if GPU budget allows |
| [`Phi-3.5-mini-instruct`](https://huggingface.co/microsoft/Phi-3.5-mini-instruct) | 3.8B | 128K | MIT | Designed for constrained envs; 128K context; strong reasoning per size | Best lightweight fallback for summaries/extraction |
| [`Mistral-Nemo` (12B)](https://mistral.ai/news/mistral-nemo) | 12B | 128K | Apache 2.0 | 128K context; trained on function calling; multilingual | Strong alternate default if you want Mistral ecosystem |
| [`DeepSeek-R1`](https://huggingface.co/deepseek-ai/DeepSeek-R1) | 671B (37B active) | 128K | MIT | Very strong reasoning; but heavy + usage guidance (“avoid system prompt”) | Optional specialized backend, not default |
| Gemma family | varies | varies | Terms of Use | Distribution/redistribution requirements + restrictions | Potential license friction for products |

### Key supporting citations

- Qwen2.5 improvements include **structured outputs (JSON)** and **128K context**, per Qwen’s Qwen2.5 blog: https://qwenlm.github.io/blog/qwen2.5-llm/
- Qwen2.5-7B-Instruct model card states **Long-context Support up to 128K** and mentions **generating structured outputs especially JSON**: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
- Qwen2.5-14B-Instruct model card also states **131,072 context**: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct
- Qwen2.5-14B-Instruct license file is **Apache 2.0**: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct/blob/main/LICENSE
- Phi-3.5-mini model card: **128K context**, intended for constrained environments: https://huggingface.co/microsoft/Phi-3.5-mini-instruct
- Phi-3.5-mini license is **MIT**: https://huggingface.co/microsoft/Phi-3.5-mini-instruct/blob/main/LICENSE
- Mistral NeMo announcement: **12B**, **128K context**, **Apache 2.0**, trained on function calling: https://mistral.ai/news/mistral-nemo
- DeepSeek R1 model card: lists **671B total / 37B activated**, **128K context**, and recommends **avoiding a system prompt**: https://huggingface.co/deepseek-ai/DeepSeek-R1
- DeepSeek R1 license is **MIT**: https://huggingface.co/deepseek-ai/DeepSeek-R1/blob/main/LICENSE
- Gemma Terms define “Distribution” and impose restrictions/notice obligations: https://ai.google.dev/gemma/terms

---

## 5) Detailed model notes (Kairos-specific)

### 5.1 Qwen2.5 Instruct (primary)

**Best default:** [`Qwen/Qwen2.5-7B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct)

Evidence:
- The model card states **“Long-context Support up to 128K tokens”** and emphasizes improvements in **“generating structured outputs especially JSON”** plus resilience to system prompts. https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
- Qwen’s release blog includes a model table listing **context length 128K** for 7B/14B/32B/72B, and explicitly highlights improved **JSON structured outputs**. https://qwenlm.github.io/blog/qwen2.5-llm/

Why it matches Kairos:
- Planning and decomposition agents can require **large prompt contexts** (tasks + comments + activity log + notes).
- Your tRPC procedures and DB constraints will benefit from **strict JSON** outputs that can be validated before writing.

**Upgrade path:** [`Qwen/Qwen2.5-14B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-14B-Instruct)
- Same 128K context, more capacity for nuanced planning.

### 5.2 Phi-3.5-mini (fallback)

Fallback model: [`microsoft/Phi-3.5-mini-instruct`](https://huggingface.co/microsoft/Phi-3.5-mini-instruct)

Evidence:
- The model card states **128K context** and positions the model for **memory/compute constrained environments**. https://huggingface.co/microsoft/Phi-3.5-mini-instruct

Why it matches Kairos:
- Ideal for **status updates**, **note summarization**, and **triage drafts** where you want cheaper inference.
- Still supports long contexts, helpful for summarizing long projects.

### 5.3 Mistral NeMo (alternate)

Alternate default: Mistral NeMo (12B)

Evidence:
- Mistral announces **12B**, **128K context**, **Apache 2.0**, and explicitly says it’s **trained on function calling**. https://mistral.ai/news/mistral-nemo

Why it might be chosen:
- If you prefer the Mistral ecosystem and want function-calling training as a first-class signal.

### 5.4 DeepSeek R1 (optional specialist)

Evidence:
- The DeepSeek R1 model card lists **671B total / 37B activated**, **128K context**, and provides usage recommendations including **“Avoid adding a system prompt”**. https://huggingface.co/deepseek-ai/DeepSeek-R1

Why it’s not the default:
- The operational footprint is high.
- The “avoid system prompt” advice conflicts with typical system-message based agent scaffolding.

---

## 6) Licensing & compliance

- **Apache 2.0 (Qwen2.5, Mistral NeMo)**: generally straightforward for commercial redistribution; keep license/NOTICE obligations. Example: Qwen2.5-14B license file is Apache 2.0. https://huggingface.co/Qwen/Qwen2.5-14B-Instruct/blob/main/LICENSE
- **MIT (Phi-3.5-mini, DeepSeek R1)**: highly permissive; keep copyright + license.
  - Phi-3.5-mini MIT license: https://huggingface.co/microsoft/Phi-3.5-mini-instruct/blob/main/LICENSE
  - DeepSeek R1 MIT license: https://huggingface.co/deepseek-ai/DeepSeek-R1/blob/main/LICENSE
- **Gemma Terms of Use**: not a standard open-source license; includes distribution obligations and restrictions. This can be fine for some deployments but adds compliance overhead. https://ai.google.dev/gemma/terms

Given Kairos’ “platform” nature, prefer **Apache 2.0 / MIT** model families.

---

## 7) Deployment options (aligned to a TS backend)

Since Kairos is TypeScript-first, the simplest integration is to serve the model behind an **OpenAI-compatible HTTP endpoint**.

### Option A: vLLM (recommended for production-ish serving)

- Qwen model cards explicitly recommend vLLM for deployment, especially around long-context/YARN configuration. https://huggingface.co/Qwen/Qwen2.5-7B-Instruct

Pattern:
- Run `vllm serve <model>` and point your app to it using `OPENAI_BASE_URL` style configuration.

### Option B: Ollama (recommended for local developer experience)

Pattern:
- Use Ollama for pulling/running common instruct models with a simple local HTTP API.
- Best for developer workstations and “click-to-run” demos.

### Option C: llama.cpp / GGUF (CPU/edge)

Pattern:
- If you need CPU-friendly inference, use GGUF quantized variants.

---

## 8) Final recommendation + implementation plan

### Recommendation

- **Primary:** [`Qwen/Qwen2.5-7B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct)
- **Fallback:** [`microsoft/Phi-3.5-mini-instruct`](https://huggingface.co/microsoft/Phi-3.5-mini-instruct)

### Decision matrix (Kairos priorities)

| Criteria | Qwen2.5-7B Instruct | Phi-3.5-mini Instruct | Mistral NeMo 12B | DeepSeek R1 |
|---|---:|---:|---:|---:|
| License simplicity | High (Apache 2.0) | High (MIT) | High (Apache 2.0) | High (MIT) |
| Structured JSON reliability | High (explicitly emphasized) | Medium–High | High | Medium (prompting constraints) |
| Long context | High (128K) | High (128K) | High (128K) | High (128K) |
| Cost to run | Medium | **Low** | Medium–High | **Very high** |
| Fit for planning agents | **High** | Medium | High | High (but operationally heavy) |
| Integration friction | Low (OpenAI-compat serving) | Low | Low | Medium (prompt rules) |

### Prompting guidance for Kairos-style “agents”

- Prefer **schema-first** prompting:
  - Provide the JSON schema (or Zod-derived JSON schema) in the prompt.
  - Require **no extra keys**, and to return **JSON only**.
- Use “two-pass” safety for writes:
  1) model proposes plan
  2) user confirms
  3) model emits a second JSON payload that is applied to DB

### Context + RAG strategy

Given long context needs, but also performance:
- Keep a **rolling summary** per project (updated daily/weekly).
- Retrieve “top-K relevant tasks/notes/messages” by simple heuristics initially (recent + high priority + blocked) before you invest in embeddings.

### Quantization guidance

- For workstation deployments, consider:
  - 7B: 4-bit quantization often yields good latency/VRAM tradeoffs
  - 3–4B: can be very cheap even on CPU

---

## Appendix — Source index

- Qwen2.5 release blog: https://qwenlm.github.io/blog/qwen2.5-llm/
- Qwen2.5-7B-Instruct model card: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
- Qwen2.5-14B-Instruct model card: https://huggingface.co/Qwen/Qwen2.5-14B-Instruct
- Qwen2.5-14B-Instruct license (Apache 2.0): https://huggingface.co/Qwen/Qwen2.5-14B-Instruct/blob/main/LICENSE
- Phi-3.5-mini-instruct model card: https://huggingface.co/microsoft/Phi-3.5-mini-instruct
- Phi-3.5-mini-instruct license (MIT): https://huggingface.co/microsoft/Phi-3.5-mini-instruct/blob/main/LICENSE
- Mistral NeMo announcement: https://mistral.ai/news/mistral-nemo
- DeepSeek R1 model card: https://huggingface.co/deepseek-ai/DeepSeek-R1
- DeepSeek R1 license (MIT): https://huggingface.co/deepseek-ai/DeepSeek-R1/blob/main/LICENSE
- Gemma Terms of Use: https://ai.google.dev/gemma/terms
