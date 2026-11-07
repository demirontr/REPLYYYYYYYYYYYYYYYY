"use client";

import { usePathname } from "next/navigation";
import { switchUser } from "@/app/actions";
import type { User } from "@/lib/types";

type Option = Pick<User, "id" | "name" | "role">;

export function SwitchUser({ users, currentId, hideOnTests }: { users: Option[]; currentId: number; hideOnTests?: boolean }) {
  const path = usePathname();
  if (hideOnTests && path.startsWith("/tests")) return null; // presentation build
  const groups = (["student", "company", "university"] as const).map((role) => ({ role, list: users.filter((u) => u.role === role) }));
  return (
    <form action={switchUser}>
      <label className="sr-only" htmlFor="uid">Switch user</label>
      <select
        id="uid"
        name="uid"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-graphite/30 bg-white px-2 py-1"
      >
        {groups.map((g) => (
          <optgroup key={g.role} label={g.role}>
            {g.list.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </optgroup>
        ))}
      </select>
    </form>
  );
}
