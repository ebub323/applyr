import { describe, expect, it } from "vitest";
import { parseResume, profileFromResume } from "./resume";
import { DEFAULT_PROFILE } from "./data";

const nurse = `MARIA OKAFOR
Baltimore, MD | (410) 555-0101 | maria@example.com
EDUCATION
Morgan State University
Bachelor of Science in Nursing | GPA: 3.5 | Expected May 2027
EXPERIENCE
Patient Care Technician, Johns Hopkins Hospital | Jun 2025 - Present
Provided direct patient care for 12 patients per shift on a medical-surgical unit
Recorded vitals and updated the EHR for every patient, following HIPAA rules
Certified Nursing Assistant, Roland Park Place | Jun 2024 - Aug 2024
Assisted 20 residents with daily living and reported changes to the charge nurse
SKILLS
Patient Care, CPR, BLS, EHR, HIPAA, Medical Terminology
CERTIFICATIONS
BLS, CPR
`;

const barista = `JORDAN LEE
Towson, MD | (410) 555-0102 | jordan@example.com
EDUCATION
Towson University
Bachelor of Arts in Communications | Expected May 2027
EXPERIENCE
Barista, Starbucks | Jun 2025 - Present
Served 150 customers per shift and handled cash and POS transactions accurately
Shift Supervisor, Corner Cafe | Jun 2024 - Aug 2024
Trained 6 new team members and kept inventory counts accurate
SKILLS
Customer Service, Cash Handling, POS, Food Safety
`;

const accountant = `PRIYA NAIR
Columbia, MD | (410) 555-0103 | priya@example.com
EDUCATION
University of Maryland
Bachelor of Science in Accounting | Expected May 2027
EXPERIENCE
Accounting Intern, Deloitte | Jun 2026 - Aug 2026
Reconciled 40 accounts payable invoices per week in QuickBooks
SKILLS
Excel, QuickBooks, Accounting, GAAP
`;

describe("field detection is resume-based, not software by default", () => {
  it("reads a nursing resume as healthcare", () => {
    const a = parseResume(nurse);
    expect(a.targets[0].id).toBe("health");
    expect(a.targets.some((t) => t.id === "swe" || t.id === "backend")).toBe(false);
    expect(a.roleTitles[0]).toMatch(/Patient Care Technician/);
  });
  it("reads a barista as retail and hospitality", () => {
    expect(parseResume(barista).targets.map((t) => t.id)).toContain("hospitality");
    expect(parseResume(barista).targets.some((t) => t.id === "swe")).toBe(false);
  });
  it("reads an accounting major as finance", () => {
    expect(parseResume(accountant).targets[0].id).toBe("finance");
  });
  it("builds a profile from the resume and drops the previous resume's field", () => {
    const first = profileFromResume(nurse, DEFAULT_PROFILE);
    expect(first.targets).toContain("health");
    const second = profileFromResume(accountant, first);
    expect(second.targets).toContain("finance");
    expect(second.targets).not.toContain("health");
    expect(second.skills).not.toContain("HIPAA");
  });
  it("starts with no field at all", () => {
    expect(DEFAULT_PROFILE.targets).toEqual([]);
    expect(DEFAULT_PROFILE.wantTitles).toEqual([]);
  });
});
