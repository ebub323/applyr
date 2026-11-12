import type { FitResult } from "@/lib/score";

/** Why a role scored what it did: every factor, signed, with its reason. */
export default function ScoreBreakdown({ result }: { result: FitResult }) {
  const max = Math.max(20, ...result.factors.map((f) => Math.abs(f.delta)));
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between text-xs text-neutral-500">
        <span>Base score</span><span className="font-mono">50</span>
      </div>
      {result.factors.map((f) => (
        <div key={f.key + f.note}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium">{f.label}</span>
            <span className={`font-mono text-xs ${f.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {f.delta > 0 ? "+" : ""}{f.delta}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full ${f.delta >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(100, (Math.abs(f.delta) / max) * 100)}%` }}
            />
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">{f.note}</div>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-neutral-200 pt-2 text-sm font-semibold dark:border-neutral-800">
        <span>Fit</span><span className="font-mono">{result.fit}</span>
      </div>
    </div>
  );
}
