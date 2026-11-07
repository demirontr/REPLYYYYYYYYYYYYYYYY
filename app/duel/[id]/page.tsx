import { notFound } from 'next/navigation';
import { DuelPlay } from '@/components/duel/DuelPlay';
import { DuelLock } from '@/components/DuelLock';
import { duelUnlocked } from '@/lib/demo';

export const metadata = { title: 'Duel' };

export default async function DuelPlayPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await duelUnlocked())) return <DuelLock />;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <DuelPlay duelId={id} />;
}
