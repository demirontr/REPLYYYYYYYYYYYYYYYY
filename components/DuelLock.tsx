import { unlockDuel } from "@/app/actions";
import { Button, Card, PageTitle } from "@/components/ui";

export function DuelLock({ wrong }: { wrong?: boolean }) {
  return (
    <div className="mx-auto max-w-md">
      <PageTitle sub="Duels are shown live by the team in this presentation build.">Campus Duel</PageTitle>
      <Card>
        <form action={unlockDuel} className="flex flex-col gap-3">
          <label htmlFor="duel-pw" className="font-semibold">Presenter password</label>
          <input id="duel-pw" name="password" type="password" required autoComplete="off" className="rounded-md border border-graphite/30 px-3 py-2" />
          {wrong && <p role="alert" className="text-pen">Wrong password. Try again.</p>}
          <Button type="submit">Unlock duels</Button>
        </form>
      </Card>
    </div>
  );
}
