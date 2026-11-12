"use client";
import { useState } from "react";
import { fetchGreenhouseDetails } from "@/lib/ats";
import { STAGES, type Role, type Stage } from "@/lib/types";
import type { Scored } from "./Board";
import type { Profile } from "@/lib/types";
import MatchDetail from "./MatchDetail";
import { btn, btnGhost, FitPill, input } from "./ui";

export default function RoleDrawer({ role, profile, resumeText, onChange, onMove, onDelete, onClose }: {
  role: Scored; profile: Profile; resumeText: string; onChange: (patch: Partial<Role>) => void; onMove: (stage: Stage) => void; onDelete: () => void; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadDescription = async () => {
    if (!role.ext) return;
    setBusy(true); setErr("");
    try {
      const d = await fetchGreenhouseDetails(role.ext.slug, role.ext.id, role.company);
      onChange({ ...d, descriptionLoaded: true });
    } catch { setErr("Could not load the description."); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-2xl overflow-y-auto border-l border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold leading-snug">{role.title}</h2>
            <p className="text-sm text-neutral-500">{role.company} · {role.remote ? "Remote" : role.location}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="text-xl leading-none text-neutral-400 hover:text-neutral-900 dark:hover:text-white">×</button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <FitPill fit={role.fit} />
          <select value={role.stage} onChange={(e) => onMove(e.target.value as Stage)} className={`${input} !w-auto`}>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          {role.url && <a href={role.url} target="_blank" rel="noreferrer" className={`${btnGhost} ml-auto`}>Open posting ↗</a>}
        </div>

        {role.stage === "closed" && (
          <input className={`${input} mt-3`} placeholder="Outcome (Rejected, Withdrew...)" value={role.outcome ?? ""} onChange={(e) => onChange({ outcome: e.target.value })} />
        )}

        <div className="mt-6"><MatchDetail role={role} result={role} profile={profile} resumeText={resumeText} /></div>
        {role.ext && !role.descriptionLoaded && (
          <div className="mt-2">
            <button className={btn} disabled={busy} onClick={loadDescription}>{busy ? "Reading..." : "Read the full description and re-score"}</button>
            {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
          </div>
        )}

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500">Notes</h3>
        <textarea rows={5} className={input} placeholder="Recruiter name, referral, what to say..." value={role.notes} onChange={(e) => onChange({ notes: e.target.value })} />

        <div className="mt-6 flex justify-between text-xs text-neutral-400">
          <span>{role.appliedAt ? `Applied ${role.appliedAt}` : "Not applied yet"}{role.postedAt ? ` · posted ${role.postedAt}` : ""}</span>
          <button className="text-red-600 hover:underline" onClick={onDelete}>Remove</button>
        </div>
      </aside>
    </div>
  );
}
