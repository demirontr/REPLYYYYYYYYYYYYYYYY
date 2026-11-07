// Tiny shared UI kit (owned by Claude 1). Plain Tailwind, tokens in app/globals.css.
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** A sheet of paper laid on the squared background. */
export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cx("rounded-md border border-[#d3dce6] bg-white p-5 shadow-[0_1px_0_#d3dce6]", className)} {...p} />;
}

export function Button({ className, variant = "primary", ...p }: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      className={cx(
        "rounded-md px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" ? "bg-ink text-white hover:bg-indigo-700" : "border border-graphite/30 bg-white hover:border-ink hover:text-ink",
        className,
      )}
      {...p}
    />
  );
}

// difficulty reads like pen colours: green = easy, blue = medium, red = hard
const BADGE = {
  easy: "border-tick/40 text-tick",
  medium: "border-ink/40 text-ink",
  hard: "border-pen/40 text-pen",
  neutral: "border-graphite/20 text-graphite/70",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE; children: ReactNode }) {
  return <span className={cx("rounded-sm border bg-white px-1.5 text-sm", BADGE[tone])}>{children}</span>;
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-graphite">{children}</h1>
      {sub && <p className="mt-1 max-w-prose text-graphite/70">{sub}</p>}
    </div>
  );
}

export function Stat({ label, value, mark }: { label: string; value: ReactNode; mark?: boolean }) {
  return (
    <Card>
      <div className="text-graphite/60">{label}</div>
      <div className="mt-1 font-math text-4xl text-graphite">
        <span className={mark ? "marker" : undefined}>{value}</span>
      </div>
    </Card>
  );
}
