import { extractFlags, extractKeywords, htmlToText } from "./keywords";
import { NON_SWE } from "./score";
import type { Role } from "./types";

/**
 * Greenhouse, Lever and Ashby publish their job boards as public JSON with
 * `Access-Control-Allow-Origin: *`, so a visitor's browser can read them
 * directly. No server, no API key, no scraping.
 */
export type AtsSource = "greenhouse" | "lever" | "ashby";
export interface Board { source: AtsSource; slug: string; label: string }

export const PRESET_BOARDS: Board[] = [
  { source: "greenhouse", slug: "stripe", label: "Stripe" },
  { source: "greenhouse", slug: "pinterest", label: "Pinterest" },
  { source: "greenhouse", slug: "datadog", label: "Datadog" },
  { source: "greenhouse", slug: "lyft", label: "Lyft" },
  { source: "greenhouse", slug: "figma", label: "Figma" },
  { source: "greenhouse", slug: "brex", label: "Brex" },
  { source: "greenhouse", slug: "affirm", label: "Affirm" },
  { source: "greenhouse", slug: "vercel", label: "Vercel" },
  { source: "greenhouse", slug: "coinbase", label: "Coinbase" },
  { source: "greenhouse", slug: "databricks", label: "Databricks" },
  { source: "greenhouse", slug: "discord", label: "Discord" },
  { source: "greenhouse", slug: "robinhood", label: "Robinhood" },
  { source: "greenhouse", slug: "airtable", label: "Airtable" },
  { source: "greenhouse", slug: "gitlab", label: "GitLab" },
  { source: "greenhouse", slug: "instacart", label: "Instacart" },
  { source: "greenhouse", slug: "samsara", label: "Samsara" },
  { source: "greenhouse", slug: "anthropic", label: "Anthropic" },
  { source: "greenhouse", slug: "scaleai", label: "Scale AI" },
  { source: "greenhouse", slug: "asana", label: "Asana" },
  { source: "greenhouse", slug: "twilio", label: "Twilio" },
  { source: "greenhouse", slug: "cloudflare", label: "Cloudflare" },
  { source: "greenhouse", slug: "reddit", label: "Reddit" },
  { source: "greenhouse", slug: "verkada", label: "Verkada" },
  { source: "greenhouse", slug: "mixpanel", label: "Mixpanel" },
  { source: "lever", slug: "palantir", label: "Palantir" },
  { source: "ashby", slug: "notion", label: "Notion" },
  { source: "ashby", slug: "ramp", label: "Ramp" },
  { source: "ashby", slug: "openai", label: "OpenAI" },
  { source: "ashby", slug: "linear", label: "Linear" },
];

// Word-boundary "intern" only: a bare substring also matches Internal,
// International and Internals, which floods results with senior roles.
const WANT = /\b(intern|interns|internship|new\s?grad|university\s?grad|entry[\s-]level|junior|apprentice|associate\s+software)\b/i;
const ENG = /\b(software|engineer|engineering|developer|full[\s-]?stack|back[\s-]?end|front[\s-]?end|platform|infrastructure|web)\b/i;
const NOPE = /\b(senior|staff|principal|lead|manager|director|head\s+of|vp|phd|ph\.d|master'?s|high\s?school|mba|ii+|iv)\b/i;
// A state allowlist: matching ", [A-Z]{2}" would also match ", IE" (Dublin) and ", ON" (Toronto).
const US_STATES = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
const US = new RegExp(`(remote|united states|\\busa?\\b|, ?(${US_STATES})\\b|california|new york|washington|texas|massachusetts|seattle|san francisco|boston|chicago|austin|denver|atlanta|baltimore)`, "i");

// ", CA" is both California and Canada. Rule Canada out by name before trusting the state code.
const CANADA = /\b(canada|toronto|vancouver|montreal|ottawa|calgary|waterloo|ontario|british columbia|quebec)\b|, ?(ON|BC|QC|AB)\b/i;

export function isRelevant(title: string, location: string, usOnly: boolean): boolean {
  if (!(WANT.test(title) && ENG.test(title))) return false;
  if (NOPE.test(title) || NON_SWE.test(title)) return false;
  if (usOnly && location && (CANADA.test(location) || !US.test(location))) return false;
  return true;
}

const isRemote = (loc: string) => /remote/i.test(loc);

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status}`);
  return (await res.json()) as T;
}

type Draft = Omit<Role, "id" | "stage" | "notes">;

interface GhJob { id: number; title: string; location?: { name?: string }; absolute_url: string; updated_at?: string }
interface LeverJob { id: string; text: string; categories?: { location?: string }; hostedUrl: string; descriptionPlain?: string; createdAt?: number }
interface AshbyJob { id: string; title: string; location?: string; jobUrl: string; descriptionPlain?: string; publishedAt?: string; isRemote?: boolean }

export async function fetchBoard(b: Board, usOnly: boolean, signal?: AbortSignal): Promise<Role[]> {
  const drafts: Draft[] = [];
  if (b.source === "greenhouse") {
    const d = await getJson<{ jobs: GhJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${b.slug}/jobs`, signal);
    for (const j of d.jobs) {
      const loc = j.location?.name ?? "";
      if (!isRelevant(j.title, loc, usOnly)) continue;
      drafts.push({
        title: j.title.trim(), company: b.label, location: loc, remote: isRemote(loc), source: "greenhouse",
        postedAt: j.updated_at?.slice(0, 10), url: j.absolute_url, keywords: extractKeywords(j.title),
        ext: { slug: b.slug, id: String(j.id) },
      });
    }
  } else if (b.source === "lever") {
    const d = await getJson<LeverJob[]>(`https://api.lever.co/v0/postings/${b.slug}?mode=json`, signal);
    for (const j of d) {
      const loc = j.categories?.location ?? "";
      if (!isRelevant(j.text, loc, usOnly)) continue;
      drafts.push({
        title: j.text.trim(), company: b.label, location: loc, remote: isRemote(loc), source: "lever",
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : undefined,
        url: j.hostedUrl, keywords: extractKeywords(`${j.text} ${j.descriptionPlain ?? ""}`), flags: extractFlags(j.descriptionPlain ?? ""), descriptionLoaded: !!j.descriptionPlain,
      });
    }
  } else {
    const d = await getJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${b.slug}`, signal);
    for (const j of d.jobs) {
      const loc = j.location ?? "";
      if (!isRelevant(j.title, loc, usOnly)) continue;
      drafts.push({
        title: j.title.trim(), company: b.label, location: loc, remote: !!j.isRemote || isRemote(loc), source: "ashby",
        postedAt: j.publishedAt?.slice(0, 10), url: j.jobUrl,
        keywords: extractKeywords(`${j.title} ${j.descriptionPlain ?? ""}`), flags: extractFlags(j.descriptionPlain ?? ""), descriptionLoaded: !!j.descriptionPlain,
      });
    }
  }

  // One role is posted once per location. Collapse on company + normalised title.
  const own = b.label.toLowerCase();
  for (const d of drafts) d.keywords = d.keywords.filter((k) => k.toLowerCase() !== own);

  const seen = new Map<string, Draft>();
  for (const d of drafts) {
    const key = `${d.company}|${d.title.toLowerCase().replace(/[^a-z ]/g, "").trim()}`;
    if (!seen.has(key)) seen.set(key, d);
  }
  return [...seen.values()].map((d) => ({
    ...d, id: `${d.source}:${b.slug}:${d.ext?.id ?? d.url ?? d.title}`, stage: "found" as const, notes: "",
  }));
}

/** Greenhouse's list omits the description, so it is fetched on demand for one role. */
export async function fetchGreenhouseDetails(slug: string, id: string, company: string, signal?: AbortSignal): Promise<Pick<Role, "keywords" | "flags">> {
  const j = await getJson<{ title: string; content?: string }>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${id}`, signal);
  const text = htmlToText(j.content ?? "");
  return { keywords: extractKeywords(`${j.title} ${text}`).filter((k) => k.toLowerCase() !== company.toLowerCase()), flags: extractFlags(text) };
}
