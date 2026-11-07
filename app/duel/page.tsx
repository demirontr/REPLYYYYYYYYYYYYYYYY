import { getCurrentUser } from '@/lib/session';
import { DuelLobby } from '@/components/duel/DuelLobby';
import { DuelLock } from '@/components/DuelLock';
import { duelUnlocked } from '@/lib/demo';

export const metadata = { title: 'Campus Duel' };

export default async function DuelPage({ searchParams }: PageProps<'/duel'>) {
  if (!(await duelUnlocked())) return <DuelLock wrong={(await searchParams).wrong === '1'} />;
  const me = (await getCurrentUser()) as { id: number; role: string } | null;
  if (!me || me.role !== 'student') {
    return <p className="mx-auto max-w-2xl p-4 text-graphite/70">Duels are for student accounts. Switch to a demo student to play.</p>;
  }
  return <DuelLobby meId={me.id} />;
}
