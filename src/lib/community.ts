import { locationOk } from "./ats";
import { extractKeywords } from "./keywords";
import type { Role, Source } from "./types";

/**
 * A community-maintained list of summer internships (SimplifyJobs / Pitt CSC).
 * It reaches what the company APIs cannot: Workday, iCIMS and SmartRecruiters
 * portals. The repository declares no license, so the data is read live from its
 * public URL with attribution and is never copied into this site.
 */
export const COMMUNITY_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";
export const COMMUNITY_REPO = "https://github.com/SimplifyJobs/Summer2027-Internships";

const CATEGORIES = new Set(["Software", "Software Engineering", "AI/ML/Data", "Data Science, AI & Machine Learning"]);

interface Listing {
  id: string; company_name: string; title: string; active?: boolean; is_visible?: boolean; url: string;
  locations?: string[]; category?: string; date_posted?: number; sponsorship?: string;
}

export function sourceFromUrl(url: string): Source {
  if (/myworkdayjobs|workday/i.test(url)) return "workday";
  if (/greenhouse\.io/i.test(url)) return "greenhouse";
  if (/lever\.co/i.test(url)) return "lever";
  if (/ashbyhq\.com/i.test(url)) return "ashby";
  return "other";
}

export function mapListing(l: Listing): Role {
  const location = (l.locations ?? []).join("; ");
  return {
    id: `simplify:${l.id}`,
    title: l.title.trim(), company: l.company_name, location, remote: /remote/i.test(location),
    source: sourceFromUrl(l.url), postedAt: l.date_posted ? new Date(l.date_posted * 1000).toISOString().slice(0, 10) : undefined,
    url: l.url, stage: "found", notes: "", keywords: extractKeywords(l.title),
    flags: l.sponsorship === "U.S. Citizenship is Required" ? ["citizenship"] : undefined,
    category: l.category,
  };
}

export function parseCommunity(raw: unknown, usOnly: boolean): Role[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Role[] = [];
  for (const l of raw as Listing[]) {
    if (!l || !l.active || l.is_visible === false || !l.url || !l.title || !l.category || !CATEGORIES.has(l.category)) continue;
    const role = mapListing(l);
    if (!locationOk(role.location, usOnly)) continue;
    const key = `${role.company}|${role.title.toLowerCase().replace(/[^a-z ]/g, "").trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(role);
  }
  return out;
}

export async function fetchCommunity(usOnly: boolean, signal?: AbortSignal): Promise<Role[]> {
  const res = await fetch(COMMUNITY_URL, { signal });
  if (!res.ok) throw new Error(String(res.status));
  return parseCommunity(await res.json(), usOnly);
}

/** The same job seen on a company board and the community list should appear once. */
export function dedupeAcross(preferred: Role[], other: Role[]): Role[] {
  const norm = (r: Role) => `${r.company.toLowerCase()}|${r.title.toLowerCase().replace(/[^a-z ]/g, "").trim()}`;
  const have = new Set(preferred.map(norm));
  return [...preferred, ...other.filter((r) => !have.has(norm(r)))];
}
