"use client";

import { switchUser } from "@/app/actions";
import type { User } from "@/lib/types";

type Option = Pick<User, "id" | "name" | "role">;

export function SwitchUser({ users, currentId }: { users: Option[]; currentId: number }) {
  const groups = (["student", "company", "university"] as const).map((role) => ({ role, list: users.filter((u) => u.role === role) }));
  return (
    <form action={switchUser}>
      <label className="sr-only" htmlFor="uid">Switch user</label>
      <select
        id="uid"
        name="uid"
        defaultValue={currentId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm"
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
