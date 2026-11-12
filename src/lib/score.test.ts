import { describe, expect, it } from "vitest";
import { BASE, DEFAULT_WEIGHTS, scoreFit } from "./score";
import type { Profile, Role } from "./types";

const NOW = new Date("2026-11-12T00:00:00Z").getTime();

const profile: Profile = {
  skills: ["TypeScript", "Python", "SQL"],
  wantTitles: ["Software Engineer Intern"],
  homeMetro: "Baltimore, DC",
  willRelocate: false,
  minHourly: 18,
  targets: [],
  usCitizen: true,
  hasClearance: false,
};

const role = (over: Partial<Role> = {}): Role => ({
  id: "r", title: "Software Engineer Intern", company: "Acme", location: "Baltimore, MD",
  remote: false, source: "greenhouse", stage: "found", keywords: [], notes: "",
  postedAt: "2026-11-10", ...over,
});

const fit = (over?: Partial<Role>, p = profile, w = DEFAULT_WEIGHTS) => scoreFit(role(over), p, w, NOW).fit;

describe("scoreFit", () => {
  it("scores a direct title match in the home area well above the base", () => {
    expect(fit()).toBeGreaterThan(BASE + 30);
  });

  it("penalises seniority hard", () => {
    expect(fit({ title: "Senior Staff Software Engineer" })).toBeLessThan(fit() - 40);
  });

  it("treats remote as location-neutral and penalises out-of-area when relocation is off", () => {
    const away = fit({ location: "San Francisco, CA" });
    expect(fit({ location: "San Francisco, CA", remote: true })).toBeGreaterThan(away + 40);
  });

  it("softens the out-of-area penalty when relocation is allowed", () => {
    const loc = "San Francisco, CA";
    expect(fit({ location: loc }, { ...profile, willRelocate: true })).toBeGreaterThan(fit({ location: loc }));
  });

  it("rewards skill overlap and caps the reward", () => {
    const some = fit({ keywords: ["TypeScript"] });
    const many = fit({ keywords: ["TypeScript", "Python", "SQL", "Go", "Rust", "Java", "C++"] });
    expect(some).toBeGreaterThan(fit());
    expect(many - fit()).toBeLessThanOrEqual(18);
  });

  it("reads annual salaries as hourly before comparing to the floor", () => {
    expect(fit({ salaryMin: 120_000 })).toBe(fit());      // about $57/hr: fine
    expect(fit({ salaryMin: 10 })).toBeLessThan(fit());   // $10/hr: below floor
  });

  it("marks stale postings down and fresh ones up", () => {
    expect(fit({ postedAt: "2026-06-01" })).toBeLessThan(fit({ postedAt: "2026-11-01" }));
    expect(fit({ postedAt: "2026-11-11" })).toBeGreaterThan(fit({ postedAt: "2026-11-01" }));
  });

  it("gives no entry-level credit to non-software engineer titles", () => {
    expect(fit({ title: "Solutions Engineer Intern" })).toBeLessThan(fit() - 25);
    expect(fit({ title: "Sales Engineer Intern" })).toBeLessThan(fit() - 25);
  });

  it("leaves room between a great role and a good one", () => {
    const great = fit({ remote: true, keywords: ["TypeScript", "Python", "SQL"], postedAt: "2026-11-11" });
    const good = fit({ location: "San Francisco, CA", keywords: ["TypeScript"] }, { ...profile, willRelocate: true });
    expect(great).toBeLessThan(100);
    expect(great - good).toBeGreaterThanOrEqual(10);
  });

  it("charges more friction for Workday than Greenhouse", () => {
    expect(fit({ source: "workday" })).toBeLessThan(fit({ source: "greenhouse" }));
  });

  it("scales a factor with its weight, and zero switches it off", () => {
    const off = { ...DEFAULT_WEIGHTS, friction: 0 };
    expect(fit({ source: "workday" }, profile, off)).toBe(fit({ source: "greenhouse" }, profile, off));
  });

  it("penalises citizenship requirements for non-citizens and only nudges for clearance", () => {
    const foreign = { ...profile, usCitizen: false };
    expect(fit({ flags: ["citizenship"] }, foreign)).toBeLessThan(fit({}, foreign) - 30);
    expect(fit({ flags: ["citizenship"] })).toBe(fit());
    expect(fit({ flags: ["clearance"] })).toBeLessThan(fit());
    expect(fit({ flags: ["clearance"] })).toBeGreaterThan(fit() - 10);
  });

  it("always returns a score in 0-100 and explains it", () => {
    const worst = scoreFit(role({ title: "Director", location: "Mars", salaryMin: 1, postedAt: "2020-01-01", source: "workday" }), profile, DEFAULT_WEIGHTS, NOW);
    expect(worst.fit).toBeGreaterThanOrEqual(0);
    expect(worst.fit).toBeLessThanOrEqual(100);
    expect(worst.reasons.length).toBeGreaterThan(0);
    const factorSum = worst.factors.reduce((s, f) => s + f.delta, 0);
    expect(worst.fit).toBe(Math.max(0, Math.min(100, BASE + factorSum)));
  });
});
