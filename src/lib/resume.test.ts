import { describe, expect, it } from "vitest";
import { extractFlags, extractKeywords } from "./keywords";
import { parseResume, SAMPLE_RESUME } from "./resume";

const NOW = new Date("2026-11-12T00:00:00Z").getTime();

describe("parseResume", () => {
  const a = parseResume(SAMPLE_RESUME, NOW);

  it("finds contact details and sections", () => {
    expect(a.email).toBe("alex.rivera@example.com");
    expect(a.phone).toBeTruthy();
    expect(a.linkedin).toContain("linkedin.com/in/");
    expect(a.github).toContain("github.com/");
    expect(a.sections).toMatchObject({ education: true, projects: true, experience: true, skills: true, certifications: true });
  });

  it("reads graduation year, GPA and student status", () => {
    expect(a.gradYear).toBe(2027);
    expect(a.gpa).toBe(3.4);
    expect(a.isStudent).toBe(true);
  });

  it("extracts skills from the vocabulary only", () => {
    expect(a.skills).toEqual(expect.arrayContaining(["Python", "React", "TypeScript", "SQL", "Docker", "Linux"]));
    expect(a.skills).not.toContain("Kubernetes");
  });

  it("measures bullets: verbs, numbers and filler", () => {
    expect(a.bullets.length).toBeGreaterThanOrEqual(6);
    expect(a.quantifiedBullets).toBeGreaterThan(0);
    expect(a.weakPhrases.length).toBeGreaterThan(0); // "Responsible for", "helped with", "Assisted with"
  });

  it("produces a score in range with every point traceable to a check", () => {
    expect(a.overall).toBeGreaterThan(0);
    expect(a.overall).toBeLessThanOrEqual(100);
    const sum = a.checks.reduce((s, c) => s + c.earned, 0);
    const max = a.checks.reduce((s, c) => s + c.max, 0);
    expect(a.overall).toBe(Math.round((sum / max) * 100));
  });

  it("improves the grade when the flagged problems are fixed", () => {
    const fixed = SAMPLE_RESUME
      .replace("Responsible for deployment and helped with testing", "Deployed the app to AWS with 3 automated tests")
      .replace("Assisted with laptop imaging and account setup", "Imaged 40 laptops and created 200 student accounts");
    expect(parseResume(fixed, NOW).overall).toBeGreaterThan(a.overall);
  });

  it("recommends target roles from the skills present", () => {
    expect(a.targets.map((t) => t.id)).toEqual(expect.arrayContaining(["web"]));
  });

  it("flags empty or tiny input instead of grading it", () => {
    const e = parseResume("hello", NOW);
    expect(e.empty).toBe(true);
    expect(e.checks).toHaveLength(0);
  });

  it("flags risky characters", () => {
    expect(parseResume(SAMPLE_RESUME.replace("Present", "Present – now"), NOW).oddCharacters).toContain("–");
  });
});

describe("bullets from a PDF-style text", () => {
  const pdf = [
    "EBUBE EZE", "a@b.com | (410) 555-0100", "EDUCATION", "State University Expected 2027", "PROJECTS",
    "Applyr Nov 2026",
    "Technologies: TypeScript, Next.js, Python, REST APIs, GitHub Actions | applyr.techboy.dev",
    "\u2022 Built a system that ingests postings from public APIs across 57 company job boards",
    "and ranks each 0-100 against a candidate profile.",
    "\u2022 Designed the scorer to return its reasons with every score so it can be debugged easily",
    "\u2022 Deduplicated 167 raw matches into 81 unique roles across several differing titles",
    "EXPERIENCE", "Repair Technician Sep 2024 - Dec 2025",
    "\u2022 Diagnosed and resolved faults on laptops and desktops for walk-in customers daily",
  ].join("\n");
  const padded = "Filler words to pass the minimum length check. ".repeat(6) + "\n" + pdf;
  const a = parseResume(padded, NOW);
  it("counts only real bullets, not Technologies: lines, and merges wrapped lines", () => {
    expect(a.bullets).toHaveLength(4);
    expect(a.bullets.some((b) => b.includes("57 company job boards and ranks each 0-100 against a candidate profile"))).toBe(true);
    expect(a.actionVerbBullets).toBe(4);
  });
  it("does not treat the bullet glyph as an ATS problem", () => {
    expect(a.oddCharacters).toEqual([]);
  });
});

describe("keywords", () => {
  it("matches whole terms, not substrings", () => {
    expect(extractKeywords("Internal tools in Java")).toEqual(["Java"]);
    expect(extractKeywords("JavaScript only")).toEqual(["JavaScript"]);
    expect(extractKeywords("We use C++ and C# daily")).toEqual(expect.arrayContaining(["C++", "C#"]));
  });
  it("spots hard requirements", () => {
    expect(extractFlags("Must be a U.S. citizen")).toContain("citizenship");
    expect(extractFlags("Active TS/SCI clearance")).toContain("clearance");
    expect(extractFlags("Great team, remote friendly")).toEqual([]);
  });
});
