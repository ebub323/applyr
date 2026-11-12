import { byStage, profile, roles, SOURCE_LABEL } from "@/lib/data";
import { STAGES } from "@/lib/types";
import type { Role } from "@/lib/types";

function fitTone(fit: number) {
  if (fit >= 75) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (fit >= 55) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400";
}

function Funnel() {
  const counts = STAGES.map((s) => ({ ...s, n: byStage(s.id).length }));
  const max = Math.max(...counts.map((c) => c.n), 1);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {counts.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="text-2xl font-semibold tabular-nums">{c.n}</div>
          <div className="mt-0.5 text-xs text-neutral-500">{c.label}</div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-white"
              style={{ width: `${(c.n / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleRow({ r }: { r: Role }) {
  const stage = STAGES.find((s) => s.id === r.stage);
  return (
    <tr className="border-t border-neutral-100 align-top dark:border-neutral-800">
      <td className="py-3 pr-4">
        <div className="font-medium leading-snug">{r.title}</div>
        <div className="text-xs text-neutral-500">{r.company}</div>
      </td>
      <td className="py-3 pr-4 text-sm text-neutral-600 dark:text-neutral-400">
        {r.remote ? "Remote" : r.location}
      </td>
      <td className="py-3 pr-4">
        <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          {SOURCE_LABEL[r.source]}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          {r.outcome ?? stage?.label ?? r.stage}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span
          className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${fitTone(r.fit)}`}
        >
          {r.fit}
        </span>
      </td>
      <td className="py-3 text-xs leading-relaxed text-neutral-500">
        {r.reasons.slice(0, 2).join(" · ")}
      </td>
    </tr>
  );
}

export default function Home() {
  const applied = roles.filter((r) =>
    ["applied", "recruiter_reply", "interview", "offer"].includes(r.stage),
  );
  const replied = roles.filter((r) =>
    ["recruiter_reply", "interview", "offer"].includes(r.stage),
  );
  const replyRate = applied.length
    ? Math.round((replied.length / applied.length) * 100)
    : 0;
  const queue = roles.filter((r) => r.stage === "found" || r.stage === "account_ready");

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Applying to 50 roles a day is a data problem.
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Applyr ingests postings from six sources, scores every one against a
          single profile, works the queue in score order, and moves a role along
          its stages when a recruiter actually replies. The scores on this page
          are computed at build time by{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[13px] dark:bg-neutral-800">
            scoreFit()
          </code>
          , not stored — changing a weight re-ranks the board.
        </p>
      </section>

      <section className="mt-9">
        <Funnel />
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-2xl font-semibold tabular-nums">{replyRate}%</div>
          <div className="mt-0.5 text-xs text-neutral-500">
            Reply rate ({replied.length} of {applied.length} applied)
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-2xl font-semibold tabular-nums">{queue.length}</div>
          <div className="mt-0.5 text-xs text-neutral-500">In queue, ranked by fit</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-2xl font-semibold tabular-nums">
            ${profile.minHourly}
            <span className="text-sm font-normal text-neutral-500">/hr floor</span>
          </div>
          <div className="mt-0.5 text-xs text-neutral-500">
            {profile.homeMetro} · {profile.maxCommuteMinutes} min commute · remote ok
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          The board
        </h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-neutral-400">
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Where</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 font-medium">Stage</th>
                <th className="pb-2 pr-4 font-medium">Fit</th>
                <th className="pb-2 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <RoleRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
