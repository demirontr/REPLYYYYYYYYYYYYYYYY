// Tiny shared UI kit (owned by Claude 1). Plain Tailwind, no extra deps.
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-zinc-200 bg-white p-5 shadow-sm", className)} {...p} />;
}

export function Button({ className, variant = "primary", ...p }: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cx(
        "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variant === "primary" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-zinc-300 hover:bg-zinc-100",
        className,
      )}
      {...p}
    />
  );
}

const BADGE = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-rose-100 text-rose-800",
  neutral: "bg-zinc-100 text-zinc-700",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", BADGE[tone])}>{children}</span>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{children}</h1>
      {sub && <p className="mt-1 text-zinc-600">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
