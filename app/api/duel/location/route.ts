// POST { lat, lng, sharing } — store my position. POST { sharing: false } — stop sharing.
import { db, must, readJson, requireUser, route, HttpError } from '@/lib/duelServer';

export async function POST(req: Request) {
  return route(async () => {
    const me = await requireUser();
    const body = await readJson<{ lat?: number; lng?: number; sharing?: boolean }>(req);

    if (body.sharing === false) {
      must(await db().from('locations').update({ sharing: false }).eq('user_id', me.id).select('user_id'));
      return { ok: true, sharing: false };
    }

    const { lat, lng } = body;
    const valid =
      typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!valid) throw new HttpError(400, 'lat/lng required');

    must(
      await db()
        .from('locations')
        .upsert(
          { user_id: me.id, lat, lng, sharing: true, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .select('user_id'),
    );
    return { ok: true, sharing: true };
  });
}
