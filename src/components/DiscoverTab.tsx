"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard, fetchGreenhouseDetails, PRESET_BOARDS, type AtsSource, type Board } from "@/lib/ats";
import { matchDetail, scoreFit, type FitResult } from "@/lib/score";
import type { Profile, Role, Weights } from "@/lib/types";
import MatchDetail from "./MatchDetail";
import { btn, btnGhost, card, FitPill, input } from "./ui";

type Scored = Role & FitResult;
const keyOf = (b: Board) => `${b.source}:${b.slug}`;
const STRONG = 70;
const ENRICH_TOP = 30;

/** Runs `worker` over `items` with at most `n` in flight. */
async function pool<T>(items: T[], n: number, worker: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const item = items[i++]; await worker(item); }
  }));
}

export default function DiscoverTab({ profile, weights, trackedIds, onTrack, runSignal }: {
  profile: Profile; weights: Weights; trackedIds: Set<string>; onTrack: (r: Role) => void; runSignal: number;
}) {
  const [boards, setBoards] = useState<Board[]>(PRESET_BOARDS);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(PRESET_BOARDS.map(keyOf)));
  const [customSource, setCustomSource] = useState<AtsSource>("greenhouse");
  const [customSlug, setCustomSlug] = useState("");
  const [usOnly, setUsOnly] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minFit, setMinFit] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Role[]>([]);
  const [status, setStatus] = useState<{ phase: "idle" | "search" | "read" | "done"; done: number; total: number }>({ phase: "idle", done: 0, total: 0 });
  const [failed, setFailed] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
    abort.current?.abort();
    const ac = new AbortController(); abort.current = ac;
    const chosen = boards.filter((b) => picked.has(keyOf(b)));
    if (!chosen.length) return;
    setResults([]); setFailed([]); setOpen(null);
    setStatus({ phase: "search", done: 0, total: chosen.length });
    const found: Role[] = [];
    const bad: string[] = [];
    await pool(chosen, 5, async (b) => {
      try { found.push(...(await fetchBoard(b, usOnly, ac.signal))); }
      catch (e) { if (!ac.signal.aborted) bad.push(b.label); }
      if (ac.signal.aborted) return;
      setResults([...found]);
      setStatus((s) => ({ ...s, done: s.done + 1 }));
    });
    if (ac.signal.aborted) return;
    setFailed(bad);

    // Greenhouse lists carry no description. Read the best candidates so their skill match is real.
    const top = found
      .map((r) => ({ r, fit: scoreFit(r, profile, weights).fit }))
      .filter((x) => x.r.ext && !x.r.descriptionLoaded)
      .sort((a, b) => b.fit - a.fit).slice(0, ENRICH_TOP).map((x) => x.r);
    setStatus({ phase: "read", done: 0, total: top.length });
    await pool(top, 6, async (r) => {
      try {
        const d = await fetchGreenhouseDetails(r.ext!.slug, r.ext!.id, r.company, ac.signal);
        if (ac.signal.aborted) return;
        setResults((cur) => cur.map((x) => (x.id === r.id ? { ...x, ...d, descriptionLoaded: true } : x)));
      } catch { /* a missing description just leaves the title-only score */ }
      if (!ac.signal.aborted) setStatus((s) => ({ ...s, done: s.done + 1 }));
    });
    if (!ac.signal.aborted) setStatus((s) => ({ ...s, phase: "done" }));
  }, [boards, picked, usOnly, profile, weights]);

  // "Find my matches" elsewhere in the app bumps runSignal to start a search.
  const lastSignal = useRef(0);
  useEffect(() => {
    if (runSignal > lastSignal.current) { lastSignal.current = runSignal; void run(); }
  }, [runSignal, run]);
  useEffect(() => () => abort.current?.abort(), []);

  const scored: Scored[] = useMemo(
    () => results.map((r) => ({ ...r, ...scoreFit(r, profile, weights) })).sort((a, b) => b.fit - a.fit),
    [results, profile, weights],
  );
  const shown = scored.filter((r) =>
    r.fit >= minFit && (!remoteOnly || r.remote) &&
    (!query || `${r.title} ${r.company} ${r.location}`.toLowerCase().includes(query.toLowerCase())));
  const strong = scored.filter((r) => r.fit >= STRONG).length;

  // What-if: which missing skill, if learned, would turn the most roles into strong matches?
  const gaps = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of scored) {
      if (r.fit < 45) continue;
      for (const k of matchDetail(r, profile).missing) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, roles]) => {
      const withSkill = { ...profile, skills: [...profile.skills, skill] };
      const unlocked = scored.filter((r) => r.fit < STRONG && scoreFit(r, withSkill, weights).fit >= STRONG).length;
      return { skill, roles, unlocked };
    }).filter((g) => g.roles > 0);
  }, [scored, profile, weights]);

  const addBoard = () => {
    const slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) return;
    const b: Board = { source: customSource, slug, label: slug.charAt(0).toUpperCase() + slug.slice(1) };
    if (!boards.some((x) => keyOf(x) === keyOf(b))) setBoards([...boards, b]);
    setPicked(new Set(picked).add(keyOf(b)));
    setCustomSlug("");
  };

  const busy = status.phase === "search" || status.phase === "read";

  return (
    <div className="space-y-6">
      <section className={`${card} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Search live job boards</h2>
            <p className="text-sm text-neutral-500">Reads real postings straight from each company's public board. Nothing about you is sent.</p>
          </div>
          <button className={btn} onClick={() => void run()} disabled={busy || picked.size === 0}>
            {busy ? (status.phase === "search" ? `Searching ${status.done}/${status.total}...` : `Reading descriptions ${status.done}/${status.total}...`) : "Search now"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {boards.map((b) => {
            const on = picked.has(keyOf(b));
            return (
              <button key={keyOf(b)} aria-pressed={on} onClick={() => { const n = new Set(picked); if (on) n.delete(keyOf(b)); else n.add(keyOf(b)); setPicked(n); }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"}`}>
                {b.label}
              </button>
            );
          })}
        </div>
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
              <div className="text-sm text-neutral-500">strong matches (70%+) out of {scored.length} roles found</div>
              {failed.length > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Could not reach: {failed.join(", ")}. Check the board name.</p>}
            </section>
            <section className={`${card} space-y-3 p-4 text-sm`}>
              <input className={input} placeholder="Filter by title, company, place" value={query} onChange={(e) => setQuery(e.target.value)} />
              <label className="flex items-center gap-2"><input type="checkbox" checked={usOnly} onChange={(e) => setUsOnly(e.target.checked)} className="accent-neutral-900" /> US locations only <span className="text-xs text-neutral-400">(next search)</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-neutral-900" /> Remote only</label>
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
                return (
                  <li key={r.id} className={`${card} overflow-hidden`}>
                    <div className="flex items-start gap-3 p-3.5">
                      <button className="flex min-w-0 flex-1 items-start gap-3 text-left" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                        <div className="w-12 shrink-0 text-center"><FitPill fit={r.fit} /><div className="mt-0.5 text-[10px] text-neutral-400">match</div></div>
                        <div className="min-w-0">
                          <div className="font-medium leading-snug">{r.title}</div>
                          <div className="text-sm text-neutral-500">{r.company} · {r.remote ? "Remote" : r.location || "Location not listed"}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-400">
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
                    {isOpen && <div className="border-t border-neutral-100 p-4 dark:border-neutral-800"><MatchDetail role={r} result={r} profile={profile} /></div>}
                  </li>
                );
              })}
            </ul>
            {shown.length === 0 && !busy && <p className="py-10 text-center text-sm text-neutral-500">No roles match these filters. Lower the minimum match or pick more boards.</p>}
            {shown.length > 80 && <p className="mt-3 text-center text-xs text-neutral-400">Showing the best 80 of {shown.length}.</p>}
          </div>
        </div>
      )}

      {status.phase === "idle" && (
        <p className="py-8 text-center text-sm text-neutral-500">Pick boards and press Search now. Roles come back ranked by how well you match.</p>
      )}
    </div>
  );
}
