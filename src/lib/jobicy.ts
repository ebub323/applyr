import { isRelevant, type SearchSpec } from "./ats";
import { extractFlags, extractKeywords, htmlToText } from "./keywords";
import type { Role } from "./types";

/** Jobicy lists remote jobs across fields. It asks to be credited and linked, which the UI does. */
export const JOBICY_URL = "https://jobicy.com";
const TTL_MS = 6 * 3600_000;

interface JobicyJob { id: number; url: string; jobTitle: string; companyName: string; jobGeo?: string; jobDescription?: string; pubDate?: string; jobIndustry?: string[] }

const OPEN_TO_US = /(worldwide|anywhere|usa?\b|united states|americas?|north america|^$)/i;

export function parseJobicy(raw: unknown, usOnly: boolean, spec: SearchSpec): Role[] {
  const jobs = (raw as { jobs?: JobicyJob[] })?.jobs;
  if (!Array.isArray(jobs)) return [];
  const out: Role[] = [];
  for (const j of jobs) {
    if (!j?.jobTitle || !j.url) continue;
    if (usOnly && !OPEN_TO_US.test(j.jobGeo ?? "")) continue;
    if (!isRelevant(j.jobTitle, "Remote", false, spec)) continue;
    const text = htmlToText(j.jobDescription ?? "");
    out.push({
      id: `jobicy:${j.id}`, title: j.jobTitle.trim(), company: j.companyName, location: j.jobGeo || "Remote", remote: true, source: "jobicy",
      postedAt: j.pubDate?.slice(0, 10), url: j.url, stage: "found", notes: "", category: j.jobIndustry?.[0],
      keywords: extractKeywords(`${j.jobTitle} ${text}`), flags: extractFlags(text), descriptionLoaded: true, description: text.slice(0, 6000),
    });
  }
  return out;
}

export async function fetchJobicy(usOnly: boolean, spec: SearchSpec, signal?: AbortSignal): Promise<Role[]> {
  const key = "applyr:jobicy";
  let data: unknown = null;
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null") as { at: number; data: unknown } | null;
    if (hit && Date.now() - hit.at < TTL_MS) data = hit.data;
  } catch { /* no cache */ }
  if (!data) {
    const res = await fetch(`${JOBICY_URL}/api/v2/remote-jobs?count=100`, { signal });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
    try {
      const jobs = ((data as { jobs?: JobicyJob[] }).jobs ?? []).map((j) => ({ ...j, jobDescription: (j.jobDescription ?? "").slice(0, 9000) }));
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), data: { jobs } }));
    } catch { /* quota */ }
  }
  return parseJobicy(data, usOnly, spec);
}
