"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { exportBackup, parseBackup } from "@/lib/backup";
import { buildQueue, daysBetween, followUpsDue, streak } from "@/lib/habit";
import { extractKit, parseResume, TARGET_OPTIONS } from "@/lib/resume";
import { scoreFit } from "@/lib/score";
import { useAppState } from "@/lib/state";
import { APPLIED_STAGES, REPLIED_STAGES, STAGES, type Profile, type Role, type Stage } from "@/lib/types";
import AddRole from "./AddRole";
import Board, { type Scored } from "./Board";
import DiscoverTab from "./DiscoverTab";
import ProfileTab from "./ProfileTab";
import ResumeTab from "./ResumeTab";
import RoleDrawer from "./RoleDrawer";
import TodayTab from "./TodayTab";
import { btn, btnGhost, card, Confetti } from "./ui";

type Tab = "resume" | "profile" | "discover" | "today" | "board";
const TABS: { id: Tab; label: string; icon: string; tone: string }[] = [
  { id: "resume", label: "Resume", icon: "📄", tone: "from-violet-600 to-fuchsia-500 shadow-violet-500/40" },
  { id: "profile", label: "Profile", icon: "🎯", tone: "from-fuchsia-500 to-pink-500 shadow-fuchsia-500/40" },
  { id: "discover", label: "Discover", icon: "🔎", tone: "from-sky-500 to-cyan-400 shadow-sky-500/40" },
  { id: "today", label: "Today", icon: "⚡", tone: "from-orange-500 to-amber-400 shadow-orange-500/40" },
  { id: "board", label: "Board", icon: "🗂️", tone: "from-emerald-500 to-teal-400 shadow-emerald-500/40" },
];
const today = () => new Date().toISOString().slice(0, 10);
const isDemo = (r: Role) => /^s\d+$/.test(r.id);
const toRole = ({ fit: _f, factors: _fa, reasons: _r, ...rest }: Scored): Role => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function App() {
  const { state, update, replace, reset, hydrated } = useAppState();
  const [tab, setTab] = useState<Tab>("resume");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [runSignal, setRunSignal] = useState(0);
  const [notice, setNotice] = useState("");
  const [burst, setBurst] = useState(0);
  const importRef = useRef<HTMLInputElement>(null);
  const day = today();
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 6000); return () => clearTimeout(t); }, [notice]);

  // Returning visitors start with today's work; first-timers start with the resume.
  useEffect(() => { if (hydrated && state.onboarded) setTab("today"); }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const scored: Scored[] = useMemo(
    () => state.roles.map((r) => ({ ...r, ...scoreFit(r, state.profile, state.weights) })),
    [state.roles, state.profile, state.weights],
  );
  const patchRole = (id: string, patch: Partial<Role>) => update((s) => ({ ...s, roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const moveRole = (id: string, stage: Stage) => update((s) => ({
    ...s, roles: s.roles.map((r) => r.id !== id ? r : { ...r, stage, appliedAt: APPLIED_STAGES.includes(stage) && !r.appliedAt ? day : r.appliedAt }),
  }));
  const track = (r: Role) => update((s) => (s.roles.some((x) => x.id === r.id) ? s : { ...s, roles: [{ ...r, stage: "found" }, ...s.roles] }));
  const setProfile = (p: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const goDiscover = () => { setTab("discover"); setRunSignal((n) => n + 1); };

  // ---- the daily loop ----
  const candidates: Scored[] = useMemo(
    () => state.lastResults.map((r) => ({ ...r, ...scoreFit(r, state.profile, state.weights) })),
    [state.lastResults, state.profile, state.weights],
  );
  // Demo roles carry made-up dates. They must never count as the person's own activity.
  const real = useMemo(() => state.roles.filter((r) => !isDemo(r)), [state.roles]);
  const appliedDates = real.map((r) => r.appliedAt).filter((d): d is string => !!d);
  const appliedToday = appliedDates.filter((d) => d === day).length;
  const appliedThisWeek = appliedDates.filter((d) => daysBetween(d, day) >= 0 && daysBetween(d, day) < 7).length;
  const streakDays = streak(appliedDates, day);
  const skipped = useMemo(() => new Set(Object.entries(state.skipped).filter(([, d]) => d === day).map(([id]) => id)), [state.skipped, day]);
  const queue = useMemo(() => {
    const pool = new Map<string, Scored>();
    for (const r of candidates) pool.set(r.id, r);
    for (const r of scored) if (!isDemo(r) && (r.stage === "found" || r.stage === "account_ready")) pool.set(r.id, r);
    return buildQueue([...pool.values()], real, state.dailyGoal, appliedToday, skipped);
  }, [candidates, scored, real, state.dailyGoal, appliedToday, skipped]);
  const due = useMemo(() => followUpsDue(real, day), [real, day]);
  const dueIds = useMemo(() => new Set(due.map((r) => r.id)), [due]);

  const applyFromQueue = (r: Scored) => {
    if (r.url) window.open(r.url, "_blank", "noopener");
    update((s) => s.roles.some((x) => x.id === r.id)
      ? { ...s, roles: s.roles.map((x) => (x.id === r.id ? { ...x, stage: "applied", appliedAt: x.appliedAt ?? day } : x)) }
      : { ...s, roles: [{ ...toRole(r), stage: "applied", appliedAt: day }, ...s.roles] });
  };

  const applied = real.filter((r) => r.appliedAt || APPLIED_STAGES.includes(r.stage));
  const replied = real.filter((r) => REPLIED_STAGES.includes(r.stage));
  const replyRate = applied.length ? Math.round((replied.length / applied.length) * 100) : 0;
  const prevApplied = useRef(appliedToday);
  useEffect(() => {
    // Celebrate each application logged, and the goal itself a little louder.
    if (appliedToday > prevApplied.current) setBurst((n) => n + 1);
    prevApplied.current = appliedToday;
  }, [appliedToday]);
  const goalPct = Math.min(100, Math.round((appliedToday / Math.max(1, state.dailyGoal)) * 100));
  const selectedRole = scored.find((r) => r.id === selected) ?? null;
  const hasDemo = state.roles.some(isDemo);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Title", "Company", "Location", "Stage", "Match", "Applied", "Link", "Notes"],
      ...scored.map((r) => [r.title, r.company, r.location, STAGES.find((s) => s.id === r.stage)?.label, r.fit, r.appliedAt, r.url, r.notes])];
    download("applyr-board.csv", rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
  };

  const importBackup = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { setNotice(parsed.error); return; }
    if (!confirm(`Replace everything in this browser with the backup (${parsed.state.roles?.length ?? 0} roles)?`)) return;
    replace(parsed.state); setNotice("Backup restored."); setTab("today");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Confetti burst={burst} />
      <nav className="mb-8 flex flex-wrap items-center gap-2" aria-label="Steps">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "step" : undefined}
            className={`press flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${tab === t.id ? `border-transparent bg-gradient-to-r ${t.tone} -translate-y-0.5 text-white shadow-lg` : "border-violet-100 bg-white/80 text-violet-900/80 hover:-translate-y-0.5 hover:border-fuchsia-300 hover:shadow-md dark:border-violet-500/20 dark:bg-[#1a1433]/80 dark:text-violet-100"}`}>
            <span className={tab === t.id ? "anim-pop" : ""} aria-hidden>{t.icon}</span>{t.label}
            {t.id === "today" && due.length > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white" title="Follow-ups due">{due.length}</span>}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden w-44 sm:block" title="Applications logged today against your daily goal">
            <div className="flex justify-between text-xs text-neutral-500"><span>Today</span><span className="font-mono">{appliedToday} / {state.dailyGoal}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/20"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-700" style={{ width: `${goalPct}%` }} /></div>
          </div>
          <input type="number" min={1} max={200} value={state.dailyGoal} aria-label="Daily application goal" title="Daily goal"
            onChange={(e) => update((s) => ({ ...s, dailyGoal: Math.max(1, Number(e.target.value) || 1) }))}
            className="w-16 rounded-xl border border-violet-200 bg-white/80 px-2 py-1 text-center text-sm outline-none focus:border-fuchsia-400 dark:border-violet-500/30 dark:bg-transparent" />
        </div>
      </nav>

      {notice && <div role="status" className="anim-pop mb-4 flex items-center justify-between rounded-xl bg-gradient-to-r from-violet-100 to-fuchsia-100 px-4 py-2 text-sm font-medium text-violet-900 dark:from-violet-500/20 dark:to-fuchsia-500/20 dark:text-violet-100">{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></div>}

      <div className={tab === "resume" ? "" : "hidden"}>
        <ResumeTab
          resume={state.resume} resumeName={state.resumeName} profile={state.profile}
          onResume={(text, name) => update((s) => {
            // The first time a resume arrives, fill the profile and the apply kit from it so nothing needs retyping.
            if (text && !s.resume) {
              const a = parseResume(text);
              const ids = a.targets.map((t) => t.id);
              const kit = extractKit(text);
              return { ...s, resume: text, resumeName: name, onboarded: true, profile: { ...s.profile,
                level: a.isStudent || a.bullets.length < 6 ? "entry" as const : "any" as const,
                skills: a.skills.length ? a.skills : s.profile.skills,
                targets: ids.length ? ids : s.profile.targets,
                wantTitles: ids.length ? [...new Set(TARGET_OPTIONS.filter((o) => ids.includes(o.id)).flatMap((o) => o.titles))] : s.profile.wantTitles,
                kit: { ...s.profile.kit, ...Object.fromEntries(Object.entries(kit).filter(([, v]) => v)) } } };
            }
            return { ...s, resume: text, resumeName: name, onboarded: s.onboarded || !!text };
          })}
          onUseSkills={(skills) => setProfile({ skills: [...new Set([...state.profile.skills, ...skills])] })}
          onUseTargets={(ids, titles) => setProfile({ targets: ids, wantTitles: [...new Set(titles)] })}
          onNext={() => setTab("profile")}
        />
      </div>
      <div className={tab === "profile" ? "" : "hidden"}>
        <ProfileTab profile={state.profile} weights={state.weights} resume={state.resume} onProfile={setProfile} onWeights={(w) => update((s) => ({ ...s, weights: w }))} onNext={goDiscover} />
      </div>
      <div className={tab === "discover" ? "" : "hidden"}>
        <DiscoverTab profile={state.profile} weights={state.weights} trackedIds={new Set(state.roles.map((r) => r.id))} onTrack={track} runSignal={runSignal}
          saved={state.lastResults} lastSearchAt={state.lastSearchAt} resumeText={state.resume}
          onSearched={(top, d) => update((s) => ({ ...s, lastResults: top, lastSearchAt: d }))} />
      </div>
      <div className={tab === "today" ? "" : "hidden"}>
        <TodayTab queue={queue} followUps={due} goal={state.dailyGoal} appliedToday={appliedToday} streakDays={streakDays} appliedThisWeek={appliedThisWeek}
          profile={state.profile} today={day} onApply={applyFromQueue}
          onSkip={(id) => update((s) => ({ ...s, skipped: { ...s.skipped, [id]: day } }))}
          onFollowedUp={(id) => patchRole(id, { followedUpAt: day })} onOpenDiscover={goDiscover} />
      </div>

      <div className={tab === "board" ? "" : "hidden"}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Tracked", real.length], ["Applied", applied.length], ["Replies", replied.length], ["Reply rate", `${replyRate}%`]].map(([k, v]) => (
            <div key={k} className={`${card} p-4`}><div className="text-2xl font-semibold tabular-nums">{v}</div><div className="text-xs text-neutral-500">{k}</div></div>
          ))}
        </div>
        <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold uppercase tracking-wide text-neutral-500">Your board <span className="font-normal normal-case text-neutral-400">drag cards between stages</span></h2>
          <button className={btn} onClick={() => setAdding((v) => !v)}>+ Add a role</button>
          <button className={btnGhost} onClick={goDiscover}>Find more</button>
          <button className={btnGhost} onClick={exportCsv}>Export CSV</button>
          {hasDemo && <button className={btnGhost} onClick={() => update((s) => ({ ...s, roles: s.roles.filter((r) => !isDemo(r)) }))}>Clear demo roles</button>}
        </div>
        {adding && <div className="mb-4"><AddRole onAdd={(r) => update((s) => ({ ...s, roles: [r, ...s.roles] }))} onClose={() => setAdding(false)} /></div>}
        {hasDemo && <p className="mb-3 text-xs text-neutral-500">These are demo roles so the board is not empty. Clear them, then track real roles from Discover.</p>}
        <Board roles={scored} dueIds={dueIds} onMove={moveRole} onSelect={setSelected} />
      </div>

      {selectedRole && (
        <RoleDrawer role={selectedRole} profile={state.profile} resumeText={state.resume} onChange={(p) => patchRole(selectedRole.id, p)} onMove={(s) => moveRole(selectedRole.id, s)}
          onDelete={() => { update((s) => ({ ...s, roles: s.roles.filter((r) => r.id !== selectedRole.id) })); setSelected(null); }} onClose={() => setSelected(null)} />
      )}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500 dark:border-neutral-800">
        <span>Your resume and board are stored only in this browser. Job data comes straight from public sources.</span>
        <span className="flex flex-wrap gap-4">
          <button className="underline" onClick={() => download(`applyr-backup-${day}.json`, exportBackup(state), "application/json")}>Export backup</button>
          <button className="underline" onClick={() => importRef.current?.click()}>Import backup</button>
          <input ref={importRef} type="file" accept="application/json,.json" className="hidden" data-testid="backup-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importBackup(f); e.target.value = ""; }} />
          <button className="underline" onClick={() => { if (confirm("Delete your resume, profile and board from this browser?")) { reset(); setTab("resume"); } }}>Delete my data</button>
        </span>
      </footer>
    </div>
  );
}
