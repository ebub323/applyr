export type Stage =
  | "found"
  | "account_ready"
  | "applied"
  | "recruiter_reply"
  | "interview"
  | "offer"
  | "closed";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "found", label: "Found" },
  { id: "account_ready", label: "Account ready" },
  { id: "applied", label: "Applied" },
  { id: "recruiter_reply", label: "Recruiter reply" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "closed", label: "Closed" },
];

/** Stages at or beyond "applied": an application exists. */
export const APPLIED_STAGES: Stage[] = ["applied", "recruiter_reply", "interview", "offer"];
/** Stages where a human replied. */
export const REPLIED_STAGES: Stage[] = ["recruiter_reply", "interview", "offer"];

/** Where a posting came from. Each source has a different cost to apply. */
export type Source =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "handshake"
  | "indeed"
  | "manual";

export interface Role {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: Source;
  postedAt?: string;
  appliedAt?: string;
  url?: string;
  stage: Stage;
  keywords: string[];
  /** Hourly dollars, or annual dollars when over 1000. */
  salaryMin?: number;
  notes: string;
  outcome?: string;
  /** Lets a board-sourced role fetch its full description later. */
  /** Hard requirements spotted in the posting text. */
  flags?: ("citizenship" | "clearance")[];
  ext?: { slug: string; id: string };
  descriptionLoaded?: boolean;
}

/** The candidate profile every posting is scored against. */
export interface Profile {
  skills: string[];
  /** Titles worth applying to, strongest first. */
  wantTitles: string[];
  /** Comma-separated place names that count as home, e.g. "Baltimore, DC". */
  homeMetro: string;
  willRelocate: boolean;
  minHourly: number;
  /** Role kinds the person is aiming at (ids from resume.ts TARGET_OPTIONS). */
  targets: string[];
  /** Able to meet a US citizenship requirement. */
  usCitizen: boolean;
  hasClearance: boolean;
}

/** Multipliers on each scoring factor. 1 is the default, 0 switches a factor off. */
export interface Weights {
  title: number;
  skills: number;
  location: number;
  pay: number;
  freshness: number;
  friction: number;
  eligibility: number;
}
