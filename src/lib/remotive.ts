import { isRelevant, type SearchSpec } from "./ats";
import { fieldById, FIELDS } from "./fields";
import { extractFlags, extractKeywords, htmlToText } from "./keywords";
import type { Role } from "./types";

/**
 * Remotive publishes remote jobs across every field (support, sales, finance,
 * healthcare, teaching, design...) as public JSON that browsers may read. Its
 * terms ask for a link back and a mention as the source, which the UI gives.
 * It asks not to be polled often, so each category is cached for six hours.
 */
export const REMOTIVE_URL = "https://remotive.com";
const TTL_MS = 6 * 3600_000;

interface RemotiveJob {
  id: number; url: string; title: string; company_name: string; category?: string; publication_date?: string;
  candidate_required_location?: string; salary?: string; description?: string;
}

/** Remotive jobs are remote, so "United States" means the person may live there. */
const OPEN_TO_US = /(worldwide|anywhere|usa?\b|united states|americas?|north america|^$)/i;

export function categoriesFor(targets: string[]): string[] {
  const fields = targets.length ? targets.map(fieldById).filter((f) => !!f) : FIELDS;
  return [...new Set(fields.flatMap((f) => f!.remotive))];
}

export function mapRemotive(j: RemotiveJob): Role {
  const text = htmlToText(j.description ?? "");
  const location = j.candidate_required_location || "Remote";
  return {
    id: `remotive:${j.id}`, title: j.title.trim(), company: j.company_name, location, remote: true, source: "remotive",
    postedAt: j.publication_date?.slice(0, 10), url: j.url, stage: "found", notes: "", category: j.category,
    keywords: extractKeywords(`${j.title} ${text}`), flags: extractFlags(text), descriptionLoaded: true, description: text.slice(0, 6000),
  };
}

export function parseRemotive(raw: unknown, usOnly: boolean, spec: SearchSpec): Role[] {
  const jobs = (raw as { jobs?: RemotiveJob[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Role[] = [];
  for (const j of jobs) {
    if (!j?.title || !j.url) continue;
    if (usOnly && !OPEN_TO_US.test(j.candidate_required_location ?? "")) continue;
    // Location is already settled above; the title filter is the same one the company boards use.
    if (!isRelevant(j.title, "Remote", false, spec)) continue;
    out.push(mapRemotive(j));
  }
  return out;
}

async function fetchCategory(slug: string, signal?: AbortSignal): Promise<unknown> {
  const key = `applyr:remotive:${slug}`;
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null") as { at: number; data: unknown } | null;
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  } catch { /* no cache */ }
  const res = await fetch(`${REMOTIVE_URL}/api/remote-jobs?category=${slug}&limit=150`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  try {
    // Keep the cache small: only what the app reads.
    const slim = { jobs: ((data as { jobs?: RemotiveJob[] }).jobs ?? []).map(({ id, url, title, company_name, category, publication_date, candidate_required_location, description }) => ({ id, url, title, company_name, category, publication_date, candidate_required_location, description: (description ?? "").slice(0, 9000) })) };
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: slim }));
  } catch { /* quota */ }
  return data;
}

export async function fetchRemotive(usOnly: boolean, spec: SearchSpec, signal?: AbortSignal): Promise<Role[]> {
  const seen = new Set<string>();
  const out: Role[] = [];
  for (const slug of categoriesFor(spec.targets)) {
    for (const r of parseRemotive(await fetchCategory(slug, signal), usOnly, spec)) {
      if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    }
  }
  return out;
}
