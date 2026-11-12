import type { Profile, Role, Source } from "./types";

/**
 * Fit scoring.
 *
 * The point of this function is that applying is not free. At 50 applications a
 * day the scarce resource is attention, not volume, so every posting gets a
 * score and the queue is worked in score order. A score is always explainable:
 * it returns the reasons alongside the number, because a score you cannot
 * explain is a score you cannot debug.
 *
 * Weights are deliberately blunt. A fancier model would overfit a dataset of a
 * few hundred applications, and I would not be able to tell you why it ranked
 * something first.
 */

const SOURCE_FRICTION: Record<Source, number> = {
  // Cost to apply, 0 (trivial) to 1 (painful). Workday makes you build an
  // account and retype your whole history per employer; Greenhouse does not.
  greenhouse: 0.1,
  lever: 0.1,
  ashby: 0.15,
  handshake: 0.2,
  indeed: 0.35,
  workday: 0.8,
};

export interface FitResult {
  fit: number;
  reasons: string[];
}

export function scoreFit(
  role: Pick<
    Role,
    "title" | "keywords" | "remote" | "location" | "source" | "salaryMin" | "postedAt"
  >,
  profile: Profile,
): FitResult {
  const reasons: string[] = [];
  let score = 50;

  // --- Title match. The strongest single signal. ---
  const title = role.title.toLowerCase();
  const titleHit = profile.wantTitles.findIndex((t) =>
    title.includes(t.toLowerCase()),
  );
  if (titleHit === 0) {
    score += 22;
    reasons.push(`Title is a direct match for "${profile.wantTitles[0]}"`);
  } else if (titleHit > 0) {
    score += 14;
    reasons.push(`Title matches "${profile.wantTitles[titleHit]}"`);
  } else if (/\b(senior|staff|principal|lead|manager|director|iii|iv)\b/.test(title)) {
    score -= 30;
    reasons.push("Seniority above entry level — unlikely to convert");
  }

  // --- Skill overlap, capped so a keyword-stuffed posting cannot run away. ---
  const kw = role.keywords.map((k) => k.toLowerCase());
  const overlap = profile.skills.filter((s) => kw.includes(s.toLowerCase()));
  if (overlap.length) {
    const bonus = Math.min(18, overlap.length * 5);
    score += bonus;
    reasons.push(`Shares ${overlap.length} skills: ${overlap.slice(0, 4).join(", ")}`);
  }

  // --- Location. A hard filter, not a soft penalty. ---
  if (role.remote) {
    score += 10;
    reasons.push("Remote — no commute constraint");
  } else if (role.location.includes(profile.homeMetro)) {
    score += 8;
    reasons.push(`In ${profile.homeMetro}`);
  } else if (!profile.willRelocate) {
    score -= 35;
    reasons.push("Outside home metro and relocation is off");
  }

  // --- Pay floor. ---
  if (role.salaryMin != null && role.salaryMin < profile.minHourly) {
    score -= 15;
    reasons.push(`Below the $${profile.minHourly}/hr floor`);
  }

  // --- Staleness. A 90-day-old posting is usually already filled. ---
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(role.postedAt).getTime()) / 86_400_000),
  );
  if (ageDays > 60) {
    score -= 12;
    reasons.push(`Posted ${ageDays} days ago — likely stale`);
  } else if (ageDays <= 7) {
    score += 6;
    reasons.push("Posted this week");
  }

  // --- Friction. Cheap applications are worth more per unit of effort. ---
  const friction = SOURCE_FRICTION[role.source];
  score -= Math.round(friction * 12);
  if (friction >= 0.8) reasons.push("High-friction portal — costs a full account setup");

  return { fit: Math.max(0, Math.min(100, Math.round(score))), reasons };
}
