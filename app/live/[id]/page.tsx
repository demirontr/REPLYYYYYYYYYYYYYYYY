import { notFound } from 'next/navigation';
import { LivePlay } from '@/components/duel/LivePlay';

export const metadata = { title: 'Live Competition' };

export default async function LivePlayPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <LivePlay tournamentId={id} />;
}
