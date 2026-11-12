"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard, fetchGreenhouseDetails, PRESET_BOARDS, type AtsSource, type Board, type SearchSpec } from "@/lib/ats";
import { isTechField } from "@/lib/fields";
import { fetchJobicy, JOBICY_URL } from "@/lib/jobicy";
import { fetchRemotive, REMOTIVE_URL } from "@/lib/remotive";
import { fetchSmartRecruiters } from "@/lib/smartrecruiters";
import { COMMUNITY_REPO, dedupeAcross, fetchCommunity } from "@/lib/community";
import { isNewSince } from "@/lib/habit";
import { matchDetail, scoreFit, type FitResult } from "@/lib/score";
import type { Profile, Role, Weights } from "@/lib/types";
import MatchDetail from "./MatchDetail";
import { btn, btnGhost, card, FitPill, input } from "./ui";

type Scored = Role & FitResult;
const keyOf = (b: Board) => `${b.source}:${b.slug}`;
const STRONG = 70;
const ENRICH_TOP = 30;
const KEEP_FOR_QUEUE = 200;
const SOURCE_NAME: Record<string, string> = { remotive: "Remotive", jobicy: "Jobicy", smartrecruiters: "SmartRecruiters", workday: "Workday", greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", other: "Company site", indeed: "Indeed", handshake: "Handshake", manual: "Manual" };
const today = () => new Date().toISOString().slice(0, 10);

/** Runs `worker` over `items` with at most `n` in flight. */
async function pool<T>(items: T[], n: number, worker: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const item = items[i++]; await worker(item); }
  }));
}

export default function DiscoverTab({ profile, weights, trackedIds, onTrack, runSignal, saved, lastSearchAt, onSearched, resumeText }: {
  profile: Profile; weights: Weights; trackedIds: Set<string>; onTrack: (r: Role) => void; runSignal: number;
  saved: Role[]; lastSearchAt: string; onSearched: (top: Role[], day: string) => void; resumeText: string;
}) {
  const wantsTech = profile.targets.length === 0 || profile.targets.some(isTechField);
  const wantsOther = profile.targets.some((t) => !isTechField(t));
  const spec: SearchSpec = useMemo(() => ({ targets: profile.targets, wantTitles: profile.wantTitles, level: profile.level ?? "entry", city: !profile.willRelocate ? profile.homeMetro.split(",")[0].trim() || undefined : undefined }), [profile.targets, profile.wantTitles, profile.level, profile.willRelocate, profile.homeMetro]);
  const [boards, setBoards] = useState<Board[]>(PRESET_BOARDS);
  // Boards that hire for what you picked start on; a click overrides, and the defaults keep following your profile.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const defaultOn = (b: Board) => (b.group === "general" ? wantsOther || !wantsTech : wantsTech || wantsOther);
  const isOn = (b: Board) => overrides[keyOf(b)] ?? defaultOn(b);
  const [communityPick, setCommunityPick] = useState<boolean | null>(null);
  const community = communityPick ?? wantsTech;
  const setCommunity = (v: boolean) => setCommunityPick(v);
  const [remote, setRemote] = useState(true);
  const [employers, setEmployers] = useState<boolean | null>(null);
  const bigEmployers = employers ?? wantsOther;
  const [customSource, setCustomSource] = useState<AtsSource>("greenhouse");
  const [customSlug, setCustomSlug] = useState("");
  const [usOnly, setUsOnly] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [minFit, setMinFit] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Role[]>([]);
  const [status, setStatus] = useState<{ phase: "idle" | "search" | "read" | "done"; done: number; total: number }>({ phase: "idle", done: 0, total: 0 });
  const [failed, setFailed] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [previous, setPrevious] = useState("");
  const [fromSaved, setFromSaved] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Come back to your last search instead of an empty page.
  const restored = useRef(false);
  useEffect(() => {
    if (!restored.current && saved.length && results.length === 0 && status.phase === "idle") {
      restored.current = true; setResults(saved); setPrevious(lastSearchAt); setFromSaved(true); setStatus({ phase: "done", done: 0, total: 0 });
    }
  }, [saved, lastSearchAt, results.length, status.phase]);

  const run = useCallback(async () => {
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    const chosen = boards.filter(isOn);
    if (!chosen.length && !community && !remote && !bigEmployers) return;
    setResults([]); setFailed([]); setOpen(null); setFromSaved(false);
    setPrevious(lastSearchAt);
    setStatus({ phase: "search", done: 0, total: chosen.length + (community ? 1 : 0) + (remote ? 1 : 0) + (bigEmployers ? 1 : 0) });
    let boardRoles: Role[] = []; let communityRoles: Role[] = []; let remoteRoles: Role[] = []; let employerRoles: Role[] = [];
    const bad: string[] = [];
    const publish = () => setResults(dedupeAcross(dedupeAcross(dedupeAcross(boardRoles, communityRoles), remoteRoles), employerRoles));
    const tick = () => { if (!ac.signal.aborted) setStatus((s) => ({ ...s, done: s.done + 1 })); };

    const tasks: Promise<void>[] = [];
    if (community) tasks.push(fetchCommunity(usOnly, ac.signal).then((r) => { communityRoles = r; }).catch(() => { if (!ac.signal.aborted) bad.push("Community list"); }).finally(() => { if (!ac.signal.aborted) { publish(); tick(); } }));
    if (bigEmployers) tasks.push(fetchSmartRecruiters(usOnly, spec, ac.signal).then((r) => { employerRoles = r; }).catch(() => { if (!ac.signal.aborted) bad.push("SmartRecruiters"); }).finally(() => { if (!ac.signal.aborted) { publish(); tick(); } }));
    if (remote) tasks.push(Promise.allSettled([fetchRemotive(usOnly, spec, ac.signal), fetchJobicy(usOnly, spec, ac.signal)]).then(([a, b]) => {
      remoteRoles = dedupeAcross(a.status === "fulfilled" ? a.value : [], b.status === "fulfilled" ? b.value : []);
      if (a.status === "rejected" && b.status === "rejected" && !ac.signal.aborted) bad.push("Remote lists");
    }).finally(() => { if (!ac.signal.aborted) { publish(); tick(); } }));
    tasks.push(pool(chosen, 12, async (b) => {
      try { const got = await fetchBoard(b, usOnly, ac.signal, spec); boardRoles = [...boardRoles, ...got]; }   // read boardRoles after the await: other boards finish meanwhile
      catch { if (!ac.signal.aborted) bad.push(b.label); }
      if (!ac.signal.aborted) { publish(); tick(); }
    }));
    await Promise.all(tasks);
    if (ac.signal.aborted) return;
    setFailed(bad);

    // Greenhouse lists carry no description. Read the best candidates so their skill match is real.
    const top = boardRoles
      .map((r) => ({ r, fit: scoreFit(r, profile, weights).fit }))
      .filter((x) => x.r.ext && !x.r.descriptionLoaded)
      .sort((a, b) => b.fit - a.fit).slice(0, ENRICH_TOP).map((x) => x.r);
    setStatus({ phase: "read", done: 0, total: top.length });
    await pool(top, 12, async (r) => {
      try {
        const d = await fetchGreenhouseDetails(r.ext!.slug, r.ext!.id, r.company, ac.signal);
        if (ac.signal.aborted) return;
        boardRoles = boardRoles.map((x) => (x.id === r.id ? { ...x, ...d, descriptionLoaded: true } : x));
        publish();
      } catch { /* a missing description just leaves the title-only score */ }
      tick();
    });
    if (ac.signal.aborted) return;
    setStatus((s) => ({ ...s, phase: "done" }));
    const merged = dedupeAcross(dedupeAcross(dedupeAcross(boardRoles, communityRoles), remoteRoles), employerRoles);
    const best = merged.map((r) => ({ r, fit: scoreFit(r, profile, weights).fit })).sort((a, b) => b.fit - a.fit).slice(0, KEEP_FOR_QUEUE).map((x) => x.r);
    onSearched(best, today());
  }, [boards, overrides, wantsTech, wantsOther, community, remote, bigEmployers, usOnly, spec, profile, weights, lastSearchAt, onSearched]);

  // "Find my matches" elsewhere in the app bumps runSignal to start a search.
  const lastSignal = useRef(0);
  useEffect(() => { if (runSignal > lastSignal.current) { lastSignal.current = runSignal; void run(); } }, [runSignal, run]);
  useEffect(() => () => abort.current?.abort(), []);

  const scored: Scored[] = useMemo(
    () => results.map((r) => ({ ...r, ...scoreFit(r, profile, weights) })).sort((a, b) => b.fit - a.fit),
    [results, profile, weights],
  );
  const newCount = useMemo(() => scored.filter((r) => isNewSince(r, previous)).length, [scored, previous]);
  const shown = scored.filter((r) =>
    r.fit >= minFit && (!remoteOnly || r.remote) && (!newOnly || isNewSince(r, previous)) &&
    (!query || `${r.title} ${r.company} ${r.location}`.toLowerCase().includes(query.toLowerCase())));
  const strong = scored.filter((r) => r.fit >= STRONG).length;
  const bySource = useMemo(() => {
    const c = new Map<string, number>();
    for (const r of scored) if (r.fit >= STRONG) c.set(r.source, (c.get(r.source) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [scored]);

  // What-if: which missing skill, if learned, would turn the most roles into strong matches?
  const gaps = useMemo(() => {
    const withSkills = scored.filter((r) => r.descriptionLoaded);
    const counts = new Map<string, number>();
    for (const r of withSkills) {
      if (r.fit < 45) continue;
      for (const k of matchDetail(r, profile).missing) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, roles]) => {
      const withSkill = { ...profile, skills: [...profile.skills, skill] };
      const unlocked = withSkills.filter((r) => r.fit < STRONG && scoreFit(r, withSkill, weights).fit >= STRONG).length;
      return { skill, roles, unlocked };
    }).filter((g) => g.roles > 0);
  }, [scored, profile, weights]);

  const addBoard = () => {
    const slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    const b: Board = { source: customSource, slug, label: slug.charAt(0).toUpperCase() + slug.slice(1) };
    if (!boards.some((x) => keyOf(x) === keyOf(b))) setBoards([...boards, b]);
    setOverrides({ ...overrides, [keyOf(b)]: true });
    setCustomSlug("");
  };

  const busy = status.phase === "search" || status.phase === "read";

  return (
    <div className="space-y-6">
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Search live</h2>
            <p className="text-sm text-neutral-500">Reads real postings for the fields you chose straight from public sources. Nothing about you is sent.</p>
          </div>
          <button className={btn} onClick={() => void run()} disabled={busy || (!boards.some(isOn) && !community && !remote && !bigEmployers)}>
            {busy ? (status.phase === "search" ? `Searching ${status.done}/${status.total}...` : `Reading descriptions ${status.done}/${status.total}...`) : "Search now"}
          </button>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} className="mt-0.5 size-4 accent-neutral-900 dark:accent-white" />
          <span><span className="font-medium">Include remote jobs in every field</span> <span className="text-neutral-500">(support, sales, finance, healthcare, teaching, design and more)</span>
            <span className="block text-xs text-neutral-500">Remote listings from <a className="underline" href={REMOTIVE_URL} target="_blank" rel="noreferrer">Remotive</a> and <a className="underline" href={JOBICY_URL} target="_blank" rel="noreferrer">Jobicy</a>, linked back to their pages.</span></span>
        </label>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          <input type="checkbox" checked={bigEmployers} onChange={(e) => setEmployers(e.target.checked)} className="mt-0.5 size-4 accent-neutral-900 dark:accent-white" />
          <span><span className="font-medium">Include large employers on SmartRecruiters</span> <span className="text-neutral-500">(Domino&rsquo;s, McDonald&rsquo;s, Aramark, Sodexo, Equinox, Primark, Bosch and more: store, kitchen, driver, facilities and office roles in thousands of locations)</span></span>
        </label>
        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
          <input type="checkbox" checked={community} onChange={(e) => setCommunity(e.target.checked)} className="mt-0.5 size-4 accent-neutral-900 dark:accent-white" />
          <span><span className="font-medium">Include the community internship list</span> <span className="text-neutral-500">(software and data internships only; about 1,700 roles, including Workday and iCIMS portals the company boards cannot reach)</span>
            <span className="block text-xs text-neutral-500">Maintained by <a className="underline" href={COMMUNITY_REPO} target="_blank" rel="noreferrer">SimplifyJobs and Pitt CSC</a>. Read live from their public repository, never copied.</span></span>
        </label>
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Company boards <span className="font-normal text-neutral-500">({boards.filter(isOn).length} of {boards.length} selected)</span></summary>
          <div className="mt-2 flex gap-2 text-xs">
            <button className={btnGhost} onClick={() => setOverrides(Object.fromEntries(boards.map((b) => [keyOf(b), true])))}>Select all</button>
            <button className={btnGhost} onClick={() => setOverrides(Object.fromEntries(boards.map((b) => [keyOf(b), false])))}>Select none</button>
          </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {boards.map((b) => {
            const on = isOn(b);
            return (
              <button key={keyOf(b)} aria-pressed={on} onClick={() => setOverrides({ ...overrides, [keyOf(b)]: !on })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}>
                {b.label}
              </button>
            );
          })}
        </div>
        </details>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={customSource} onChange={(e) => setCustomSource(e.target.value as AtsSource)} className={`${input} !w-auto`} aria-label="Board type">
            <option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option>
          </select>
          <input value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addBoard()} placeholder="Add any company, e.g. airbnb" className={`${input} !w-56`} />
          <button className={btnGhost} onClick={addBoard}>Add board</button>
        </div>
      </section>

      {status.phase !== "idle" && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-1">
            <section className={`${card} p-4`}>
              <div className="text-3xl font-semibold">{strong}</div>
              <div className="text-sm text-neutral-500">strong matches (70%+) out of {fromSaved ? `your best ${scored.length} from the last search` : `${scored.length} roles`}</div>
              {bySource.length > 0 && <p className="mt-2 text-xs text-neutral-400">{bySource.map(([s, n]) => `${n} on ${SOURCE_NAME[s] ?? s}`).join(" · ")}</p>}
              {fromSaved && <p className="mt-2 text-xs text-neutral-500">Showing your last search{lastSearchAt ? ` (${lastSearchAt})` : ""}. Search again for fresh roles.</p>}
              {failed.length > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Could not reach: {failed.join(", ")}.</p>}
            </section>
            <section className={`${card} space-y-3 p-4 text-sm`}>
              <input className={input} placeholder="Filter by title, company, place" value={query} onChange={(e) => setQuery(e.target.value)} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={usOnly} onChange={(e) => setUsOnly(e.target.checked)} className="accent-neutral-900" /> US locations only <span className="text-xs text-neutral-400">(next search)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-neutral-900" /> Remote only</label>
              {previous && <label className="flex items-center gap-2"><input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} className="accent-neutral-900" /> New since {previous} <span className="font-mono text-xs text-neutral-400">{newCount}</span></label>}
              <div><div className="flex justify-between"><span>Minimum match</span><span className="font-mono text-xs">{minFit}%</span></div>
                <input type="range" min={0} max={95} step={5} value={minFit} onChange={(e) => setMinFit(Number(e.target.value))} className="w-full accent-neutral-900 dark:accent-white" aria-label="Minimum match" /></div>
            </section>
            {gaps.length > 0 && (
              <section className={`${card} p-4`}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Skills worth learning</h3>
                <p className="mt-1 text-xs text-neutral-500">What the roles you almost match keep asking for.</p>
                <ul className="mt-3 space-y-2.5 text-sm">
                  {gaps.map((g) => (
                    <li key={g.skill}>
                      <div className="flex justify-between"><span className="font-medium">{g.skill}</span><span className="text-xs text-neutral-500">in {g.roles} roles</span></div>
                      {g.unlocked > 0 && <div className="text-xs text-emerald-600 dark:text-emerald-400">Adding it lifts {g.unlocked} role{g.unlocked === 1 ? "" : "s"} to a strong match</div>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="lg:col-span-3">
            <ul className="space-y-2.5">
              {shown.slice(0, 80).map((r) => {
                const m = matchDetail(r, profile);
                const tracked = trackedIds.has(r.id);
                const isOpen = open === r.id;
                const isNew = isNewSince(r, previous);
                return (
                  <li key={r.id} className={`${card} overflow-hidden`}>
                    <div className="flex flex-wrap items-start gap-3 p-3.5">
                      <button className="flex min-w-0 flex-1 basis-64 items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                        <div className="w-12 shrink-0 text-center"><FitPill fit={r.fit} /><div className="mt-0.5 text-[10px] text-neutral-400">match</div></div>
                        <div className="min-w-0">
                          <div className="font-medium leading-snug">{r.title}{isNew && <span className="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">NEW</span>}</div>
                          <div className="text-sm text-neutral-500">{r.company} · {r.remote ? "Remote" : r.location || "Location not listed"}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-400">
                            <span>{SOURCE_NAME[r.source] ?? r.source}</span>
                            {m.coverage !== null && <span>{m.have.length}/{r.keywords.length} skills</span>}
                            {r.flags?.includes("citizenship") && <span className="text-amber-700 dark:text-amber-400">US citizenship</span>}
                            {r.reasons[0] && <span className="truncate">{r.reasons[0]}</span>}
                          </div>
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-2">
                        {r.url && <a href={r.url} target="_blank" rel="noreferrer" className={btnGhost}>Apply ↗</a>}
                        <button className={btn} disabled={tracked} onClick={() => onTrack(r)}>{tracked ? "Tracked" : "Track"}</button>
                      </div>
                    </div>
                    {isOpen && <div className="border-t border-neutral-100 p-4 dark:border-neutral-800"><MatchDetail role={r} result={r} profile={profile} resumeText={resumeText} /></div>}
                  </li>
                );
              })}
            </ul>
            {shown.length === 0 && !busy && <p className="py-10 text-center text-sm text-neutral-500">No roles match these filters. Lower the minimum match or pick more sources.</p>}
            {shown.length > 80 && <p className="mt-3 text-center text-xs text-neutral-400">Showing the best 80 of {shown.length}.</p>}
          </div>
        </div>
      )}

      {status.phase === "idle" && <p className="py-8 text-center text-sm text-neutral-500">Pick sources and press Search now. Roles come back ranked by how well you match.</p>}
    </div>
  );
}
