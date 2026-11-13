import { FIELDS } from "./fields";
import { extractKeywords } from "./keywords";

/**
 * Rule-based resume analysis. No model, no network: every point awarded or
 * withheld traces to a visible check, so the grade can be argued with and
 * fixed rather than just trusted.
 */
export type SectionId = "education" | "experience" | "projects" | "skills" | "certifications" | "leadership";

const HEADINGS: Record<SectionId, RegExp> = {
  education: /^(education|academic background)$/i,
  experience: /^((work|professional|relevant) )?(experience|employment|work history)$/i,
  projects: /^((personal|selected|technical|academic) )?projects?$/i,
  skills: /^((technical|core) )?(skills|technologies)( (and|&) .*)?$/i,
  certifications: /^(certifications?|licenses?( (and|&) certifications?)?)$/i,
  leadership: /^(leadership( (and|&) activities)?|activities|extracurriculars?|involvement)$/i,
};

const ACTION_VERBS = new Set(
  ("built designed developed implemented created led managed deployed automated wrote shipped reduced increased improved analyzed " +
   "diagnosed resolved collapsed deduplicated architected engineered launched optimized migrated integrated configured maintained " +
   "established coordinated organized presented researched tested debugged refactored documented trained mentored delivered " +
   "performed repaired installed modeled modelled specified planned scheduled tracked monitored secured administered " +
   "ingested weighted wired spearheaded owned drove improved cut grew generated processed completed contributed collaborated " +
   "participated manage treasurer " +
   "served supported sold provided handled cared treated educated taught tutored supervised opened closed balanced reconciled prepared " +
   "negotiated recruited hired onboarded stocked cleaned operated drove assembled inspected processed advised counseled assessed " +
   "answered resolved greeted cooked baked scheduled dispatched audited filed invoiced budgeted forecasted promoted wrote edited " +
   "photographed filmed produced hosted raised sourced screened interviewed enrolled administered").split(" "),
);

const WEAK = [
  /responsible for/i, /\bhelped( with)?\b/i, /assisted (with|in)\b/i, /worked on\b/i, /duties included/i,
  /team player/i, /hard[- ]working/i, /references (available|upon)/i, /\bvarious\b/i,
];

/** skill -> the kind of role it points at */
const DOMAINS = FIELDS;

export interface Check {
  id: string;
  group: "ats" | "impact" | "technical" | "completeness";
  label: string;
  earned: number;
  max: number;
  detail: string;
  fix?: string;
}

export interface Target { id: string; label: string; titles: string[]; strength: number; /** Why the resume points here, in plain words. */ evidence: string[] }

export interface ResumeAnalysis {
  empty: boolean;
  wordCount: number;
  email?: string; phone?: string; linkedin?: string; github?: string;
  sections: Record<SectionId, boolean>;
  bullets: string[];
  actionVerbBullets: number;
  quantifiedBullets: number;
  weakPhrases: string[];
  skills: string[];
  gradYear?: number;
  gpa?: number;
  isStudent: boolean;
  oddCharacters: string[];
  checks: Check[];
  groupScores: Record<Check["group"], { earned: number; max: number }>;
  overall: number;
  grade: string;
  level: string;
  fixes: string[];
  targets: Target[];
  /** Job titles the resume itself states, most recent first. */
  roleTitles: string[];
  bulletReview: BulletReview[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function splitSections(lines: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = { header: [] };
  let cur = "header";
  for (const raw of lines) {
    const t = raw.trim().replace(/:$/, "");
    const id = (Object.keys(HEADINGS) as SectionId[]).find((k) => t.split(/\s+/).length <= 5 && HEADINGS[k].test(t));
    if (id) { cur = id; out[cur] ??= []; continue; }
    (out[cur] ??= []).push(raw);
  }
  return out;
}

function startsWithVerb(b: string): boolean {
  const first = b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return ACTION_VERBS.has(first) || /^[a-z]{3,}ed$/.test(first);
}

/** Neutral stronger openers. Deliberately not "Led" or "Owned": a rewrite must not claim more than was done. */
const WEAK_LEADS: [RegExp, string][] = [
  [/^responsible for\s+/i, "Handled "], [/^helped( with)?\s+/i, "Contributed to "], [/^assisted (with|in)\s+/i, "Supported "],
  [/^worked on\s+/i, "Contributed to "], [/^duties included\s+/i, "Handled "],
];

/** `hard` issues (no verb, filler, length) make a bullet need work. A missing number alone is only a suggestion. */
export interface BulletReview { text: string; issues: string[]; tips: string[]; rewrite?: string; ok: boolean; hard: boolean }

/** What is weak about one bullet, and the smallest honest fix. */
export function reviewBullet(text: string): BulletReview {
  const issues: string[] = []; const tips: string[] = [];
  let rewrite: string | undefined;
  const lead = WEAK_LEADS.find(([re]) => re.test(text));
  if (lead) {
    issues.push("Opens with a filler phrase");
    rewrite = text.replace(lead[0], lead[1]);
    tips.push(`Try opening with "${lead[1].trim()}".`);
  } else if (!startsWithVerb(text)) {
    issues.push("Does not open with an action verb");
    tips.push("Start with a past-tense verb: Built, Designed, Reduced, Shipped.");
  }
  const filler = WEAK.map((re) => text.match(re)?.[0]).find((x): x is string => !!x);
  if (filler && !lead) { issues.push(`Filler: "${filler}"`); tips.push("Say what you actually did instead."); }
  const words = text.trim().split(/\s+/).length;
  if (words < 8) { issues.push("Too short to show impact"); tips.push("Add what it was for and what came of it."); }
  if (words > 32) { issues.push("Long"); tips.push("Split it into two bullets."); }
  const hard = issues.length > 0;
  if (!/\d/.test(text)) { issues.push("No number"); tips.push("Add one: users, rows, endpoints, tests, minutes saved, percent."); }
  return { text, issues, tips, rewrite, ok: issues.length === 0, hard };
}

const GLYPH = /^[•·▪◦●○*\-–—]\s+/;
const LABEL = /^[A-Za-z][A-Za-z &/]{1,30}:\s/;

function looksLikeBullet(line: string): boolean {
  const t = line.trim();
  if (LABEL.test(t)) return false;
  const words = t.split(/\s+/);
  return words.length >= 7 && /^[A-Z]/.test(t) && !/\|/.test(t) && !/\t/.test(t);
}

/**
 * Real bullets when the text carries bullet glyphs (PDFs do), merging a bullet
 * that wrapped onto the next line. Otherwise fall back to sentence-shaped lines
 * (DOCX text loses its glyphs).
 */
function collectBullets(lines: string[], minGlyph = 3): string[] {
  const glyphLed = lines.filter((l) => GLYPH.test(l.trim())).length;
  if (glyphLed >= minGlyph) {
    const out: string[] = [];
    for (const l of lines) {
      const t = l.trim();
      if (GLYPH.test(t)) out.push(t.replace(GLYPH, ""));
      else if (out.length && !LABEL.test(t) && !/20\d\d\s*$/.test(t) && (/^[a-z(]/.test(t) || !/[.!?]$/.test(out[out.length - 1]))) {
        // A wrapped line: it can start with a capital ("SQL migrations..."), so the tell is that the bullet above never ended.
        out[out.length - 1] += " " + t;
      }
    }
    return out;
  }
  return lines.filter(looksLikeBullet).map((l) => l.trim().replace(GLYPH, ""));
}

/** What a degree or field of study points at, by field id. A degree is strong evidence for someone with little work history. */
const MAJORS: Record<string, RegExp> = {
  swe: /computer (science|engineering)|software|information (technology|systems)|informatics/i,
  security: /cyber\s?security|information (assurance|security)|network (security|administration)/i,
  data: /data (science|analytics)|statistics|applied mathematics|analytics/i,
  health: /nursing|health ?(science|care|information)|pre-?med|biology|kinesiology|public health|pharmac\w+|dental|radiolog\w+|respiratory|medical|physical therapy|exercise science|biomedical/i,
  finance: /accounting|finance|economics|banking|actuarial/i,
  marketing: /marketing|communications?|journalism|public relations|advertising|english|mass media/i,
  design: /graphic design|design|film|fine arts|animation|photography|visual arts|multimedia/i,
  education: /education|teaching|early childhood|child development|curriculum|pedagog\w+/i,
  hr: /human resources|organizational (behavior|leadership)|industrial[- ]organizational/i,
  legal: /criminal justice|legal studies|paralegal|political science|pre-?law|\blaw\b/i,
  business: /business (administration|management|analytics)|management|entrepreneurship|project management/i,
  sales: /sales|business administration/i,
  ops: /supply chain|logistics|operations|industrial engineering/i,
  hospitality: /hospitality|culinary|tourism|restaurant|hotel/i,
  trades: /automotive|electrical|hvac|construction|welding|mechanical technology|diesel/i,
  admin: /office (administration|technology)|administrative/i,
  customer: /customer (service|experience)/i,
};

const DATE_TAIL = /\s*\(?\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}.*$|\s*\b(?:19|20)\d\d\s*[-\u2013\u2014]\s*(?:\d{4}|present|current).*$/i;

/** The job titles a resume states: the non-bullet lines of Experience, cut back to the title itself. */
function titleLines(experience: string[]): string[] {
  const out: string[] = [];
  for (const raw of experience) {
    const t = raw.trim();
    if (!t || GLYPH.test(t) || looksLikeBullet(t) || t.length > 110) continue;
    const head = t.replace(DATE_TAIL, "").split("|")[0].split(/\s[-\u2013\u2014]\s/)[0].split(",")[0].trim();
    const words = head.split(/\s+/);
    if (words.length >= 1 && words.length <= 6 && /^[A-Z]/.test(head) && !/\d|@/.test(head)) out.push(head);
  }
  return [...new Set(out)];
}

/**
 * Works out which kinds of work a resume points at. Skills alone cannot do it: a nurse or a barista lists
 * few of the tools a vocabulary can name. So three independent signals vote: the skills, the job titles
 * the person has held, and what they studied. Nothing defaults to software: no signal, no field.
 */
export function detectFields(i: { header: string[]; experience: string[]; education: string; skills: Set<string>; github: boolean }) {
  const roleTitles = titleLines(i.experience);
  const headline = i.header.slice(1, 5).filter((l) => !/[@\d|]/.test(l) && l.split(/\s+/).length <= 8);
  const titleEvidence = [...roleTitles, ...headline];
  const scored = DOMAINS.map((d) => {
    const skillHits = d.skills.filter((s) => i.skills.has(s));
    const skill = skillHits.length / Math.min(9, d.skills.length);
    const titleHit = titleEvidence.filter((t) => d.match.test(t) || d.titles.some((w) => t.toLowerCase().includes(w)));
    const title = Math.min(0.6, titleHit.length * 0.3);
    const major = MAJORS[d.id]?.exec(i.education)?.[0];
    const strength = skill * 0.6 + title + (major ? 0.35 : 0);
    const evidence = [
      titleHit.length ? `job title: ${titleHit[0]}` : "",
      major ? `studied: ${major.toLowerCase()}` : "",
      skillHits.length ? `${skillHits.length} matching skill${skillHits.length === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    return { id: d.id, label: d.label, titles: d.titles, tech: d.tech, strength, evidence };
  }).sort((a, b) => b.strength - a.strength);
  const top = scored[0]?.strength ?? 0;
  const picked = scored.filter((t) => t.strength > 0.3 && t.strength >= top * 0.5).slice(0, 3);
  return {
    targets: picked.map(({ tech: _t, ...t }) => ({ ...t, strength: Math.min(1, t.strength) })) as Target[],
    roleTitles: roleTitles.slice(0, 3),
    topTech: !!picked[0]?.tech,
  };
}

export function parseResume(text: string, now: number = Date.now()): ResumeAnalysis {
  const clean = text.replace(/\r/g, "");
  const lines = clean.split("\n").map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim());
  const words = clean.split(/\s+/).filter(Boolean);
  const sectionsText = splitSections(lines);
  const has = (k: SectionId) => (sectionsText[k]?.length ?? 0) > 0;
  const sections = Object.fromEntries((Object.keys(HEADINGS) as SectionId[]).map((k) => [k, has(k)])) as Record<SectionId, boolean>;

  const email = clean.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = clean.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0];
  const linkedin = clean.match(/linkedin\.com\/in\/[\w-]+/i)?.[0];
  const github = clean.match(/github\.com\/[\w-]+/i)?.[0];

  const bulletSource = ["experience", "projects", "leadership"].flatMap((k) => sectionsText[k] ?? []);
  const bullets = collectBullets(bulletSource);
  const actionVerbBullets = bullets.filter(startsWithVerb).length;
  const quantifiedBullets = bullets.filter((b) => /\d/.test(b)).length;
  const weakPhrases = WEAK.map((re) => clean.match(re)?.[0]).filter((x): x is string => !!x);

  const skills = extractKeywords(clean);

  const eduText = (sectionsText.education ?? []).join(" ");
  const years = [...eduText.matchAll(/\b(20\d\d)\b/g)].map((m) => Number(m[1]));
  const gradYear = years.length ? Math.max(...years) : undefined;
  const gpaRaw = clean.match(/GPA[:\s]*([0-4]\.\d{1,2})/i)?.[1];
  const gpa = gpaRaw ? Number(gpaRaw) : undefined;
  const thisYear = new Date(now).getFullYear();
  const isStudent = /expected|anticipated|candidate/i.test(eduText) || (gradYear !== undefined && gradYear >= thisYear);

  const oddCharacters = [...new Set(clean.match(/[–—‘’“”…]/g) ?? [])];

  const links = [linkedin, github].filter(Boolean).length;
  const bulletN = Math.max(1, bullets.length);
  const verbRatio = bullets.length ? actionVerbBullets / bulletN : 0;
  const quantRatio = bullets.length ? quantifiedBullets / bulletN : 0;
  const standardSections = (["education", "skills"] as SectionId[]).filter(has).length + (has("experience") || has("projects") ? 1 : 0);
  const projectText = (sectionsText.projects ?? []).join(" ");
  const projectLinks = (projectText.match(/github\.com\/|https?:\/\/|\.(com|dev|io|app|run)\b/gi) ?? []).length;

  const mk = (id: string, group: Check["group"], label: string, ratio: number, max: number, detail: string, fix?: string): Check => ({
    id, group, label, earned: Math.round(clamp01(ratio) * max * 10) / 10, max, detail, fix: ratio >= 0.999 ? undefined : fix,
  });

  const have = new Set(skills);
  const { targets, roleTitles, topTech } = detectFields({ header: sectionsText.header ?? [], experience: sectionsText.experience ?? [], education: eduText, skills: have, github: !!github });
  // A resume whose strongest direction is not technical is graded on the things that matter for that work.
  const techy = !!github || !targets[0] || topTech;

  const empty = words.length < 25;
  const checks: Check[] = empty ? [] : [
    mk("contact", "ats", "Email and phone", ((email ? 1 : 0) + (phone ? 1 : 0)) / 2, 8,
      email && phone ? "Both found." : `Missing ${[!email && "email", !phone && "phone"].filter(Boolean).join(" and ")}.`, "Put your email and phone on the first lines."),
    mk("sections", "ats", "Standard section headings", standardSections / 3, 8,
      `${standardSections} of 3 core sections found (Education, Skills, Experience or Projects).`, "Use plain headings an ATS recognises: Education, Skills, Projects, Experience."),
    mk("chars", "ats", "Plain characters", oddCharacters.length === 0 ? 1 : 0.5, 4,
      oddCharacters.length ? `Found ${oddCharacters.length} symbol type(s) (like dashes or curly quotes) that some older parsers garble.` : "No risky symbols.",
      "Swap curly quotes and long dashes for plain ones."),
    mk("length", "ats", "Right length", words.length >= 250 && words.length <= 750 ? 1 : words.length < 250 ? words.length / 250 : Math.max(0.4, 750 / words.length), 5,
      `${words.length} words. Aim for 300 to 650 for a one-page resume.`, words.length < 250 ? "Add detail: bullets with results." : "Trim to one page."),
    techy
      ? mk("links", "ats", "LinkedIn and GitHub", links / 2, 5, links === 2 ? "Both found." : `Missing ${[!linkedin && "LinkedIn", !github && "GitHub"].filter(Boolean).join(" and ")}.`, "Add your LinkedIn and GitHub URLs under your name.")
      : mk("links", "ats", "LinkedIn", linkedin ? 1 : 0, 5, linkedin ? "Found." : "No LinkedIn URL found.", "Add your LinkedIn URL under your name. Recruiters look you up."),

    mk("verbs", "impact", "Bullets start with action verbs", verbRatio / 0.8, 12,
      bullets.length ? `${actionVerbBullets} of ${bullets.length} bullets open with a strong verb.` : "No bullets detected.", "Start every bullet with a verb: Built, Designed, Reduced, Shipped."),
    mk("metrics", "impact", "Bullets show numbers", quantRatio / 0.5, 15,
      bullets.length ? `${quantifiedBullets} of ${bullets.length} bullets contain a number.` : "No bullets detected.", techy ? "Add a number to each bullet: users, lines of code, time saved, tables, percent." : "Add a number to each bullet: customers served, patients per shift, dollars handled, team size, percent improved."),
    mk("weak", "impact", "No filler phrases", weakPhrases.length === 0 ? 1 : Math.max(0, 1 - weakPhrases.length / 3), 8,
      weakPhrases.length ? `Found: ${weakPhrases.join(", ")}.` : "No filler found.", "Replace phrases like \"responsible for\" and \"helped with\" with what you actually did."),

    mk("breadth", "technical", techy ? "Technical breadth" : "Skills and tools", skills.length / (techy ? 10 : 6), 10, `${skills.length} recognised ${techy ? "technologies" : "skills and tools"}.`, techy ? "List the languages, frameworks and tools you have really used." : "List the systems, certifications and skills you have really used (software, licences, languages)."),
    mk("skillsec", "technical", "Skills section", has("skills") ? 1 : 0, 4, has("skills") ? "Found." : "No skills section found.", techy ? "Add a Technical Skills section grouped by type." : "Add a Skills section: tools, systems, languages, certifications."),
    ...(techy ? [
      mk("projlinks", "technical", "Projects link to proof", has("projects") ? Math.min(1, projectLinks / 2) : 0, 6,
        has("projects") ? `${projectLinks} link(s) in your projects.` : "No projects section.", "Link each project to its live site or repository."),
    ] : [
      mk("expsec", "technical", "Work experience", has("experience") ? 1 : 0, 6, has("experience") ? "Found." : "No experience section found.", "Add an Experience section with your roles, employers and dates."),
    ]),

    mk("edu", "completeness", "Education with a date", has("education") && gradYear ? 1 : has("education") ? 0.5 : 0, 5,
      gradYear ? `Graduation year ${gradYear}.` : "No graduation date found.", "Add your expected graduation month and year."),
    mk("gpa", "completeness", "GPA (if 3.0 or higher)", gpa === undefined ? 0.4 : gpa >= 3 ? 1 : 0.6, 3,
      gpa === undefined ? "No GPA listed." : `GPA ${gpa}.`, "If your GPA is 3.0 or above, list it."),
    mk("certs", "completeness", "Certification", has("certifications") ? 1 : 0, 3, has("certifications") ? "Found." : "None listed.", techy ? "Add any certifications, such as Security+ or AWS." : "Add any licences or certifications (CPR, RN, CDL, OSHA, PMP...)."),
    ...(techy ? [
      mk("projcount", "completeness", "Two or more projects", Math.min(1, (sectionsText.projects ?? []).filter((l) => /[|\t]|\b(20\d\d)\b/.test(l)).length / 2), 4,
      has("projects") ? "Counted from the Projects section." : "No projects section.", "Build and list at least two projects you can discuss."),
    ] : []),
  ];

  const groupScores = { ats: { earned: 0, max: 0 }, impact: { earned: 0, max: 0 }, technical: { earned: 0, max: 0 }, completeness: { earned: 0, max: 0 } };
  for (const c of checks) { groupScores[c.group].earned += c.earned; groupScores[c.group].max += c.max; }
  const total = checks.reduce((s, c) => s + c.earned, 0);
  const max = checks.reduce((s, c) => s + c.max, 0) || 1;
  const overall = Math.round((total / max) * 100);
  const grade = overall >= 90 ? "A" : overall >= 80 ? "B" : overall >= 70 ? "C" : overall >= 60 ? "D" : "F";
  const level = empty ? "Add your resume to see where you stand"
    : overall >= 85 ? (isStudent ? "Strong internship candidate" : "Strong candidate")
    : overall >= 70 ? (isStudent ? "Competitive for internships, with fixable gaps" : "Competitive, with fixable gaps")
    : overall >= 50 ? "Getting there: a few fixes will move you a lot" : "Needs work before you apply at volume";

  const fixes = [...checks].filter((c) => c.fix).sort((a, b) => (b.max - b.earned) - (a.max - a.earned)).slice(0, 5).map((c) => c.fix as string);

  return {
    empty, wordCount: words.length, email, phone, linkedin, github, sections, bullets, actionVerbBullets, quantifiedBullets,
    weakPhrases, skills, gradYear, gpa, isStudent, oddCharacters, checks, groupScores, overall, grade, level, fixes, targets, roleTitles,
    bulletReview: bullets.map(reviewBullet),
  };
}

export const TARGET_OPTIONS = DOMAINS.map((d) => ({ id: d.id, label: d.label, titles: d.titles, tech: d.tech }));

export const SAMPLE_RESUME = `ALEX RIVERA
Baltimore, MD | (410) 555-0142 | alex.rivera@example.com
linkedin.com/in/alexrivera-sample | github.com/alexrivera-sample
EDUCATION
State University
Bachelor of Science in Computer Science | GPA: 3.4 | Expected May 2027
Relevant Coursework: Data Structures, Algorithms, Databases, Operating Systems
PROJECTS
Campus Events App | React, TypeScript, Node.js, PostgreSQL | 2026
Built a web app where students post and RSVP to events, used by 120 students in the first month
Designed a PostgreSQL schema with 8 tables and wrote 25 API endpoints
Responsible for deployment and helped with testing
Budget Tracker | Python, Flask, SQL | 2025
Created a command-line and web budget tool that categorises transactions
Wrote unit tests covering 70% of the code
EXPERIENCE
Help Desk Assistant, University IT | Aug 2025 - Present
Resolved 15 to 20 support tickets per week for students and faculty
Assisted with laptop imaging and account setup
TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, Java, SQL, HTML, CSS
Frameworks: React, Node.js, Flask
Tools: Git, Docker, Linux
CERTIFICATIONS
CompTIA A+
`;

const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";

/** Pulls the details people retype into every application form out of the resume text. */
export function extractKit(text: string): import("./types").Kit {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const a = parseResume(text);
  const secs = splitSections(lines);
  const head = (secs.header ?? []).slice(0, 5);
  const name = head.find((l) => l.split(/\s+/).length <= 4 && !/[@\d|]/.test(l)) ?? "";
  const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : s);
  // "City, ST" is one segment of a header line like "Baltimore, MD | (410) 555-0100 | a@b.com".
  const location = head.flatMap((l) => l.split("|")).map((s) => s.trim()).find((s) => /^[A-Z][A-Za-z .]+,\s*[A-Z]{2}$/.test(s)) ?? "";
  const edu = secs.education ?? [];
  const cleanSchool = (s: string) => s.replace(new RegExp(`\\s+(?:Expected|Anticipated)?\\s*${MONTH}\\s+\\d{4}.*$`, "i"), "").replace(/\s+\d{4}$/, "").replace(/\s*[-\u2014\u2013]\s.*$/, "").trim();
  const school = edu[0] ? cleanSchool(edu[0]) : "";
  const degreeLine = edu.find((l) => /bachelor|b\.?s\.?\b|master|m\.?s\.?\b|associate/i.test(l));
  const degree = degreeLine ? degreeLine.split("|")[0].trim() : "";
  const gradDate = edu.join(" ").match(new RegExp(`(?:Expected|Anticipated)?\\s*(${MONTH}\\s+20\\d\\d)`, "i"))?.[1] ?? "";

  // First project and its first bullet, as a one-line pitch.
  const proj = secs.projects ?? [];
  const isBullet = (l: string) => GLYPH.test(l);
  // A project header ends in a date ("Applyr: Resume Grader   Nov 2026"). It can look like a "Label:" line, so the date is what counts.
  const hi = proj.findIndex((l) => !isBullet(l) && /(20\d\d)\s*$/.test(l));
  let pitch = "";
  if (hi >= 0) {
    const title = proj[hi].replace(new RegExp(`\\s+(?:${MONTH}\\s+)?20\\d\\d\\s*$`, "i"), "").trim();
    const first = collectBullets(proj.slice(hi + 1), 1)[0];
    const gist = first ? first.replace(/\.$/, "") : "";
    const projectName = title.split(/\s*[:|]\s*/)[0].trim();
    const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(" ", n)).replace(/[,;:(\s-]+$/, "")}\u2026`);
    pitch = gist ? `${projectName}: ${clip(gist, 140)}` : projectName;
  }
  return {
    name: titleCase(name), email: a.email ?? "", phone: a.phone ?? "", location, linkedin: a.linkedin ?? "", github: a.github ?? "",
    website: "", school, degree, gradDate, gpa: a.gpa !== undefined ? String(a.gpa) : "", pitch,
  };
}

/** Swap one bullet for its rewrite, even when the extracted text wrapped it across lines. */
export function replaceBullet(text: string, original: string, rewrite: string): string {
  if (text.includes(original)) return text.replace(original, rewrite);
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(original.trim().split(/\s+/).map(esc).join("\\s+"));
  return re.test(text) ? text.replace(re, rewrite) : text;
}

/**
 * The profile a resume implies: fields, titles, skills, level and the apply kit. Replaces what the
 * previous resume implied, so uploading a different resume re-aims the whole search.
 */
export function profileFromResume(text: string, base: import("./types").Profile): import("./types").Profile {
  const a = parseResume(text);
  const kit = extractKit(text);
  const ids = a.targets.map((t) => t.id);
  const fieldTitles = TARGET_OPTIONS.filter((o) => ids.includes(o.id)).flatMap((o) => o.titles);
  return {
    ...base,
    level: a.isStudent || a.bullets.length < 6 ? "entry" : "any",
    skills: a.skills,
    targets: ids,
    wantTitles: [...new Set([...a.roleTitles, ...fieldTitles])],
    homeMetro: base.homeMetro || kit.location,
    kit: { ...base.kit, ...Object.fromEntries(Object.entries(kit).filter(([, v]) => v)) } as import("./types").Kit,
  };
}
