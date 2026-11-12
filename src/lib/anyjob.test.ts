import { describe, expect, it } from "vitest";
import { isRelevant, type SearchSpec } from "./ats";
import { pickModel } from "./ai";
import { extractKeywords } from "./keywords";
import { parseRemotive } from "./remotive";
import { parseResume } from "./resume";
import { scoreFit } from "./score";
import { DEFAULT_PROFILE } from "./data";
import { applyTailoring, checkRewrite, checkSummary, cleanLine, missingTerms, newWords, rankBullets, tailorResume, type TailorInput } from "./tailor";

const spec = (targets: string[], level: SearchSpec["level"] = "entry", wantTitles: string[] = []): SearchSpec => ({ targets, wantTitles, level });

describe("search beyond software", () => {
  it("keeps the roles of the fields you picked and nothing else", () => {
    const care = spec(["health"]);
    expect(isRelevant("Medical Assistant", "Baltimore, MD", true, care)).toBe(true);
    expect(isRelevant("Registered Nurse, Float Pool", "Baltimore, MD", true, care)).toBe(true);
    expect(isRelevant("Software Engineer Intern", "Baltimore, MD", true, care)).toBe(false);
    expect(isRelevant("Accountant", "Baltimore, MD", true, care)).toBe(false);
  });
  it("still drops senior titles at entry level, and keeps them at any level", () => {
    expect(isRelevant("Senior Customer Support Specialist", "Remote, US", true, spec(["customer"]))).toBe(false);
    expect(isRelevant("Senior Customer Support Specialist", "Remote, US", true, spec(["customer"], "any"))).toBe(true);
  });
  it("does not ask a barista or an accountant to say 'intern'", () => {
    expect(isRelevant("Barista", "Baltimore, MD", true, spec(["hospitality"]))).toBe(true);
    expect(isRelevant("Staff Accountant", "Baltimore, MD", true, spec(["finance"], "any"))).toBe(true);
  });
  it("still asks software engineers for an entry marker", () => {
    expect(isRelevant("Software Engineer, Payments", "Remote, US", true, spec(["swe"]))).toBe(false);
    expect(isRelevant("Software Engineer Intern", "Remote, US", true, spec(["swe"]))).toBe(true);
  });
  it("accepts a title you typed yourself", () => {
    expect(isRelevant("Sommelier", "Baltimore, MD", true, spec(["hospitality"], "entry", ["sommelier"]))).toBe(true);
  });
  it("keeps the old software-only behaviour when nothing is picked", () => {
    expect(isRelevant("Registered Nurse", "Remote, US", true)).toBe(false);
    expect(isRelevant("Software Engineer Intern", "Remote, US", true)).toBe(true);
  });
});

describe("scoring other fields", () => {
  const nurse = { ...DEFAULT_PROFILE, targets: ["health"], wantTitles: [], skills: ["Patient Care", "CPR"], homeMetro: "Baltimore" };
  const role = (title: string) => ({ title, keywords: ["Patient Care", "CPR", "EHR"], remote: false, location: "Baltimore, MD", source: "greenhouse" as const });
  it("rewards a title in your field and does not call it 'not software'", () => {
    const r = scoreFit(role("Medical Assistant"), nurse);
    expect(r.factors.find((f) => f.key === "title")?.note).toMatch(/Fits your field/);
    expect(r.factors.some((f) => /Not a software/.test(f.note))).toBe(false);
  });
  it("only penalises seniority when you asked for entry level", () => {
    const entry = scoreFit(role("Senior Nurse Manager"), nurse).fit;
    const any = scoreFit(role("Senior Nurse Manager"), { ...nurse, level: "any" }).fit;
    expect(any).toBeGreaterThan(entry);
  });
});

describe("skills outside tech", () => {
  it("reads care, sales and finance skills", () => {
    expect(extractKeywords("Provided patient care, CPR certified, charted in Epic EHR")).toEqual(expect.arrayContaining(["Patient Care", "CPR", "EHR"]));
    expect(extractKeywords("Managed Salesforce CRM and cold calling")).toEqual(expect.arrayContaining(["Salesforce", "CRM", "Cold Calling"]));
    expect(extractKeywords("QuickBooks bookkeeping and payroll")).toEqual(expect.arrayContaining(["QuickBooks", "Bookkeeping", "Payroll"]));
  });
  it("does not read 'salesforce' as sales", () => {
    expect(extractKeywords("Salesforce admin")).not.toContain("Sales");
  });
});

const NURSE_RESUME = `MARIA SANTOS
Baltimore, MD | (410) 555-0199 | maria.santos@example.com
linkedin.com/in/mariasantos-sample
EDUCATION
Community College of Baltimore County
Associate of Science in Nursing | Expected May 2027
EXPERIENCE
Patient Care Technician, Greater Baltimore Medical Center | 2024 - Present
Cared for 12 patients per shift on a medical-surgical floor
Recorded vitals and charted in Epic EHR with 100% accuracy
Trained 4 new technicians on bed safety and patient transfers
Customer Service Associate, Giant Food | 2022 - 2024
Served 200 customers per day and handled cash with zero drawer shortages
SKILLS
Patient Care, CPR, BLS, EHR, HIPAA, Medical Terminology, Customer Service, Spanish
CERTIFICATIONS
CPR and BLS, American Heart Association
`;

describe("grading a non-technical resume", () => {
  const a = parseResume(NURSE_RESUME);
  it("does not ask a nurse for a GitHub or projects", () => {
    expect(a.checks.find((c) => c.id === "links")?.label).toBe("LinkedIn");
    expect(a.checks.some((c) => c.id === "projlinks" || c.id === "projcount")).toBe(false);
    expect(a.checks.find((c) => c.id === "links")?.earned).toBe(5);
  });
  it("points toward healthcare", () => {
    expect(a.targets[0]?.id).toBe("health");
  });
  it("counts service verbs as action verbs", () => {
    expect(a.actionVerbBullets).toBeGreaterThanOrEqual(3);
  });
  it("still grades a software resume on GitHub and projects", () => {
    const sw = parseResume(`ALEX\na@x.com | 410-555-0100\nEDUCATION\nState University BS Computer Science Expected May 2027\nPROJECTS\nApp | React, Node.js, SQL | 2026\nBuilt a web app used by 100 students\nSKILLS\nPython, Java, React, Git, Docker, SQL, TypeScript\n${"filler words here ".repeat(60)}`);
    expect(sw.checks.some((c) => c.id === "projlinks")).toBe(true);
  });
});

describe("remote jobs from Remotive", () => {
  const raw = { jobs: [
    { id: 1, url: "https://remotive.com/1", title: "Customer Support Specialist", company_name: "Acme", candidate_required_location: "USA", description: "<p>Zendesk and CRM</p>" },
    { id: 2, url: "https://remotive.com/2", title: "Customer Support Specialist", company_name: "Acme", candidate_required_location: "Germany", description: "" },
    { id: 3, url: "https://remotive.com/3", title: "Senior Customer Support Lead", company_name: "Acme", candidate_required_location: "Worldwide", description: "" },
  ] };
  it("keeps US-open, entry-level roles in the field and reads their skills", () => {
    const got = parseRemotive(raw, true, spec(["customer"]));
    expect(got.map((r) => r.id)).toEqual(["remotive:1"]);
    expect(got[0].keywords).toEqual(expect.arrayContaining(["Zendesk", "CRM"]));
    expect(got[0].remote).toBe(true);
  });
});

describe("choosing a local model", () => {
  it("prefers a small chat model, avoids reasoning and embedding models", () => {
    expect(pickModel([{ name: "deepseek-r1:14b", size: 9e9 }, { name: "qwen2.5:3b", size: 2e9 }, { name: "nomic-embed-text", size: 3e8 }])).toBe("qwen2.5:3b");
    expect(pickModel([{ name: "deepseek-r1:14b", size: 9e9 }])).toBe("deepseek-r1:14b");
    expect(pickModel([])).toBeNull();
  });
});

describe("tailoring stays inside what your resume says", () => {
  const a = parseResume(NURSE_RESUME);
  const input: TailorInput = {
    resume: NURSE_RESUME, bullets: a.bullets, skills: a.skills, facts: ["Studying Associate of Science in Nursing at Community College of Baltimore County, expected May 2027"],
    job: { title: "Patient Care Technician", company: "Acme Health", description: "Care for patients, record vitals and chart in an EHR. CPR required. Experience with Epic and Kubernetes is a plus." },
  };
  const bullet = "Cared for 12 patients per shift on a medical-surgical floor";

  it("accepts a reword that reuses your words", () => {
    expect(checkRewrite(bullet, "Provided care for 12 patients per shift on a medical-surgical floor")).toBe("ok");
  });
  it("rejects an invented number, tool or task", () => {
    expect(checkRewrite(bullet, "Cared for 30 patients per shift on a medical-surgical floor")).toBe("rejected");
    expect(checkRewrite(bullet, "Cared for 12 patients per shift using Kubernetes")).toBe("rejected");
    expect(checkRewrite(bullet, "Cared for 12 patients per shift and administered intravenous medication")).toBe("rejected");
  });
  it("reports an unchanged line as unchanged, not as a failure", () => {
    expect(checkRewrite(bullet, bullet)).toBe("unchanged");
  });
  it("counts only genuinely new words", () => {
    expect(newWords("Provided care for patients on the medical-surgical floor", bullet)).toEqual([]);
  });
  it("refuses a summary that names the employer or says I", () => {
    expect(checkSummary("Nursing student who cared for 12 patients per shift on a medical-surgical floor.", input)).toBe(true);
    expect(checkSummary("Nursing student ready to join Acme Health and care for 12 patients per shift.", input)).toBe(false);
    expect(checkSummary("I am a nursing student who cared for 12 patients per shift on a medical floor.", input)).toBe(false);
  });
  it("names gaps from the posting's own words, not the model's", () => {
    expect(missingTerms(NURSE_RESUME, input.job.description)).toEqual(["Kubernetes"]);
  });
  it("puts the bullets that share the posting's language first", () => {
    const order = rankBullets(a.bullets, `${input.job.title} ${input.job.description}`);
    expect(a.bullets[order[0]]).toMatch(/EHR|patients/);
  });
  it("strips quotes, labels and bullet marks the model adds", () => {
    expect(cleanLine('Rewritten: "• Cared for 12 patients"\nMore chatter')).toBe("Cared for 12 patients");
  });
  it("swaps accepted bullets into the resume and adds the summary under the header", () => {
    const out = applyTailoring(NURSE_RESUME, [{ n: 1, original: bullet, text: "Provided care for 12 patients per shift on a medical-surgical floor" }], "Nursing student.");
    expect(out).toContain("Provided care for 12 patients");
    expect(out).not.toContain(bullet);
    expect(out.indexOf("SUMMARY")).toBeLessThan(out.indexOf("EDUCATION"));
  });
  it("runs a full pass with a stand-in model and keeps only the safe lines", async () => {
    const replies = [
      "Nursing student who cared for 12 patients per shift on a medical-surgical floor.",
      "Provided care for 12 patients per shift on a medical-surgical floor",
      "Cared for 99 patients every shift",
      "Recorded vitals and charted in Epic EHR with 100% accuracy",
      "Trained 4 new technicians on bed safety and patient transfers using Kubernetes",
    ];
    let i = 0;
    const got: string[] = [];
    const res = await tailorResume(input, { run: async () => replies[i++] ?? "", onRewrite: (r) => got.push(r.text) });
    expect(res.summary).toMatch(/^Nursing student who cared for 12 patients/);
    expect(res.summary).toMatch(/Works with .*(CPR|EHR|Epic)/);
    expect(res.rewrites.every((r) => !/99|Kubernetes/.test(r.text))).toBe(true);
    expect(res.dropped).toBeGreaterThanOrEqual(2);
    expect(got.length).toBe(res.rewrites.length);
  });
});
