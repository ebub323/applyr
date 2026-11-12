import { scoreFit } from "./score";
import type { Profile, Role, Stage, Source } from "./types";

export const profile: Profile = {
  skills: [
    "TypeScript", "React", "Python", "Java", "C++", "SQL", "Postgres",
    "Supabase", "AWS", "Git", "React Native", "Next.js",
  ],
  wantTitles: [
    "Software Engineer Intern",
    "Software Engineering Intern",
    "Junior Software Developer",
    "Software Developer Intern",
    "Associate Software Engineer",
  ],
  maxCommuteMinutes: 25,
  willRelocate: false,
  homeMetro: "Baltimore",
  minHourly: 18,
};

/**
 * Demo dataset. This is the public portfolio build, so it ships with
 * representative postings rather than a live application history — the real
 * run writes to a private Postgres and is not exposed here.
 */
type Seed = Omit<Role, "fit" | "reasons">;

const seed: Seed[] = [
  { id: "r1",  title: "Software Engineer Intern", company: "T. Rowe Price", location: "Baltimore, MD", remote: false, source: "workday",    postedAt: "2026-11-06", stage: "interview",       appliedAt: "2026-11-07", keywords: ["Java","SQL","Git","React"], salaryMin: 28, salaryMax: 34 },
  { id: "r2",  title: "Software Engineering Intern", company: "Stripe", location: "Remote, US", remote: true,  source: "greenhouse",  postedAt: "2026-11-09", stage: "applied",         appliedAt: "2026-11-10", keywords: ["TypeScript","React","Postgres"], salaryMin: 45, salaryMax: 55 },
  { id: "r3",  title: "Junior Software Developer", company: "Johns Hopkins APL", location: "Laurel, MD", remote: false, source: "workday", postedAt: "2026-11-04", stage: "recruiter_reply", appliedAt: "2026-11-05", keywords: ["Python","C++","Git"], salaryMin: 32, salaryMax: 40 },
  { id: "r4",  title: "Software Developer Intern", company: "Under Armour", location: "Baltimore, MD", remote: false, source: "lever",     postedAt: "2026-11-10", stage: "applied",         appliedAt: "2026-11-11", keywords: ["TypeScript","React","AWS"], salaryMin: 25, salaryMax: 30 },
  { id: "r5",  title: "Associate Software Engineer", company: "Capital One", location: "McLean, VA", remote: false, source: "workday",     postedAt: "2026-11-02", stage: "applied",         appliedAt: "2026-11-03", keywords: ["Java","AWS","SQL"], salaryMin: 38 },
  { id: "r6",  title: "Software Engineer Intern", company: "Vercel", location: "Remote, US", remote: true,  source: "ashby",             postedAt: "2026-11-11", stage: "account_ready",   keywords: ["TypeScript","Next.js","React"], salaryMin: 42 },
  { id: "r7",  title: "Backend Engineering Intern", company: "Plaid", location: "Remote, US", remote: true,  source: "greenhouse",       postedAt: "2026-11-08", stage: "applied",         appliedAt: "2026-11-09", keywords: ["Python","Postgres","SQL"], salaryMin: 44 },
  { id: "r8",  title: "IT Intern, Development", company: "Harford Mutual Insurance", location: "Bel Air, MD", remote: false, source: "indeed", postedAt: "2026-09-01", stage: "closed", appliedAt: "2026-09-04", keywords: ["SQL","Git"], salaryMin: 15.5, salaryMax: 23, outcome: "Rejected" },
  { id: "r9",  title: "Mobile Engineering Intern", company: "Duolingo", location: "Pittsburgh, PA", remote: false, source: "greenhouse",  postedAt: "2026-11-05", stage: "found",           keywords: ["React Native","TypeScript"], salaryMin: 40 },
  { id: "r10", title: "Senior Staff Engineer III", company: "CrowdStrike", location: "Sunnyvale, CA", remote: true, source: "workday",    postedAt: "2026-11-02", stage: "closed",          keywords: ["Go","AWS"], salaryMin: 55, outcome: "Filtered out — seniority" },
  { id: "r11", title: "Software Engineer Intern", company: "Northrop Grumman", location: "Linthicum, MD", remote: false, source: "workday", postedAt: "2026-11-07", stage: "account_ready", keywords: ["C++","Python","Git"], salaryMin: 30 },
  { id: "r12", title: "Full Stack Developer Intern", company: "Fearless", location: "Baltimore, MD", remote: false, source: "lever",      postedAt: "2026-11-10", stage: "found",           keywords: ["TypeScript","React","Postgres","AWS"], salaryMin: 24 },
  { id: "r13", title: "Software Engineering Intern", company: "Bloomberg", location: "New York, NY", remote: false, source: "workday",    postedAt: "2026-10-28", stage: "found",           keywords: ["C++","Python","SQL"], salaryMin: 50 },
  { id: "r14", title: "Platform Engineering Intern", company: "Datadog", location: "Remote, US", remote: true, source: "greenhouse",      postedAt: "2026-11-11", stage: "found",           keywords: ["Python","AWS","SQL"], salaryMin: 43 },
  { id: "r15", title: "Software Developer Intern", company: "Maryland DoIT", location: "Baltimore, MD", remote: false, source: "handshake", postedAt: "2026-11-09", stage: "applied",        appliedAt: "2026-11-10", keywords: ["Java","SQL","Git"], salaryMin: 20 },
];

/** Scores are computed, not stored. Changing the scorer re-ranks the board. */
export const roles: Role[] = seed
  .map((r) => ({ ...r, ...scoreFit(r, profile) }))
  .sort((a, b) => b.fit - a.fit);

export function byStage(stage: Stage): Role[] {
  return roles.filter((r) => r.stage === stage);
}

export const SOURCE_LABEL: Record<Source, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workday: "Workday",
  handshake: "Handshake",
  indeed: "Indeed",
};
