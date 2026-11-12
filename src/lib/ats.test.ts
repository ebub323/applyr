import { describe, expect, it } from "vitest";
import { isRelevant } from "./ats";

describe("isRelevant", () => {
  it("keeps entry-level engineering roles in the US", () => {
    expect(isRelevant("Software Engineer Intern (Summer 2027)", "San Francisco, CA", true)).toBe(true);
    expect(isRelevant("Backend Engineering Intern", "Remote, US", true)).toBe(true);
    expect(isRelevant("Software Engineer, New Grad", "New York, NY", true)).toBe(true);
  });
  it("does not mistake Internal/International for intern", () => {
    expect(isRelevant("Backend Engineer, Internationalisation", "Remote, US", true)).toBe(false);
    expect(isRelevant("Software Engineer, Internal Tools", "Remote, US", true)).toBe(false);
  });
  it("drops senior, advanced-degree and non-software roles", () => {
    expect(isRelevant("Senior Software Engineer", "Remote, US", true)).toBe(false);
    expect(isRelevant("PhD Machine Learning Engineer, Intern", "Remote, US", true)).toBe(false);
    expect(isRelevant("Solutions Engineer Intern 2027", "Remote, US", true)).toBe(false);
  });
  it("treats CA as California or Canada correctly, and rejects Dublin", () => {
    expect(isRelevant("Software Engineer Intern", "Toronto, ON, CA", true)).toBe(false);
    expect(isRelevant("Software Engineer Intern", "San Francisco, CA, US", true)).toBe(true);
    expect(isRelevant("Software Engineer Intern", "Dublin, IE", true)).toBe(false);
    expect(isRelevant("Software Engineer Intern", "Toronto, ON, CA", false)).toBe(true);
  });
});
