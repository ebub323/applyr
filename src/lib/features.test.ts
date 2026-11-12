import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportBackup, parseBackup } from "./backup";
import { dedupeAcross, mapListing, parseCommunity, sourceFromUrl } from "./community";
import { buildQueue, daysBetween, followUpsDue, isNewSince, streak } from "./habit";
import { coverNote, followUpNote, tailoredSkillsLine } from "./kit";
import { extractKit, replaceBullet, reviewBullet, SAMPLE_RESUME } from "./resume";
import { normalise } from "./state";
import { EMPTY_KIT, type Profile, type Role } from "./types";

const profile: Profile = {
  skills: ["TypeScript", "Python", "SQL"], wantTitles: [], homeMetro: "Baltimore", willRelocate: true, minHourly: 18,
  targets: [], usCitizen: true, hasClearance: false, kit: { ...EMPTY_KIT, name: "Alex Rivera", email: "a@x.com", school: "State University", degree: "Bachelor of Science in Computer Science", gradDate: "May 2027", pitch: "Campus Events App: Built a web app used by 120 students" },
};
const role = (o: Partial<Role> = {}): Role => ({ id: "r1", title: "Software Engineer Intern", company: "Acme", location: "Baltimore, MD", remote: false, source: "greenhouse", stage: "found", keywords: ["TypeScript", "Go"], notes: "", ...o });

describe("community list", () => {
  const raw = [
    { id: "a", company_name: "Acme", title: "Software Engineer Intern", active: true, is_visible: true, url: "https://acme.wd1.myworkdayjobs.com/x", locations: ["Baltimore, MD"], category: "Software", date_posted: 1794000000 },
    { id: "b", company_name: "Acme", title: "Software Engineer Intern", active: true, url: "https://acme.wd1.myworkdayjobs.com/y", locations: ["Remote"], category: "Software" },
    { id: "c", company_name: "Maple", title: "Software Intern", active: true, url: "https://jobs.lever.co/maple/1", locations: ["Toronto, ON, CA"], category: "Software" },
    { id: "d", company_name: "Old", title: "Software Intern", active: false, url: "https://x.io", locations: ["Austin, TX"], category: "Software" },
    { id: "e", company_name: "Chip", title: "Hardware Intern", active: true, url: "https://x.io", locations: ["Austin, TX"], category: "Hardware" },
    { id: "f", company_name: "Gov", title: "Security Intern", active: true, url: "https://x.icims.com/1", locations: ["Washington, DC"], category: "AI/ML/Data", sponsorship: "U.S. Citizenship is Required" },
  ];
  it("keeps active software and data roles, drops inactive, hardware and Canada, and deduplicates", () => {
    const out = parseCommunity(raw, true);
    expect(out.map((r) => r.id)).toEqual(["simplify:a", "simplify:f"]);
  });
  it("reads the portal from the link and the citizenship flag from the listing", () => {
    expect(sourceFromUrl("https://a.wd5.myworkdayjobs.com/j")).toBe("workday");
    expect(sourceFromUrl("https://x.icims.com/1")).toBe("other");
    expect(mapListing(raw[5]).flags).toEqual(["citizenship"]);
    expect(mapListing(raw[0]).postedAt).toBe(new Date(1794000000 * 1000).toISOString().slice(0, 10));
  });
  it("shows a job once when both sources have it, preferring the company board", () => {
    const board = [role({ id: "gh:1", company: "Acme", title: "Software Engineer Intern" })];
    const merged = dedupeAcross(board, [role({ id: "simplify:a", company: "Acme", title: "Software Engineer Intern" }), role({ id: "simplify:z", company: "Zed" })]);
    expect(merged.map((r) => r.id)).toEqual(["gh:1", "simplify:z"]);
  });
});

describe("daily habit", () => {
  it("counts a streak back from today, or from yesterday when today is still empty", () => {
    expect(streak(["2026-11-12", "2026-11-11", "2026-11-10", "2026-11-08"], "2026-11-12")).toBe(3);
    expect(streak(["2026-11-11", "2026-11-10"], "2026-11-12")).toBe(2);
    expect(streak(["2026-11-09"], "2026-11-12")).toBe(0);
  });
  it("finds applications a week old with no reply, and does not nag after a follow-up", () => {
    const rs = [role({ id: "a", stage: "applied", appliedAt: "2026-11-01" }), role({ id: "b", stage: "applied", appliedAt: "2026-11-10" }),
      role({ id: "c", stage: "applied", appliedAt: "2026-11-01", followedUpAt: "2026-11-10" }), role({ id: "d", stage: "interview", appliedAt: "2026-11-01" })];
    expect(followUpsDue(rs, "2026-11-12").map((r) => r.id)).toEqual(["a"]);
    expect(followUpsDue(rs, "2026-11-17").map((r) => r.id)).toEqual(["a", "b", "c"]);   // b is now 7 days old; c was chased 7 days ago
  });
  it("marks roles posted since the last search as new", () => {
    expect(isNewSince({ postedAt: "2026-11-11" }, "2026-11-10")).toBe(true);
    expect(isNewSince({ postedAt: "2026-11-01" }, "2026-11-10")).toBe(false);
    expect(isNewSince({ postedAt: "2026-11-11" }, undefined)).toBe(false);
  });
  it("sizes the queue to what is left of the goal, best first, skipping applied, closed and dismissed", () => {
    const cands = [90, 80, 70, 60, 40].map((f, i) => ({ ...role({ id: `q${i}` }), fit: f }));
    const board = [role({ id: "q0", stage: "applied" }), role({ id: "q2", stage: "found" })];
    const q = buildQueue(cands, board, 5, 3, new Set(["q1"]));
    expect(q.map((x) => x.role.id)).toEqual(["q2", "q3"]);            // goal 5 - 3 done = 2 left; q0 applied, q1 skipped, q4 below minFit
    expect(q[0].tracked).toBe(true);
    expect(buildQueue(cands, board, 3, 3, new Set())).toEqual([]);    // goal met
    expect(daysBetween("2026-11-01", "2026-11-12")).toBe(11);
  });
});

describe("bullet review", () => {
  it("passes a strong bullet", () => {
    expect(reviewBullet("Built a PostgreSQL schema with 14 tables and 29 security policies for campus data").ok).toBe(true);
  });
  it("rewrites filler openers neutrally, without inflating what was done", () => {
    const r = reviewBullet("Responsible for deployment and helped with testing of the web app");
    expect(r.issues).toContain("Opens with a filler phrase");
    expect(r.rewrite).toBe("Handled deployment and helped with testing of the web app");
    expect(r.rewrite).not.toMatch(/^(Led|Owned|Managed)/);
    expect(r.issues).toContain("No number");
    expect(r.hard).toBe(true);
  });
  it("treats a missing number alone as a suggestion, not a defect", () => {
    const r = reviewBullet("Designed a campus-scoped database schema so students only see their own school's listings");
    expect(r.issues).toEqual(["No number"]);
    expect(r.hard).toBe(false);
  });
  it("flags missing verbs, short and long bullets", () => {
    expect(reviewBullet("Web application for students and staff and other campus users 3").issues).toContain("Does not open with an action verb");
    expect(reviewBullet("Built an app").issues).toContain("Too short to show impact");
    expect(reviewBullet("Built " + "very ".repeat(40) + "big 2 things").issues).toContain("Long");
  });
});

describe("applying a suggested rewrite", () => {
  it("replaces a bullet that was wrapped across two lines in the extracted text", () => {
    const text = "PROJECTS\n\u2022 Responsible for deployment and helped\nwith testing of the web app\nSKILLS";
    const out = replaceBullet(text, "Responsible for deployment and helped with testing of the web app", "Handled deployment and helped with testing of the web app");
    expect(out).toContain("\u2022 Handled deployment and helped with testing of the web app\nSKILLS");
  });
  it("leaves the text alone when the bullet is not found", () => {
    expect(replaceBullet("abc", "xyz", "q")).toBe("abc");
  });
});

describe("pitch from a PDF-style wrapped bullet", () => {
  it("uses the whole bullet, not its first physical line", () => {
    const txt = ["ALEX RIVERA", "a@b.com", "PROJECTS", "Applyr Nov 2026", "\u2022 Built a tool that grades an uploaded resume with fifteen checks across", "ATS readiness and impact.", "EDUCATION", "State U"].join("\n");
    expect(extractKit(txt).pitch).toBe("Applyr: Built a tool that grades an uploaded resume with fifteen checks across ATS readiness and impact");
  });
});

describe("apply kit", () => {
  const fx = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");
  it("pulls the form details out of a resume", () => {
    const k = extractKit(SAMPLE_RESUME);
    expect(k).toMatchObject({ name: "Alex Rivera", email: "alex.rivera@example.com", location: "Baltimore, MD", school: "State University", gradDate: "May 2027", gpa: "3.4" });
    expect(k.degree).toMatch(/Bachelor of Science in Computer Science/);
    expect(k.pitch).toMatch(/^Campus Events App: Built a web app/);
  });
  it("reads a real resume, not just the sample", () => {
    const k = extractKit(fx("resume.txt"));
    expect(k.name).toBe("Ebube Eze");
    expect(k.school).toBe("Morgan State University");
    expect(k.gradDate).toBe("Dec 2027");
    expect(k.github).toContain("github.com/ebub323");
    expect(k.pitch.startsWith("Applyr: ")).toBe(true);
    expect(k.pitch.length).toBeLessThan(170);
    expect(k.pitch).not.toMatch(/\.\.\.$/);   // one ellipsis character at most, never "..."
  });
  it("writes a cover note from facts only, leaving out what is missing", () => {
    const note = coverNote(profile.kit, role(), profile);
    expect(note).toContain("Hi Acme team,");
    expect(note).toContain("working toward a Bachelor of Science in Computer Science at State University (graduating May 2027)");
    expect(note).not.toMatch(/I'm a Bachelor/);
    expect(note).toContain("TypeScript");
    expect(note).not.toContain("Go");                       // a skill they do not have is never claimed
    const bare = coverNote({ ...EMPTY_KIT }, role({ keywords: [] }), profile);
    expect(bare).not.toMatch(/undefined|null|\(\)/);
  });
  it("lists the posting's skills you have first", () => {
    expect(tailoredSkillsLine(role({ keywords: ["SQL", "Go"] }), profile)).toBe("SQL, TypeScript, Python");
  });
  it("writes a follow-up that names the role and date", () => {
    expect(followUpNote(profile.kit, role(), "Nov 1")).toContain("applied for the Software Engineer Intern role on Nov 1");
  });
});

describe("backup", () => {
  const state = normalise({ roles: [role()] });
  it("round-trips", () => {
    const r = parseBackup(exportBackup(state));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.roles?.[0].id).toBe("r1");
  });
  it("refuses anything that is not a valid backup", () => {
    expect(parseBackup("not json")).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ format: "other" }))).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ format: "applyr-backup", version: 1, state: { roles: [{ nope: 1 }] } }))).toMatchObject({ ok: false });
  });
  it("fills fields an older save lacks", () => {
    const n = normalise({ roles: [] } as never);
    expect(n.profile.kit).toBeDefined();
    expect(n.skipped).toEqual({});
  });
});

describe("cover note wording and punctuation", () => {
  it("never doubles a full stop after a clipped pitch", () => {
    const kit = { ...EMPTY_KIT, name: "A", pitch: "Applyr: Built a tool that grades an uploaded resume with fifteen checks across ATS readiness…" };
    expect(coverNote(kit, role(), profile)).not.toMatch(/…\.|\.\.\./);
  });
  it("describes a student without a degree as a student, not as a degree", () => {
    const note = coverNote({ ...EMPTY_KIT, school: "State University", name: "A" }, role(), profile);
    expect(note).toContain("I'm a student at State University");
  });
});
