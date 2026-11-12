/**
 * A small language model that runs on the visitor's own machine, never a hosted API.
 * Two ways to get one:
 *  - Ollama, if it is running locally: fast, and any model the person already has.
 *  - A model run inside the browser itself (WebLLM, WebGPU): nothing to install; the
 *    weights download once and are cached. Only the weights come in, nothing goes out.
 * The resume and the posting are handed to the model on this machine and nowhere else.
 */
export type Engine =
  | { kind: "ollama"; host: string; model: string }
  | { kind: "browser"; model: string };

export const OLLAMA_HOST = "http://localhost:11434";
/** About 1 GB, strong at following a JSON format for its size. */
export const BROWSER_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const BROWSER_MODEL_LABEL = "Qwen2.5 1.5B";

export interface OllamaModel { name: string; size: number }

export const hasWebGpu = (): boolean => typeof navigator !== "undefined" && "gpu" in navigator;

export async function detectOllama(host: string = OLLAMA_HOST, signal?: AbortSignal): Promise<OllamaModel[] | null> {
  try {
    const timeout = AbortSignal.timeout(1500);
    const res = await fetch(`${host}/api/tags`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!res.ok) return null;
    const j = (await res.json()) as { models?: { name: string; size: number }[] };
    return (j.models ?? []).map((m) => ({ name: m.name, size: m.size }));
  } catch {
    return null;
  }
}

/**
 * Smallest capable chat model. Embedding models cannot chat, and reasoning models
 * (r1) spend minutes thinking, so they are last resorts.
 */
export function pickModel(models: OllamaModel[]): string | null {
  const chat = models.filter((m) => !/embed|rerank|nomic|bge|minilm/i.test(m.name));
  const rank = (m: OllamaModel) => (/r1|reason|think|qwq/i.test(m.name) ? 1e12 : 0) + m.size;
  return [...chat].sort((a, b) => rank(a) - rank(b))[0]?.name ?? null;
}

export interface Prompt { system: string; user: string }
export interface RunHandlers {
  /** Called with the whole text so far. */
  onText?: (text: string) => void;
  /** Download or load progress for the in-browser model, 0 to 1. */
  onProgress?: (note: string, fraction: number) => void;
  signal?: AbortSignal;
  /** Constrain the answer to a JSON object. Off by default: plain text is easier for a small model. */
  json?: boolean;
  /** Cap on the length of the answer, in tokens. */
  maxTokens?: number;
}

/** Reasoning models wrap their thinking in <think>; the answer is what follows. */
export const stripThinking = (t: string) => t.replace(/<think>[\s\S]*?(<\/think>|$)/gi, "").trim();

async function runOllama(e: Extract<Engine, { kind: "ollama" }>, p: Prompt, h: RunHandlers): Promise<string> {
  const res = await fetch(`${e.host}/api/chat`, {
    method: "POST", signal: h.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: e.model, stream: true, think: false, ...(h.json ? { format: "json" } : {}),
      options: { temperature: 0.3, num_ctx: 4096, num_predict: h.maxTokens ?? 400 },
      messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Ollama answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 160)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = ""; let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
      if (!line) continue;
      const j = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (j.error) throw new Error(j.error);
      out += j.message?.content ?? "";
      h.onText?.(stripThinking(out));
    }
  }
  return stripThinking(out);
}

interface WebLlmEngine {
  chat: { completions: { create: (r: unknown) => Promise<AsyncIterable<{ choices: { delta: { content?: string | null } }[] }>> } };
}
let cached: { model: string; engine: Promise<WebLlmEngine> } | null = null;

async function runBrowser(e: Extract<Engine, { kind: "browser" }>, p: Prompt, h: RunHandlers): Promise<string> {
  if (!hasWebGpu()) throw new Error("This browser has no WebGPU, so it cannot run a model. Use Chrome or Edge, or run Ollama.");
  if (!cached || cached.model !== e.model) {
    const web = await import("@mlc-ai/web-llm");
    cached = {
      model: e.model,
      engine: web.CreateMLCEngine(e.model, { initProgressCallback: (r) => h.onProgress?.(r.text, r.progress) }) as unknown as Promise<WebLlmEngine>,
    };
    cached.engine.catch(() => { cached = null; });
  }
  const engine = await cached.engine;
  const stream = await engine.chat.completions.create({
    stream: true, temperature: 0.3, max_tokens: h.maxTokens ?? 400, ...(h.json ? { response_format: { type: "json_object" } } : {}),
    messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }],
  });
  let out = "";
  for await (const chunk of stream) {
    if (h.signal?.aborted) break;
    out += chunk.choices[0]?.delta.content ?? "";
    h.onText?.(out);
  }
  return out;
}

export function runModel(engine: Engine, prompt: Prompt, handlers: RunHandlers = {}): Promise<string> {
  return engine.kind === "ollama" ? runOllama(engine, prompt, handlers) : runBrowser(engine, prompt, handlers);
}
