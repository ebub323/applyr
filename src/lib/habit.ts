import { APPLIED_STAGES, type Role } from "./types";

const DAY = 86_400_000;
const midnight = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((midnight(toIso) - midnight(fromIso)) / DAY);
}

/**
 * Consecutive days with at least one application, counted back from today.
 * A day with nothing yet does not break the streak until the day is over, so
 * the count starts from yesterday when today is still empty.
 */
export function streak(appliedDates: string[], today: string): number {
  const days = new Set(appliedDates);
  let cursor = midnight(today);
  if (!days.has(today)) cursor -= DAY;
  let n = 0;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) { n++; cursor -= DAY; }
  return n;
}

/** Applications that have gone a week with no reply and have not been chased in a week. */
export function followUpsDue(roles: Role[], today: string, afterDays = 7): Role[] {
  return roles.filter((r) => {
    if (r.stage !== "applied" || !r.appliedAt) return false;
    if (daysBetween(r.appliedAt, today) < afterDays) return false;
    return !r.followedUpAt || daysBetween(r.followedUpAt, today) >= afterDays;
  });
}

/** Posted on or after the previous search day, so it is new to this person. */
export function isNewSince(role: Pick<Role, "postedAt">, previousSearchDate: string | undefined): boolean {
  return !!previousSearchDate && !!role.postedAt && role.postedAt >= previousSearchDate;
}

export interface QueueItem<T extends Role> { role: T; tracked: boolean }

/**
 * Today's work: the best roles not yet applied to, sized to what is left of the
 * daily goal. Roles already on the board but not applied come back in too.
 */
export function buildQueue<T extends Role & { fit: number }>(
  candidates: T[], board: Role[], goal: number, appliedToday: number, skipped: Set<string>, minFit = 55,
): QueueItem<T>[] {
  const remaining = Math.max(0, goal - appliedToday);
  const onBoard = new Map(board.map((r) => [r.id, r]));
  return candidates
    .filter((c) => c.fit >= minFit && !skipped.has(c.id))
    .filter((c) => { const b = onBoard.get(c.id); return !b || !(APPLIED_STAGES.includes(b.stage) || b.stage === "closed"); })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, remaining)
    .map((role) => ({ role, tracked: onBoard.has(role.id) }));
}
