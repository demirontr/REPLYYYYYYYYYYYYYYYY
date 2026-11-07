import { getCurrentUser } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { Badge, Button, Card, PageTitle } from "@/components/ui";
import type { Company, Consent, University } from "@/lib/types";
import { SCOPES, SCOPE_LABEL } from "@/app/org/data";
import { saveConsent } from "./actions";

export default async function PrivacyPage() {
  const me = await getCurrentUser();
  if (me.role !== "student") return <PageTitle sub="Only student accounts share data.">Privacy</PageTitle>;
  const db = supabaseAdmin();
  const [{ data: companies }, { data: uni }, { data: consents }] = await Promise.all([
    db.from("companies").select("*").order("name"),
    db.from("universities").select("*").eq("id", me.university_id ?? -1).maybeSingle<University>(),
    db.from("consents").select("*").eq("student_id", me.id),
  ]);
  const mine = (consents ?? []) as Consent[];
  const viewers = [
    ...(uni ? [{ type: "university" as const, id: uni.id, name: uni.name, note: "Your university" }] : []),
    ...((companies ?? []) as Company[]).map((c) => ({ type: "company" as const, id: c.id, name: c.name, note: c.sector ?? "Company" })),
  ];

  return (
    <>
      <PageTitle sub="By default nobody sees your data. Choose exactly what each company or university may see; you can change it any time.">Privacy</PageTitle>
      <div className="grid gap-3">
        {viewers.map((v) => {
          const c = mine.find((x) => x.viewer_type === v.type && x.viewer_id === v.id);
          const shared = c?.scopes ?? [];
          return (
            <Card key={`${v.type}-${v.id}`}>
              <form action={saveConsent.bind(null, v.type, v.id)}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{v.name}</span>
                  <span className="text-sm text-zinc-500">{v.note}</span>
                  <span className="ml-auto">{shared.length ? <Badge tone="easy">sharing {shared.length}</Badge> : <Badge>not sharing</Badge>}</span>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-2">
                  {SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-2">
                      <input type="checkbox" name="scopes" value={s} defaultChecked={shared.includes(s)} /> {SCOPE_LABEL[s]}
                    </label>
                  ))}
                </div>
                <Button type="submit" variant="ghost" className="mt-3">Save</Button>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}
