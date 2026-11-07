// Every Gemini call goes through this file (PLAN.md §2). Server only.
// Uses the REST API with fetch, so no SDK package is needed.
// Model name comes from GEMINI_MODEL so it can be changed in one place.

const DEFAULT_MODEL = "gemini-2.5-flash";
const TIMEOUT_MS = 30_000;

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
      generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema },
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
      console.log(JSON.stringify({ ai: agent, attempt, ms: Date.now() - started, ok: true, input: prompt, output: text }));
      return value;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.warn(JSON.stringify({ ai: agent, attempt, ms: Date.now() - started, ok: false, error: lastError, input: prompt, output: text }));
      if (e instanceof Error && e.name === "TimeoutError") lastError = "timeout";
      // missing key or quota problems will not fix themselves on a retry
      if (/GEMINI_API_KEY|HTTP (400|401|403|429)/.test(lastError)) break;
      if (text) prompt = `${call.prompt}\n\nYour previous answer was rejected: ${lastError}. Return valid JSON that fixes this.`;
    }
  }
  throw new LlmError(lastError || "unknown error", agent);
}
