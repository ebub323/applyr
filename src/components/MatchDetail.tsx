import { matchDetail, type FitResult } from "@/lib/score";
import type { Profile, Role } from "@/lib/types";
import ScoreBreakdown from "./ScoreBreakdown";

/** Skills side by side: what the posting wants, what you have, what you lack. */
export default function MatchDetail({ role, result, profile }: { role: Role; result: FitResult; profile: Profile }) {
  const m = matchDetail(role, profile);
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Skills match</h4>
        {m.coverage === null ? (
          <p className="text-sm text-neutral-500">No technologies named in the title. Open the role and read the description to see the skill match.</p>
        ) : (
          <>
            <div className="text-2xl font-semibold">{m.have.length} <span className="text-base font-normal text-neutral-500">of {role.keywords.length} you have</span></div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.have.map((k) => <span key={k} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">{k}</span>)}
              {m.missing.map((k) => <span key={k} className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">{k}</span>)}
            </div>
            {m.missing.length > 0 && <p className="mt-2 text-xs text-neutral-500">Red is what this role wants that your profile does not list.</p>}
            {m.have.length > 0 && <p className="mt-1 text-xs text-neutral-500">Lead with {m.have.slice(0, 3).join(", ")} in your resume for this application.</p>}
          </>
        )}
        {role.flags && role.flags.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
            Requirements spotted: {role.flags.map((f) => (f === "citizenship" ? "US citizenship" : "security clearance")).join(", ")}.
          </p>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Why {result.fit}</h4>
        <ScoreBreakdown result={result} />
      </div>
    </div>
  );
}
