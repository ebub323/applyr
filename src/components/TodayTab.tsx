"use client";
import { coverNote, followUpNote } from "@/lib/kit";
import { daysBetween, type QueueItem } from "@/lib/habit";
import type { Profile, Role } from "@/lib/types";
import type { Scored } from "./Board";
import CopyButton from "./CopyButton";
import { btn, btnGhost, card, FitPill } from "./ui";

/** The day's work: what is left of the goal, who to chase, and how the streak is going. */
export default function TodayTab({ queue, followUps, goal, appliedToday, streakDays, appliedThisWeek, profile, today, onApply, onSkip, onFollowedUp, onOpenDiscover }: {
  queue: QueueItem<Scored>[]; followUps: Role[]; goal: number; appliedToday: number; streakDays: number; appliedThisWeek: number;
  profile: Profile; today: string;
  onApply: (r: Scored) => void; onSkip: (id: string) => void; onFollowedUp: (id: string) => void; onOpenDiscover: () => void;
}) {
  const pct = Math.min(100, Math.round((appliedToday / Math.max(1, goal)) * 100));
  const done = appliedToday >= goal;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="lift anim-up rounded-2xl bg-slate-900 p-5 text-white shadow-sm">
          <div className="text-4xl font-extrabold tabular-nums">{appliedToday}<span className="text-xl font-medium opacity-70"> / {goal}</span></div>
          <div className="text-sm font-medium opacity-90">{done ? "Goal reached. Nice work." : `${goal - appliedToday} to go today`}</div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="lift anim-up rounded-2xl bg-amber-500 p-5 text-white shadow-sm [animation-delay:70ms]">
          <div className="text-4xl font-extrabold tabular-nums">{streakDays}<span className="text-xl font-medium opacity-70"> day{streakDays === 1 ? "" : "s"}</span></div>
          <div className="text-sm font-medium opacity-90">{streakDays ? "Current streak" : "Apply to one role to start a streak"}</div>
        </div>
        <div className="lift anim-up rounded-2xl bg-sky-600 p-5 text-white shadow-sm [animation-delay:140ms]">
          <div className="text-4xl font-extrabold tabular-nums">{appliedThisWeek}</div>
          <div className="text-sm font-medium opacity-90">applications in the last 7 days</div>
        </div>
      </div>

      {followUps.length > 0 && (
        <section className={`${card} p-5`}>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Follow up <span className="font-mono">{followUps.length}</span></h2>
          <p className="mt-1 text-xs text-neutral-500">Applied a week or more ago with no reply. A short note is worth sending.</p>
          <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">
            {followUps.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1 basis-56"><div className="truncate font-medium">{r.title}</div><div className="text-xs text-neutral-500">{r.company} · applied {daysBetween(r.appliedAt!, today)} days ago</div></div>
                <CopyButton text={followUpNote(profile.kit, r, r.appliedAt!)} label="Copy note" />
                <button className={btnGhost} onClick={() => onFollowedUp(r.id)}>Done</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Today&rsquo;s queue <span className="font-mono">{queue.length}</span></h2>
          <button className={btnGhost} onClick={onOpenDiscover}>Search for more</button>
        </div>
        {queue.length === 0 ? (
          <div className={`${card} p-10 text-center text-sm text-slate-950/60 dark:text-slate-100/60`}>
            {done ? "You hit today's goal. Come back tomorrow, or raise the goal above." : "Nothing queued. Run a search so your best matches land here."}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {queue.map(({ role: r, tracked }) => (
              <li key={r.id} className={`${card} lift anim-up flex flex-wrap items-center gap-3 p-3.5`}>
                <div className="w-12 shrink-0 text-center"><FitPill fit={r.fit} /></div>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="truncate font-medium">{r.title}</div>
                  <div className="truncate text-sm text-neutral-500">{r.company} · {r.remote ? "Remote" : r.location || "Location not listed"}{tracked ? " · on your board" : ""}</div>
                </div>
                <CopyButton text={coverNote(profile.kit, r, profile)} label="Cover note" />
                <button className={btn} onClick={() => onApply(r)}>Open and mark applied</button>
                <button className={btnGhost} onClick={() => onSkip(r.id)} aria-label={`Skip ${r.title}`}>Skip</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
