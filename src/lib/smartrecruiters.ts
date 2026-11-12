import { getJson, isRelevant, type SearchSpec } from "./ats";
import { fieldById } from "./fields";
import { extractKeywords } from "./keywords";
import type { Role } from "./types";

/**
 * SmartRecruiters publishes every employer's postings as public JSON that browsers
 * may read, and its search takes a keyword. The employers here hire at scale for
 * restaurants, retail, hospitality, facilities and care, which the tech boards lack.
 */
export const SR_COMPANIES: { id: string; label: string }[] = [
  { id: "Dominos", label: "Domino's" },
  { id: "McDonaldsCorporation", label: "McDonald's" },
  { id: "Aramark", label: "Aramark" },
  { id: "Sodexo", label: "Sodexo" },
  { id: "Equinox", label: "Equinox" },
  { id: "Primark", label: "Primark" },
  { id: "BoschGroup", label: "Bosch" },
  { id: "Experian", label: "Experian" },
  { id: "ServiceNow", label: "ServiceNow" },
];

interface SrPosting {
  id: string; name: string; releasedDate?: string; company?: { name?: string };
  location?: { city?: string; region?: string; country?: string; remote?: boolean; fullLocation?: string };
}

/** What to ask the search for: the titles of your fields and any title you typed, a few of each. */
export function searchTerms(spec: SearchSpec): string[] {
  const fromFields = spec.targets.map(fieldById).flatMap((f) => f?.titles.slice(0, 2) ?? []);
  return [...new Set([...spec.wantTitles, ...fromFields].map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 5);
}

export function mapPosting(p: SrPosting, companyId: string, label: string): Role {
  const l = p.location ?? {};
  const location = l.fullLocation || [l.city, l.region?.toUpperCase()].filter(Boolean).join(", ") || (l.remote ? "Remote" : "");
  return {
    id: `sr:${companyId}:${p.id}`, title: p.name.replace(/\s*[(\u2013-].*$/, "").trim() || p.name.trim(), company: p.company?.name || label, location, remote: !!l.remote || /remote/i.test(location),
    source: "smartrecruiters", postedAt: p.releasedDate?.slice(0, 10), url: `https://jobs.smartrecruiters.com/${companyId}/${p.id}`,
    stage: "found", notes: "", keywords: extractKeywords(p.name),
  };
}

export async function fetchSmartRecruiters(usOnly: boolean, spec: SearchSpec, signal?: AbortSignal): Promise<Role[]> {
  const terms = searchTerms(spec);
  const queries = terms.length ? terms : [""];
  const jobs: [typeof SR_COMPANIES[number], string][] = SR_COMPANIES.flatMap((c) => queries.map((q) => [c, q] as [typeof SR_COMPANIES[number], string]));
  const out = new Map<string, Role>();
  let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < jobs.length) {
      const [c, q] = jobs[i++];
      try {
        const url = `https://api.smartrecruiters.com/v1/companies/${c.id}/postings?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}${usOnly ? "&country=us" : ""}${spec.city ? `&city=${encodeURIComponent(spec.city)}` : ""}`;
        const d = await getJson<{ content?: SrPosting[] }>(url, signal);
        for (const p of d.content ?? []) {
          const role = mapPosting(p, c.id, c.label);
          if (!isRelevant(role.title, usOnly ? role.location || "United States" : "", usOnly, spec)) continue;
          // One store posts the same title many times: keep one per employer, title and town.
          out.set(`${c.id}|${role.title.toLowerCase()}|${role.location}`, role);
        }
      } catch { /* one company down should not stop the rest */ }
    }
  }));
  return [...out.values()];
}
