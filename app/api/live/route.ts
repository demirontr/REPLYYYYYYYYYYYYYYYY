// GET — live competitions of my university. POST { title, size } — university account creates one.
import { db, DEMO_COURSE_ID, HttpError, must, pickQuestions, readJson, requireUser, route, type Tournament } from '@/lib/duelServer';
import { DUEL_SIZES, type DuelSize } from '@/lib/duel';

export async function GET() {
  return route(async () => {
    const me = await requireUser();
    if (!me.university_id) return { tournaments: [] };
    const rows = must<Tournament[]>(
      await db()
        .from('tournaments')
        .select('*')
        .eq('university_id', me.university_id)
        .order('starts_at', { ascending: false })
        .limit(20),
    );
    return {
      isHost: me.role === 'university',
      tournaments: rows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        startsAt: t.starts_at,
        questions: t.question_ids.length,
      })),
    };
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const me = await requireUser();
    if (me.role !== 'university' || !me.university_id) {
      throw new HttpError(403, 'Only a university account can create a live competition');
    }
    const { title, size, startsAt } = await readJson<{ title?: string; size?: number; startsAt?: string }>(req);
    if (!title?.trim()) throw new HttpError(400, 'Title is required');
    if (!DUEL_SIZES.includes(size as DuelSize)) throw new HttpError(400, 'size must be 5 or 10');

    const questionIds = await pickQuestions(DEMO_COURSE_ID, size as DuelSize);
    const t = must<{ id: number }>(
      await db()
        .from('tournaments')
        .insert({
          university_id: me.university_id,
          course_id: DEMO_COURSE_ID,
          title: title.trim().slice(0, 120),
          starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
          status: 'scheduled',
          question_ids: questionIds,
          current_index: 0,
        })
        .select('id')
        .single(),
    );
    return { id: t.id };
  });
}
