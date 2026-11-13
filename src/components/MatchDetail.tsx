"use client";
import { useMemo, useState } from "react";
import { coverNote, kitAsText, tailoredSkillsLine } from "@/lib/kit";
import { extractKeywords } from "@/lib/keywords";
import { matchDetail, type FitResult } from "@/lib/score";
import type { Profile, Role } from "@/lib/types";
import AiTailor from "./AiTailor";
import CopyButton from "./CopyButton";
import ScoreBreakdown from "./ScoreBreakdown";
import { card, input } from "./ui";

/** One role, three jobs: why it scored what it did, how to tailor the resume to it, and the words to apply with. */
export default function MatchDetail({ role, result, profile, resumeText }: { role: Role; result: FitResult; profile: Profile; resumeText: string }) {
  const m = matchDetail(role, profile);
  const [tab, setTab] = useState<"why" | "tailor" | "apply">("why");
  const inResume = useMemo(() => new Set(extractKeywords(resumeText).map((k) => k.toLowerCase())), [resumeText]);
  const note = useMemo(() => coverNote(profile.kit, role, profile), [profile, role]);
  const [draft, setDraft] = useState<string | null>(null);
  const noteText = draft ?? note;

  const named = role.keywords;
  const onResume = named.filter((k) => inResume.has(k.toLowerCase()));
  const notOnResume = named.filter((k) => !inResume.has(k.toLowerCase()));

  const TabBtn = ({ id, children }: { id: typeof tab; children: React.ReactNode }) => (
    <button onClick={() => setTab(id)} aria-pressed={tab === id}
      className={`press rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${tab === id ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-500/10"}`}>
      {children}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex gap-1.5"><TabBtn id="why">Why {result.fit}%</TabBtn><TabBtn id="tailor">Tailor my resume</TabBtn><TabBtn id="apply">Apply kit</TabBtn></div>

      {tab === "why" && (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Skills match</h4>
            {m.coverage === null ? (
              <p className="text-sm text-neutral-500">No skills named in the title. Open the role and read the description to see the skill match.</p>
            ) : (
              <>
                <div className="text-2xl font-semibold">{m.have.length} <span className="text-base font-normal text-neutral-500">of {role.keywords.length} you have</span></div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.have.map((k) => <span key={k} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">{k}</span>)}
                  {m.missing.map((k) => <span key={k} className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">{k}</span>)}
                </div>
                {m.missing.length > 0 && <p className="mt-2 text-xs text-neutral-500">Red is what this role wants that your profile does not list.</p>}
              </>
            )}
            {role.flags && role.flags.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-300">
                Requirements spotted: {role.flags.map((f) => (f === "citizenship" ? "US citizenship" : "security clearance")).join(", ")}.
              </p>
            )}
          </div>
          <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Score breakdown</h4><ScoreBreakdown result={result} /></div>
        </div>
      )}

      {tab === "tailor" && (
        <div className="space-y-4 text-sm">
          <AiTailor role={role} profile={profile} resumeText={resumeText} />
          {named.length === 0 ? (
            <p className="text-neutral-500">This role names no skills we could read yet. Open its description, then come back here.</p>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Already on your resume, so lead with them</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{onResume.length ? onResume.map((k) => <span key={k} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">{k}</span>) : <span className="text-neutral-400">None of the role&rsquo;s skills appear on your resume.</span>}</div>
              </div>
              {notOnResume.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Named by the role, not on your resume</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{notOnResume.map((k) => <span key={k} className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-700 dark:text-red-400">{k}</span>)}</div>
                  <p className="mt-2 text-xs text-neutral-500">Add one only if you have really used it. An interviewer will ask.</p>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Skills line for this application</div><CopyButton text={tailoredSkillsLine(role, profile)} /></div>
                <p className="mt-2 rounded-lg bg-neutral-100 p-3 font-mono text-xs leading-relaxed dark:bg-neutral-800">{tailoredSkillsLine(role, profile)}</p>
                <p className="mt-1 text-xs text-neutral-500">Same skills, reordered so the ones this role names come first.</p>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "apply" && (
        <div className="space-y-4">
          <div className={`${card} p-3`}>
            <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">My details for the form</div><CopyButton text={kitAsText(profile.kit)} label="Copy all" /></div>
            <dl className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
              {(Object.entries({ Name: profile.kit.name, Email: profile.kit.email, Phone: profile.kit.phone, Location: profile.kit.location, LinkedIn: profile.kit.linkedin, GitHub: profile.kit.github, School: profile.kit.school, Degree: profile.kit.degree, Graduation: profile.kit.gradDate, GPA: profile.kit.gpa }) as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-neutral-500">{k}</dt><dd className="truncate">{v}</dd><CopyButton text={v} className="!px-2 !py-0.5 text-xs" /></div>
              ))}
            </dl>
            {!profile.kit.name && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Upload your resume or fill these in on the Profile tab.</p>}
          </div>
          <div>
            <div className="flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cover note draft</div><CopyButton text={noteText} /></div>
            <textarea rows={11} className={`${input} mt-2 text-sm leading-relaxed`} value={noteText} onChange={(e) => setDraft(e.target.value)} />
            <p className="mt-1 text-xs text-neutral-500">Built only from your resume and this posting. Edit it so it sounds like you.</p>
          </div>
        </div>
      )}
    </div>
  );
}
