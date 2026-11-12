"use client";
import { useMemo, useRef, useState } from "react";
import { fileToText } from "@/lib/extract";
import { parseResume, replaceBullet, SAMPLE_RESUME, type Check } from "@/lib/resume";
import type { Profile } from "@/lib/types";
import { btn, btnGhost, card, input } from "./ui";

const GROUPS: { id: Check["group"]; label: string; blurb: string }[] = [
  { id: "ats", label: "ATS readiness", blurb: "Can software read it?" },
  { id: "impact", label: "Impact", blurb: "Do bullets show results?" },
  { id: "technical", label: "Technical depth", blurb: "Does it prove skill?" },
  { id: "completeness", label: "Completeness", blurb: "Is anything missing?" },
];

function Ring({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const tone = value >= 80 ? "#10b981" : value >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Resume score ${value} out of 100`}>
      <circle cx="66" cy="66" r={r} fill="none" strokeWidth="10" className="stroke-neutral-200 dark:stroke-neutral-800" />
      <circle cx="66" cy="66" r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke={tone}
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} transform="rotate(-90 66 66)" style={{ transition: "stroke-dashoffset .5s" }} />
      <text x="66" y="68" textAnchor="middle" className="fill-current text-3xl font-semibold">{value}</text>
      <text x="66" y="88" textAnchor="middle" className="fill-neutral-500 text-[11px]">out of 100</text>
    </svg>
  );
}

export default function ResumeTab({ resume, resumeName, profile, onResume, onUseSkills, onUseTargets, onNext }: {
  resume: string; resumeName: string; profile: Profile;
  onResume: (text: string, name: string) => void;
  onUseSkills: (skills: string[]) => void;
  onUseTargets: (ids: string[], titles: string[]) => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(false);
  const [onlyWeak, setOnlyWeak] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const a = useMemo(() => parseResume(resume), [resume]);

  const load = async (file: File) => {
    setBusy(true); setErr("");
    try {
      const text = await fileToText(file);
      if (text.trim().split(/\s+/).length < 25) throw new Error("I could not read any text from that file. If it is a scan, paste the text instead.");
      onResume(text, file.name);
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not read that file."); }
    setBusy(false);
  };

  if (a.empty) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Know where you stand before you apply.</h1>
        <p className="mt-3 text-neutral-600 dark:text-neutral-400">
          Upload your resume. Applyr grades it the way an applicant tracking system and a recruiter would, shows exactly what to fix,
          then finds live jobs in any field, from healthcare and sales to software, ranked by how well you match. A small AI on your own computer can tailor your resume to each one.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void load(f); }}
          className={`${card} mt-8 border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-neutral-900 dark:border-neutral-300" : ""}`}
        >
          <p className="text-lg font-medium">{busy ? "Reading your resume..." : "Drop your resume here"}</p>
          <p className="mt-1 text-sm text-neutral-500">PDF, DOCX or TXT. It is read in your browser and never uploaded.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>Choose a file</button>
            <button className={btnGhost} disabled={busy} onClick={() => onResume(SAMPLE_RESUME, "Sample resume")}>Try a sample</button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" data-testid="resume-file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); }} />
          {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-neutral-500">Or paste your resume text</summary>
          <textarea rows={10} className={`${input} mt-2`} placeholder="Paste your resume here..." onChange={(e) => e.target.value.trim().split(/\s+/).length >= 25 && onResume(e.target.value, "Pasted text")} />
        </details>
      </div>
    );
  }

  const missingSkills = a.skills.filter((s) => !profile.skills.some((p) => p.toLowerCase() === s.toLowerCase()));
  const wins = a.checks.filter((c) => c.earned >= c.max * 0.999);

  return (
    <div className="space-y-6">
      <div className={`${card} flex flex-wrap items-center gap-6 p-6`}>
        <Ring value={a.overall} />
        <div className="min-w-64 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-semibold">{a.grade}</span>
            <span className="text-lg text-neutral-600 dark:text-neutral-400">{a.level}</span>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {resumeName} · {a.wordCount} words · {a.bullets.length} bullets · {a.skills.length} skills and tools recognised
            {a.gradYear ? ` · class of ${a.gradYear}` : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GROUPS.map((g) => {
              const s = a.groupScores[g.id]; const pct = Math.round((s.earned / (s.max || 1)) * 100);
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-xs"><span className="font-medium">{g.label}</span><span className="font-mono text-neutral-500">{pct}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${pct}%` }} /></div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">{g.blurb}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className={btn} onClick={onNext}>Continue to my profile →</button>
          <button className={btnGhost} onClick={() => setEditing((v) => !v)}>{editing ? "Hide text" : "Edit and re-grade"}</button>
          <button className={btnGhost} onClick={() => onResume("", "")}>Start over</button>
        </div>
      </div>

      {editing && (
        <div className={`${card} p-4`}>
          <p className="mb-2 text-sm text-neutral-500">Change the text and the grade updates as you type. Fix the items below, then copy the result back into your resume.</p>
          <textarea rows={16} value={resume} onChange={(e) => onResume(e.target.value, resumeName)} className={`${input} font-mono text-xs`} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${card} p-5 lg:col-span-3`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Fix these first</h2>
          {a.fixes.length ? (
            <ol className="mt-3 space-y-2.5">
              {a.fixes.map((f, i) => (
                <li key={f} className="flex gap-3 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] text-white dark:bg-white dark:text-neutral-900">{i + 1}</span>{f}</li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-emerald-600">Nothing urgent. Your resume passes every check.</p>}

          <div className="mb-2 mt-7 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Your bullets, one by one</h2>
            <label className="flex items-center gap-2 text-xs text-neutral-500"><input type="checkbox" checked={onlyWeak} onChange={(e) => setOnlyWeak(e.target.checked)} className="accent-neutral-900" /> Only ones that need work</label>
          </div>
          {a.bulletReview.length === 0 ? <p className="text-sm text-neutral-400">No bullets detected.</p> : (
            <>
              <p className="mb-3 text-xs text-neutral-500">{a.bulletReview.filter((b) => b.hard).length} of {a.bulletReview.length} bullets need work{a.bulletReview.filter((b) => !b.hard && !b.ok).length > 0 ? `, and ${a.bulletReview.filter((b) => !b.hard && !b.ok).length} more would be stronger with a number` : ""}. Apply a fix and the grade updates.</p>
              <ul className="space-y-2.5">
                {a.bulletReview.filter((b) => !onlyWeak || b.hard).map((b) => (
                  <li key={b.text} className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1 size-2 shrink-0 rounded-full ${b.ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <p className="flex-1 leading-snug">{b.text}</p>
                    </div>
                    {!b.ok && (
                      <div className="mt-2 pl-4 text-xs text-neutral-500">
                        <div className="flex flex-wrap gap-1.5">{b.issues.map((i) => <span key={i} className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-800 dark:text-amber-300">{i}</span>)}</div>
                        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">{b.tips.map((t) => <li key={t}>{t}</li>)}</ul>
                        {b.rewrite && (
                          <div className="mt-2 rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
                            <div className="text-neutral-900 dark:text-neutral-100">{b.rewrite}</div>
                            <button className={`${btnGhost} mt-1.5 !py-0.5 text-xs`} onClick={() => onResume(replaceBullet(resume, b.text, b.rewrite!), resumeName)}>Use this version</button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mb-2 mt-7 text-sm font-semibold uppercase tracking-wide text-neutral-500">Every check</h2>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {a.checks.map((c) => {
              const ok = c.earned >= c.max * 0.999;
              return (
                <li key={c.id} className="flex items-start gap-3 py-2.5 text-sm">
                  <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] text-white ${ok ? "bg-emerald-500" : c.earned > 0 ? "bg-amber-500" : "bg-red-500"}`}>{ok ? "✓" : "!"}</span>
                  <div className="flex-1"><div className="font-medium">{c.label}</div><div className="text-xs text-neutral-500">{c.detail}</div></div>
                  <span className="font-mono text-xs text-neutral-400">{c.earned}/{c.max}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-neutral-400">{wins.length} of {a.checks.length} checks fully passed.</p>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Skills I found</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.skills.map((s) => <span key={s} className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">{s}</span>)}
            </div>
            <button className={`${btn} mt-4`} disabled={!missingSkills.length} onClick={() => onUseSkills(a.skills)}>
              {missingSkills.length ? `Use these ${a.skills.length} skills for matching` : "Already using these skills"}
            </button>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Roles your resume points at</h2>
            <ul className="mt-3 space-y-2.5">
              {a.targets.map((t) => (
                <li key={t.id}>
                  <div className="flex justify-between text-sm"><span>{t.label}</span><span className="font-mono text-xs text-neutral-500">{Math.round(t.strength * 100)}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${t.strength * 100}%` }} /></div>
                </li>
              ))}
              {!a.targets.length && <li className="text-sm text-neutral-400">Add more skills and tools to see a clear direction.</li>}
            </ul>
            <button className={`${btn} mt-4`} disabled={!a.targets.length} onClick={() => onUseTargets(a.targets.map((t) => t.id), a.targets.flatMap((t) => t.titles))}>Target these roles</button>
          </section>

          <section className={`${card} p-5 text-sm`}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Contact check</h2>
            <ul className="mt-3 space-y-1.5">
              {([["Email", a.email], ["Phone", a.phone], ["LinkedIn", a.linkedin], ["GitHub", a.github]] as const).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3"><span className="text-neutral-500">{k}</span><span className={v ? "truncate" : "text-red-600"}>{v ?? "Missing"}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
