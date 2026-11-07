import { getCurrentUser } from '@/lib/session';
import { DuelLobby } from '@/components/duel/DuelLobby';

export const metadata = { title: 'Campus Duel' };

export default async function DuelPage() {
  const me = (await getCurrentUser()) as { id: number; role: string } | null;
  if (!me || me.role !== 'student') {
    return <p className="mx-auto max-w-2xl p-4 text-graphite/70">Duels are for student accounts. Switch to a demo student to play.</p>;
  }
  return <DuelLobby meId={me.id} />;
}
