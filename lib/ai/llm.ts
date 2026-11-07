// Every Gemini call goes through this file (PLAN.md §2). Server only.
// Uses the REST API with fetch, so no SDK package is needed.
// Model name comes from GEMINI_MODEL so it can be changed in one place.

const DEFAULT_MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 45_000;

export class LlmError extends Error {
  constructor(message: string, readonly agent: string) {
    super(message);
    this.name = "LlmError";
  }
}

/** Subset of the OpenAPI schema format Gemini accepts as responseSchema. */
export type GeminiSchema =
  | { type: "STRING"; description?: string; enum?: string[] }
  | { type: "INTEGER" | "NUMBER" | "BOOLEAN"; description?: string }
  | { type: "ARRAY"; items: GeminiSchema; description?: string; minItems?: number; maxItems?: number }
  | { type: "OBJECT"; properties: Record<string, GeminiSchema>; required?: string[]; description?: string };

export interface JsonCall<T> {
  /** Agent name, used in logs and errors (e.g. "similarQuestions"). */
  agent: string;
  /** Student the call is for; stored in ai_logs. */
  userId?: number;
  system: string;
  prompt: string;
  responseSchema: GeminiSchema;
  /** Validates the parsed JSON. Throw an Error with a short reason if it is not acceptable. */
  parse: (raw: unknown) => T;
  temperature?: number;
}

/** True when GEMINI_API_KEY is set; agents use this to go straight to their fallback otherwise. */
export function llmAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

async function callGemini(agent: string, system: string, prompt: string, schema: GeminiSchema, temperature: number): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new LlmError("GEMINI_API_KEY is not set", agent);
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // low thinking keeps Gemini 3.x fast enough for an interactive page
      generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: "low" } },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new LlmError(`Gemini HTTP ${res.status}: ${body.slice(0, 300)}`, agent);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] };
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new LlmError(`Gemini returned no text (finishReason: ${cand?.finishReason ?? "none"})`, agent);
  return text;
}

type LogEntry = { agent: string; userId?: number; ok: boolean; attempt: number; ms: number; input: string; output: string; error?: string };

/** Server log + ai_logs row (migration 30). Logging must never break an agent, so errors are swallowed. */
async function logCall(e: LogEntry): Promise<void> {
  const line = JSON.stringify({ ai: e.agent, user: e.userId, attempt: e.attempt, ms: e.ms, ok: e.ok, error: e.error, input: e.input, output: e.output });
  if (e.ok) console.log(line); else console.warn(line);
  try {
    const { supabaseAdmin } = await import("@/lib/supabase");
    await supabaseAdmin().from("ai_logs").insert({
      agent: e.agent, user_id: e.userId ?? null, ok: e.ok, attempt: e.attempt, ms: e.ms,
      input: e.input.slice(0, 20_000), output: e.output.slice(0, 20_000), error: e.error ?? null,
    });
  } catch { /* table missing or DB down: console log above is enough */ }
}

/** Records an agent run that did not use Gemini (fallback), so the log shows every decision. */
export async function logFallback(agent: string, userId: number | undefined, reason: string, output: unknown): Promise<void> {
  await logCall({ agent, userId, ok: false, attempt: 0, ms: 0, input: "", output: JSON.stringify(output), error: `fallback: ${reason}` });
}

/**
 * Asks Gemini for JSON matching `responseSchema`, then validates it with `parse`.
 * If the call fails or the output is invalid, it retries once, telling the model what was wrong.
 * Input and output are logged on the server (PLAN.md §9).
 */
export async function generateJson<T>(call: JsonCall<T>): Promise<T> {
  const { agent, system, responseSchema, parse, temperature = 0.7 } = call;
  let prompt = call.prompt;
  let lastError = "";

  for (let attempt = 1; attempt <= 2; attempt++) {
    const started = Date.now();
    let text = "";
    try {
      text = await callGemini(agent, system, prompt, responseSchema, temperature);
      const value = parse(JSON.parse(text));
      await logCall({ agent, userId: call.userId, ok: true, attempt, ms: Date.now() - started, input: prompt, output: text });
      return value;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (e instanceof Error && e.name === "TimeoutError") lastError = "timeout";
      await logCall({ agent, userId: call.userId, ok: false, attempt, ms: Date.now() - started, input: prompt, output: text, error: lastError });
      // missing key or quota problems will not fix themselves on a retry
      if (/GEMINI_API_KEY|HTTP (400|401|403|429)/.test(lastError)) break;
      if (text) prompt = `${call.prompt}\n\nYour previous answer was rejected: ${lastError}. Return valid JSON that fixes this.`;
    }
  }
  throw new LlmError(lastError || "unknown error", agent);
}
