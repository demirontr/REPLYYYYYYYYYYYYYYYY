import { Button } from "@/components/ui";
import { toggleFollow } from "./actions";

export function FollowButton({ companyId, following }: { companyId: number; following: boolean }) {
  return (
    <form action={toggleFollow.bind(null, companyId, !following)}>
      <Button type="submit" variant={following ? "ghost" : "primary"}>{following ? "Following ✓" : "Follow"}</Button>
    </form>
  );
}
