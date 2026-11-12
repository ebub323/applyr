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
];

/** Where a posting came from. Each source has a different cost to apply. */
export type Source =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "handshake"
  | "indeed";

export interface Role {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: Source;
  postedAt: string;
  appliedAt?: string;
  stage: Stage;
  /** 0-100, computed — never hand-entered. See scoreFit. */
  fit: number;
  reasons: string[];
  keywords: string[];
  salaryMin?: number;
  salaryMax?: number;
  outcome?: string;
}

/** The candidate profile the scorer matches against. */
export interface Profile {
  skills: string[];
  /** Titles worth applying to, strongest first. */
  wantTitles: string[];
  /** Hard filters. */
  maxCommuteMinutes: number;
  willRelocate: boolean;
  homeMetro: string;
  minHourly: number;
}
