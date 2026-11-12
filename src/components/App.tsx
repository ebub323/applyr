"use client";
import { useEffect, useMemo, useState } from "react";
import { parseResume, TARGET_OPTIONS } from "@/lib/resume";
import { scoreFit } from "@/lib/score";
import { useAppState } from "@/lib/state";
import { APPLIED_STAGES, REPLIED_STAGES, STAGES, type Profile, type Role, type Stage } from "@/lib/types";
import AddRole from "./AddRole";
import Board, { type Scored } from "./Board";
import DiscoverTab from "./DiscoverTab";
import ProfileTab from "./ProfileTab";
import ResumeTab from "./ResumeTab";
import RoleDrawer from "./RoleDrawer";
import { btn, btnGhost, card } from "./ui";

type Tab = "resume" | "profile" | "discover" | "board";
const TABS: { id: Tab; label: string }[] = [
  { id: "resume", label: "Resume" }, { id: "profile", label: "Profile" }, { id: "discover", label: "Discover" }, { id: "board", label: "Board" },
];
const today = () => new Date().toISOString().slice(0, 10);
const isDemo = (r: Role) => /^s\d+$/.test(r.id);

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

export default function App() {
  const { state, update, reset, hydrated } = useAppState();
  const [tab, setTab] = useState<Tab>("resume");
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [runSignal, setRunSignal] = useState(0);

  // Returning visitors resume where the work is; first-timers start with the resume.
  useEffect(() => { if (hydrated && state.onboarded) setTab("board"); }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const scored: Scored[] = useMemo(
    () => state.roles.map((r) => ({ ...r, ...scoreFit(r, state.profile, state.weights) })),
    [state.roles, state.profile, state.weights],
  );
  const patchRole = (id: string, patch: Partial<Role>) => update((s) => ({ ...s, roles: s.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const moveRole = (id: string, stage: Stage) => update((s) => ({
    ...s, roles: s.roles.map((r) => r.id !== id ? r : { ...r, stage, appliedAt: APPLIED_STAGES.includes(stage) && !r.appliedAt ? today() : r.appliedAt }),
  }));
  const track = (r: Role) => update((s) => (s.roles.some((x) => x.id === r.id) ? s : { ...s, roles: [{ ...r, stage: "found" }, ...s.roles] }));
  const setProfile = (p: Partial<Profile>) => update((s) => ({ ...s, profile: { ...s.profile, ...p } }));
  const goDiscover = () => { setTab("discover"); setRunSignal((n) => n + 1); };

  const applied = state.roles.filter((r) => r.appliedAt || APPLIED_STAGES.includes(r.stage));
  const replied = state.roles.filter((r) => REPLIED_STAGES.includes(r.stage));
  const replyRate = applied.length ? Math.round((replied.length / applied.length) * 100) : 0;
  const appliedToday = state.roles.filter((r) => r.appliedAt === today()).length;
  const goalPct = Math.min(100, Math.round((appliedToday / Math.max(1, state.dailyGoal)) * 100));
  const selectedRole = scored.find((r) => r.id === selected) ?? null;
  const hasDemo = state.roles.some(isDemo);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Title", "Company", "Location", "Stage", "Match", "Applied", "Link", "Notes"],
      ...scored.map((r) => [r.title, r.company, r.location, STAGES.find((s) => s.id === r.stage)?.label, r.fit, r.appliedAt, r.url, r.notes])];
    download("applyr-board.csv", rows.map((r) => r.map(esc).join(",")).join("\n"), "text/csv");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <nav className="mb-8 flex flex-wrap items-center gap-2" aria-label="Steps">
        {TABS.map((t, i) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "step" : undefined}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${tab === t.id ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}>
            <span className="font-mono text-xs opacity-60">{i + 1}</span>{t.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <div className="hidden w-52 sm:block" title="Applications logged today against your daily goal">
            <div className="flex justify-between text-xs text-neutral-500"><span>Today</span><span className="font-mono">{appliedToday} / {state.dailyGoal}</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${goalPct}%` }} /></div>
          </div>
          <input type="number" min={1} max={200} value={state.dailyGoal} aria-label="Daily application goal" title="Daily goal"
            onChange={(e) => update((s) => ({ ...s, dailyGoal: Math.max(1, Number(e.target.value) || 1) }))}
            className="w-16 rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-center text-sm dark:border-neutral-700" />
        </div>
      </nav>

      <div className={tab === "resume" ? "" : "hidden"}>
        <ResumeTab
          resume={state.resume} resumeName={state.resumeName} profile={state.profile}
          onResume={(text, name) => update((s) => {
            // The first time a resume arrives, fill the profile from it so matching works with no extra typing.
            if (text && !s.resume) {
              const a = parseResume(text);
              const ids = a.targets.map((t) => t.id);
              return { ...s, resume: text, resumeName: name, onboarded: true, profile: { ...s.profile,
                skills: a.skills.length ? a.skills : s.profile.skills,
                targets: ids.length ? ids : s.profile.targets,
                wantTitles: ids.length ? [...new Set(TARGET_OPTIONS.filter((o) => ids.includes(o.id)).flatMap((o) => o.titles))] : s.profile.wantTitles } };
            }
            return { ...s, resume: text, resumeName: name, onboarded: s.onboarded || !!text };
          })}
          onUseSkills={(skills) => setProfile({ skills: [...new Set([...state.profile.skills, ...skills])] })}
          onUseTargets={(ids, titles) => setProfile({ targets: ids, wantTitles: [...new Set(titles)] })}
          onNext={() => setTab("profile")}
        />
      </div>
      <div className={tab === "profile" ? "" : "hidden"}>
        <ProfileTab profile={state.profile} weights={state.weights} onProfile={setProfile} onWeights={(w) => update((s) => ({ ...s, weights: w }))} onNext={goDiscover} />
      </div>
      <div className={tab === "discover" ? "" : "hidden"}>
        <DiscoverTab profile={state.profile} weights={state.weights} trackedIds={new Set(state.roles.map((r) => r.id))} onTrack={track} runSignal={runSignal} />
      </div>

      <div className={tab === "board" ? "" : "hidden"}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Tracked", state.roles.length], ["Applied", applied.length], ["Replies", replied.length], ["Reply rate", `${replyRate}%`]].map(([k, v]) => (
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
        <Board roles={scored} onMove={moveRole} onSelect={setSelected} />
      </div>

      {selectedRole && (
        <RoleDrawer role={selectedRole} profile={state.profile} onChange={(p) => patchRole(selectedRole.id, p)} onMove={(s) => moveRole(selectedRole.id, s)}
          onDelete={() => { update((s) => ({ ...s, roles: s.roles.filter((r) => r.id !== selectedRole.id) })); setSelected(null); }} onClose={() => setSelected(null)} />
      )}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500 dark:border-neutral-800">
        <span>Your resume and board are stored only in this browser. Job data comes straight from each company's public board.</span>
        <button className="underline" onClick={() => { if (confirm("Delete your resume, profile and board from this browser?")) { reset(); setTab("resume"); } }}>Delete my data</button>
      </footer>
    </div>
  );
}
