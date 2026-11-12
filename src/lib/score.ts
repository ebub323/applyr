import type { Profile, Role, Source, Weights } from "./types";

/**
 * Fit scoring.
 *
 * At 50 applications a day the scarce resource is attention, not volume, so
 * every posting gets a score and the queue is worked in score order. A score is
 * always explainable: it returns each factor's contribution alongside the
 * number, because a score you cannot explain is a score you cannot debug.
 *
 * The weights are multipliers on the factors, so they can be tuned in the UI
 * and the whole board re-ranks. They are deliberately blunt: a learned model
 * over a few hundred applications would overfit and could not be explained.
 */

export const DEFAULT_WEIGHTS: Weights = {
  title: 1, skills: 1, location: 1, pay: 1, freshness: 1, friction: 1, eligibility: 1,
};

/** Cost to apply, 0 (trivial) to 1 (painful). Workday makes you rebuild an account per employer. */
export const SOURCE_FRICTION: Record<Source, number> = {
  greenhouse: 0.1,
  lever: 0.1,
  ashby: 0.15,
  handshake: 0.2,
  manual: 0.3,
  indeed: 0.35,
  other: 0.5,
  workday: 0.8,
};

export interface Factor {
  key: keyof Weights;
  label: string;
  /** Points added to (or taken from) the base score, after the weight. */
  delta: number;
  note: string;
}

export interface FitResult {
  fit: number;
  factors: Factor[];
  /** The factors that moved the score, biggest first, as sentences. */
  reasons: string[];
}

type Scorable = Pick<
  Role,
  "title" | "keywords" | "remote" | "location" | "source" | "salaryMin" | "postedAt" | "flags"
>;

const ENTRY = /\b(intern|interns|internship|new\s?grad|university\s?grad|entry[\s-]level|junior|apprentice|associate)\b/i;
const ENG = /\b(software|engineer|engineering|developer|full[\s-]?stack|back[\s-]?end|front[\s-]?end|platform|infrastructure|web)\b/i;
/** "Engineer" in the title but not software: sales, solutions, support, finance, design. */
export const NON_SWE = /\b(solutions?|sales|account|customer|support|field|recruit\w*|marketing|legal|finance|accounting|design(er)?|analyst|operations|people|talent)\b/i;
const SENIOR = /\b(senior|staff|principal|lead|manager|director|head\s+of|vp|iii|iv)\b/i;

/** Starting point. Kept below 50 so a strong role lands in the 80s and 90s, leaving room to tell the best from the good. */
export const BASE = 40;

function hourly(salary: number): number {
  return salary > 1000 ? salary / 2080 : salary;
}

export function scoreFit(
  role: Scorable,
  profile: Profile,
  weights: Weights = DEFAULT_WEIGHTS,
  now: number = Date.now(),
): FitResult {
  const factors: Factor[] = [];
  const add = (key: keyof Weights, label: string, raw: number, note: string) => {
    const delta = Math.round(raw * weights[key]);
    if (raw !== 0) factors.push({ key, label, delta, note });
  };

  // --- Title. The strongest single signal. ---
  const title = role.title.toLowerCase();
  const wantIdx = profile.wantTitles.findIndex((t) => t.trim() && title.includes(t.trim().toLowerCase()));
  if (SENIOR.test(role.title)) {
    add("title", "Title", -30, "Seniority above entry level, unlikely to convert");
  } else if (NON_SWE.test(role.title)) {
    add("title", "Title", -12, "Not a software engineering role");
  } else if (wantIdx === 0 || (wantIdx < 0 && ENTRY.test(role.title) && ENG.test(role.title))) {
    add("title", "Title", 22, wantIdx === 0 ? `Matches your top target "${profile.wantTitles[0]}"` : "Entry-level engineering title");
  } else if (wantIdx > 0) {
    add("title", "Title", 14, `Matches your target "${profile.wantTitles[wantIdx]}"`);
  }

  // --- Skill overlap, capped so a keyword-stuffed posting cannot run away. ---
  const kw = new Set(role.keywords.map((k) => k.toLowerCase()));
  const overlap = profile.skills.filter((s) => kw.has(s.trim().toLowerCase()));
  if (overlap.length) {
    add("skills", "Skills", Math.min(18, overlap.length * 5), `Shares ${overlap.length}: ${overlap.slice(0, 4).join(", ")}`);
  }

  // --- Location. A hard-ish filter, not a soft nudge. ---
  const metros = profile.homeMetro.split(",").map((m) => m.trim().toLowerCase()).filter(Boolean);
  const loc = role.location.toLowerCase();
  if (role.remote) {
    add("location", "Location", 10, "Remote, no commute or move");
  } else if (metros.some((m) => loc.includes(m))) {
    add("location", "Location", 8, `In your home area (${profile.homeMetro})`);
  } else if (!profile.willRelocate) {
    add("location", "Location", -35, "Outside your home area and relocation is off");
  } else {
    add("location", "Location", -4, "Needs relocation for the term");
  }

  // --- Pay floor, when the posting states one. ---
  if (role.salaryMin != null && hourly(role.salaryMin) < profile.minHourly) {
    add("pay", "Pay", -15, `Below your $${profile.minHourly}/hr floor`);
  }

  // --- Staleness. A 90-day-old posting is usually already filled. ---
  if (role.postedAt) {
    const age = Math.max(0, Math.floor((now - new Date(role.postedAt).getTime()) / 86_400_000));
    if (age > 60) add("freshness", "Freshness", -12, `Posted ${age} days ago, likely stale`);
    else if (age <= 7) add("freshness", "Freshness", 6, "Posted this week");
  }

  // --- Eligibility. A hard requirement outranks every skill. ---
  if (role.flags?.includes("citizenship") && !profile.usCitizen) {
    add("eligibility", "Eligibility", -40, "Requires US citizenship");
  } else if (role.flags?.includes("clearance") && !profile.hasClearance) {
    add("eligibility", "Eligibility", -6, "Mentions a security clearance (often sponsored for interns)");
  }

  // --- Friction. Cheap applications are worth more per unit of effort. ---
  const friction = SOURCE_FRICTION[role.source];
  const frictionRaw = -Math.round(friction * 12);
  if (frictionRaw !== 0) {
    add("friction", "Portal", frictionRaw, friction >= 0.8 ? "High-friction portal, costs a full account setup" : "Low-friction portal");
  }

  const fit = Math.max(0, Math.min(100, BASE + factors.reduce((s, f) => s + f.delta, 0)));
  const reasons = [...factors]
    .filter((f) => f.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .map((f) => f.note);
  return { fit, factors, reasons };
}

/** How a posting's named skills line up with what the person has. */
export function matchDetail(role: Pick<Role, "keywords">, profile: Profile) {
  const mine = new Set(profile.skills.map((s) => s.trim().toLowerCase()));
  const have = role.keywords.filter((k) => mine.has(k.toLowerCase()));
  const missing = role.keywords.filter((k) => !mine.has(k.toLowerCase()));
  return { have, missing, coverage: role.keywords.length ? have.length / role.keywords.length : null };
}
