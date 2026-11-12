"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { fileToText } from "@/lib/extract";
import { parseResume, replaceBullet, SAMPLE_RESUME, type Check } from "@/lib/resume";
import type { Profile } from "@/lib/types";
import { btn, btnGhost, card, input, tagTone } from "./ui";

const GROUPS: { id: Check["group"]; label: string; blurb: string; bar: string }[] = [
  { id: "ats", label: "ATS readiness", blurb: "Can software read it?", bar: "from-sky-500 to-cyan-400" },
  { id: "impact", label: "Impact", blurb: "Do bullets show results?", bar: "from-fuchsia-500 to-pink-400" },
  { id: "technical", label: "Skills and depth", blurb: "Does it prove skill?", bar: "from-violet-500 to-indigo-400" },
  { id: "completeness", label: "Completeness", blurb: "Is anything missing?", bar: "from-amber-500 to-orange-400" },
];

function Ring({ value }: { value: number }) {
  const r = 52, c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now(); const from = 0;
    const tick = (t: number) => { const k = Math.min(1, (t - t0) / 900); setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const [c1, c2] = value >= 80 ? ["#10b981", "#2dd4bf"] : value >= 60 ? ["#f59e0b", "#fb923c"] : ["#ef4444", "#d946ef"];
  return (
    <svg width="148" height="148" viewBox="0 0 132 132" role="img" aria-label={`Resume score ${value} out of 100`} className="drop-shadow-lg">
      <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} /><stop offset="1" stopColor={c2} /></linearGradient></defs>
      <circle cx="66" cy="66" r={r} fill="none" strokeWidth="11" className="stroke-violet-100 dark:stroke-violet-500/20" />
      <circle cx="66" cy="66" r={r} fill="none" strokeWidth="11" strokeLinecap="round" stroke="url(#ring)"
        strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} transform="rotate(-90 66 66)" />
      <text x="66" y="70" textAnchor="middle" className="fill-current text-[34px] font-bold">{shown}</text>
      <text x="66" y="88" textAnchor="middle" className="fill-violet-400 text-[10px] font-medium">out of 100</text>
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
      <div className="relative mx-auto max-w-2xl text-center">
        <span aria-hidden className="anim-float absolute -left-10 top-2 text-4xl">✨</span>
        <span aria-hidden className="anim-float absolute -right-8 top-16 text-3xl [animation-delay:1.2s]">🚀</span>
        <h1 className="anim-up text-4xl font-extrabold tracking-tight sm:text-5xl">Know where you stand <span className="grad-text">before you apply.</span></h1>
        <p className="anim-up mt-4 text-lg text-violet-950/70 [animation-delay:80ms] dark:text-violet-100/70">
          Drop in your resume. Applyr grades it the way an applicant tracking system and a recruiter would, works out what kind of job you are after,
          then finds live openings in any field, ranked by how well you match. A small AI on your own computer tailors your resume to each one.
        </p>
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void load(f); }}
          className={`${card} anim-up mt-8 border-2 border-dashed p-10 text-center transition-all [animation-delay:160ms] ${drag ? "scale-[1.03] border-fuchsia-500 bg-fuchsia-50 shadow-2xl shadow-fuchsia-500/30" : "border-violet-300 hover:border-fuchsia-400 hover:shadow-xl"}`}
        >
          <div aria-hidden className={`text-5xl ${drag ? "anim-wiggle" : "anim-float"}`}>{busy ? "⏳" : "📄"}</div>
          <p className="mt-2 text-xl font-bold">{busy ? "Reading your resume..." : drag ? "Let go to upload!" : "Drop your resume here"}</p>
          <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/60">PDF, DOCX or TXT. It is read in your browser and never uploaded.</p>
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
      <div className={`${card} anim-up flex flex-wrap items-center gap-6 p-6`}>
        <Ring value={a.overall} />
        <div className="min-w-64 flex-1">
          <div className="flex items-baseline gap-3">
            <span className="grad-text text-5xl font-extrabold">{a.grade}</span>
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
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/20"><div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${g.bar}`} style={{ width: `${pct}%` }} /></div>
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-violet-500">Fix these first</h2>
          {a.fixes.length ? (
            <ol className="mt-3 space-y-2.5">
              {a.fixes.map((f, i) => (
                <li key={f} className="flex gap-3 text-sm"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-[11px] font-bold text-white shadow">{i + 1}</span>{f}</li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-emerald-600">Nothing urgent. Your resume passes every check.</p>}

          <div className="mb-2 mt-7 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-500">Your bullets, one by one</h2>
            <label className="flex items-center gap-2 text-xs text-neutral-500"><input type="checkbox" checked={onlyWeak} onChange={(e) => setOnlyWeak(e.target.checked)} className="accent-fuchsia-500" /> Only ones that need work</label>
          </div>
          {a.bulletReview.length === 0 ? <p className="text-sm text-neutral-400">No bullets detected.</p> : (
            <>
              <p className="mb-3 text-xs text-neutral-500">{a.bulletReview.filter((b) => b.hard).length} of {a.bulletReview.length} bullets need work{a.bulletReview.filter((b) => !b.hard && !b.ok).length > 0 ? `, and ${a.bulletReview.filter((b) => !b.hard && !b.ok).length} more would be stronger with a number` : ""}. Apply a fix and the grade updates.</p>
              <ul className="space-y-2.5">
                {a.bulletReview.filter((b) => !onlyWeak || b.hard).map((b) => (
                  <li key={b.text} className="lift rounded-xl border border-violet-100 bg-white/60 p-3 text-sm dark:border-violet-500/20 dark:bg-transparent">
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

          <h2 className="mb-2 mt-7 text-sm font-bold uppercase tracking-wide text-violet-500">Every check</h2>
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
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-500">Skills I found</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.skills.map((s) => <span key={s} className={`anim-pop rounded-full px-2.5 py-0.5 text-xs font-medium ${tagTone(s)}`}>{s}</span>)}
            </div>
            <button className={`${btn} mt-4`} disabled={!missingSkills.length} onClick={() => onUseSkills(a.skills)}>
              {missingSkills.length ? `Use these ${a.skills.length} skills for matching` : "Already using these skills"}
            </button>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-500">Roles your resume points at</h2>
            <ul className="mt-3 space-y-2.5">
              {a.targets.map((t) => (
                <li key={t.id}>
                  <div className="flex justify-between text-sm"><span>{t.label}</span><span className="font-mono text-xs text-neutral-500">{Math.round(t.strength * 100)}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/20"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700" style={{ width: `${t.strength * 100}%` }} /></div>
                </li>
              ))}
              {!a.targets.length && <li className="text-sm text-neutral-400">Add more skills and tools to see a clear direction.</li>}
            </ul>
            <button className={`${btn} mt-4`} disabled={!a.targets.length} onClick={() => onUseTargets(a.targets.map((t) => t.id), a.targets.flatMap((t) => t.titles))}>Target these roles</button>
          </section>

          <section className={`${card} p-5 text-sm`}>
            <h2 className="text-sm font-bold uppercase tracking-wide text-violet-500">Contact check</h2>
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
