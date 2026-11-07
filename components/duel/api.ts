// Tiny fetch helper for duel/live client components (owner: Claude 2).

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export const fmtSeconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/**
 * Polling fallback interval. Supabase Realtime websockets dropped on the event network,
 * so the pages rely on polling; 1.5 s keeps duels and live rounds responsive.
 */
export const POLL_MS = 1500;

/** Wrap a loader for polling: a tick is skipped while the previous request is still running, so slow responses never pile up. */
export function poller(load: () => Promise<unknown>): () => void {
  let busy = false;
  return () => {
    if (busy) return;
    busy = true;
    void load().finally(() => {
      busy = false;
    });
  };
}
