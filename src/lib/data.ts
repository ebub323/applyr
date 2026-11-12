import { EMPTY_KIT, type Profile, type Role } from "./types";

export const DEFAULT_PROFILE: Profile = {
  skills: ["TypeScript", "React", "Python", "Java", "C++", "C#", "SQL", "PostgreSQL", "Supabase", "AWS", "Git", "Docker", "Next.js", "HTML", "CSS"],
  wantTitles: ["Software Engineer Intern", "Software Engineering Intern", "Software Developer Intern", "Junior Software", "New Grad"],
  homeMetro: "Baltimore, Washington, DC, Maryland",
  willRelocate: true,
  minHourly: 18,
  targets: ["swe", "backend", "web"],
  usCitizen: true,
  hasClearance: false,
  kit: EMPTY_KIT,
};

/** Starter data so the board is not empty on first load. Clearable from the UI. */
const r = (id: string, title: string, company: string, location: string, source: Role["source"], stage: Role["stage"],
  keywords: string[], extra: Partial<Role> = {}): Role => ({
  id, title, company, location, remote: /remote/i.test(location), source, stage, keywords, notes: "",
  postedAt: "2026-11-08", ...extra,
});

export const SEED_ROLES: Role[] = [
  r("s1", "Software Engineer Intern", "T. Rowe Price", "Baltimore, MD", "workday", "interview", ["Java", "SQL", "Git", "React"], { appliedAt: "2026-11-07", salaryMin: 28 }),
  r("s2", "Software Engineering Intern", "Stripe", "Remote, US", "greenhouse", "applied", ["TypeScript", "React", "PostgreSQL"], { appliedAt: "2026-11-10", salaryMin: 45 }),
  r("s3", "Junior Software Developer", "Johns Hopkins APL", "Laurel, MD", "workday", "recruiter_reply", ["Python", "C++", "Git"], { appliedAt: "2026-11-05", salaryMin: 32 }),
  r("s4", "Software Developer Intern", "Under Armour", "Baltimore, MD", "lever", "applied", ["TypeScript", "React", "AWS"], { appliedAt: "2026-11-11", salaryMin: 25 }),
  r("s5", "Software Engineer Intern", "Vercel", "Remote, US", "ashby", "account_ready", ["TypeScript", "Next.js", "React"], { salaryMin: 42 }),
  r("s6", "Backend Engineering Intern", "Plaid", "Remote, US", "greenhouse", "applied", ["Python", "PostgreSQL", "SQL"], { appliedAt: "2026-11-09", salaryMin: 44 }),
  r("s7", "Full Stack Developer Intern", "Fearless", "Baltimore, MD", "lever", "found", ["TypeScript", "React", "PostgreSQL", "AWS"], { salaryMin: 24 }),
  r("s8", "Platform Engineering Intern", "Datadog", "Remote, US", "greenhouse", "found", ["Python", "AWS", "SQL"], { salaryMin: 43 }),
  r("s9", "IT Intern, Development", "Harford Mutual Insurance", "Bel Air, MD", "indeed", "closed", ["SQL", "Git"], { postedAt: "2026-09-01", appliedAt: "2026-09-04", salaryMin: 15.5, outcome: "Rejected" }),
  r("s10", "Senior Staff Engineer III", "CrowdStrike", "Sunnyvale, CA", "workday", "closed", ["AWS"], { postedAt: "2026-11-02", outcome: "Filtered out: seniority" }),
];
