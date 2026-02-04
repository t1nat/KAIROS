# Agent plan env vars (from `docs/agent-implementation-plan.md`)

This file lists **only** the environment variables mentioned/required by the agent plan, plus **where to get each value**.

Because you said you **won’t be hosting inference yourself**, you’ll need a **hosted API** that your backend can call.

This app’s agent code expects an **OpenAI-compatible Chat Completions API** (base URL + key + model id).

This doc is now written for **Hugging Face Inference Providers only** (so you can copy/paste the model names directly).

Sources:
- Hugging Face Inference Providers overview + OpenAI-compatible endpoint: https://huggingface.co/docs/inference-providers/en/index
- HF Chat Completion task docs (OpenAI SDK example + headers): https://huggingface.co/docs/inference-providers/en/tasks/chat-completion

## LLM serving (OpenAI-compatible)

### `LLM_BASE_URL`

- **Purpose:** Base URL for the OpenAI-compatible API your backend will call.
- **Value:** `https://router.huggingface.co/v1`
  - Source (OpenAI SDK example sets `base_url`): https://huggingface.co/docs/inference-providers/en/tasks/chat-completion

### `LLM_API_KEY`

- **Purpose:** API key used by your backend to authenticate to the hosted provider.
- **Value:** a fine-grained Hugging Face token with **“Make calls to Inference Providers”** permission.
  - Where to get it: https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained
  - Source: https://huggingface.co/docs/inference-providers/en/index

### `LLM_DEFAULT_MODEL`

- **Purpose:** Default model id used for agent runs.

- **Value (copy/paste):** `Qwen/Qwen2.5-7B-Instruct`
  - Model card: https://huggingface.co/Qwen/Qwen2.5-7B-Instruct

Notes:
- You *may* append `:fastest` or `:cheapest` to let Hugging Face pick a provider by policy.
  - Source (suffix policy): https://huggingface.co/docs/inference-providers/en/index

### `LLM_FALLBACK_MODEL`

- **Purpose:** Fallback model id used for cheaper runs.

- **Value (copy/paste):** `microsoft/Phi-3.5-mini-instruct`
  - Model card: https://huggingface.co/microsoft/Phi-3.5-mini-instruct

Notes:
- You *may* append `:cheapest` to bias to cheaper providers (still depends on availability).
  - Source (suffix policy): https://huggingface.co/docs/inference-providers/en/index

### `LLM_REASONING_MODEL` (optional)

- **Purpose:** Optional reasoning model route.
- **Where to get it:** the provider’s model registry/page.

## Notes (Hugging Face token compatibility)

- Yes — you can use a Hugging Face token for **OpenAI-compatible chat completions** via:
  - `POST https://router.huggingface.co/v1/chat/completions`
  - Header: `Authorization: Bearer $HF_TOKEN`
  - Source: https://huggingface.co/docs/inference-providers/en/index
- The OpenAI-compatible endpoint is **chat-completions only**. If you later need embeddings/images/etc, use the HF SDKs.
  - Source: https://huggingface.co/docs/inference-providers/en/index
