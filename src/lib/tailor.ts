import { runModel, type Engine, type Prompt, type RunHandlers } from "./ai";
import { extractKeywords } from "./keywords";
import { replaceBullet } from "./resume";

/**
 * Resume tailoring with a small model, kept honest by code.
 *
 * A small model asked to "tailor a resume" in one go invents things. So the work
 * is split into narrow jobs it can do: reword ONE of your own bullets, or write a
 * two-sentence summary from a list of facts. Which bullets, which skills are
 * missing and what the posting values are decided by plain code, not the model.
 * Then every line the model writes is checked, and thrown away if it adds a
 * number, a tool or a name that the source line did not already contain.
 */
export interface Rewrite { n: number; original: string; text: string }
export interface TailorInput {
  resume: string;
  bullets: string[];
  skills: string[];
  /** Education and the like, as plain facts the summary may use. */
  facts: string[];
  job: { title: string; company: string; description: string };
}
export interface TailorResult {
  summary: string;
  rewrites: Rewrite[];
  /** Suggestions thrown away because they added something the resume does not say. */
  dropped: number;
}

const MAX_REWRITES = 4;
const STOP = new Set(("about above after again also been being between both could does each from have into more most must other over should some such than that their them then there these they this those through under until very were what when where which while will with within would your you our their work working experience ability strong team teams role join looking including required preferred").split(" "));

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const words = (s: string) => s.toLowerCase().match(/[a-z][a-z+#.-]{3,}/g) ?? [];

/** The model never sees the employer's name, so it cannot write as if the person worked there. */
const hideCompany = (text: string, company: string) =>
  company.trim().length > 2 ? text.replace(new RegExp(company.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "the company") : text;

/** Skills the posting names that the resume also shows. Safe for a rewrite to lean on. */
export function sharedTerms(resume: string, jobText: string): string[] {
  const mine = new Set(extractKeywords(resume).map((k) => k.toLowerCase()));
  return extractKeywords(jobText).filter((k) => mine.has(k.toLowerCase()));
}

/** Skills the posting names that the resume does not show. Decided by the vocabulary, not the model. */
export function missingTerms(resume: string, jobText: string): string[] {
  const mine = new Set(extractKeywords(resume).map((k) => k.toLowerCase()));
  return extractKeywords(jobText).filter((k) => !mine.has(k.toLowerCase()));
}

/** Bullets ordered by how much of the posting's language they already share. Indices into `bullets`. */
export function rankBullets(bullets: string[], jobText: string): number[] {
  const want = new Set(words(jobText).filter((w) => !STOP.has(w)));
  const keyed = new Set(extractKeywords(jobText).map((k) => k.toLowerCase()));
  const score = (b: string) => {
    const bw = new Set(words(b));
    let s = 0;
    for (const w of bw) if (want.has(w)) s += 1;
    for (const k of extractKeywords(b)) if (keyed.has(k.toLowerCase())) s += 3;
    return s;
  };
  return bullets.map((b, i) => ({ i, s: score(b), len: b.length })).filter((x) => x.len >= 30)
    .sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.i);
}

/** A few lines a small model can hold: the title, what the posting asks for, and its opening. */
export function jobGist(input: TailorInput): string {
  const text = hideCompany(input.job.description, input.job.company);
  const wants = extractKeywords(`${input.job.title} ${text}`).slice(0, 8);
  const opening = text.slice(0, 220).replace(/\s+\S*$/, "");
  return `${hideCompany(input.job.title, input.job.company)}.${wants.length ? ` Wants: ${wants.join(", ")}.` : ""}${opening ? ` ${opening}` : ""}`;
}

export function rewritePrompt(input: TailorInput, original: string): Prompt {
  const wants = extractKeywords(`${input.job.title} ${hideCompany(input.job.description, input.job.company)}`).slice(0, 8);
  const title = hideCompany(input.job.title, input.job.company);
  return {
    system: "You are a resume editor. You rewrite exactly one bullet. Keep the same meaning and facts; change the opening verb and the phrasing so it sounds closer to the target job. Never add a tool, task, result or number that the bullet does not already contain. Reply with the single rewritten bullet and nothing else.",
    user: `Target job: Customer Support Representative (wants: phone, email, complaints)
Bullet: Helped customers with questions over the phone and by email at the front desk
Rewritten: Resolved customer questions by phone and email at the front desk

Target job: Pharmacy Technician (wants: prescriptions, inventory)
Bullet: Worked on stocking shelves and counting medicine stock each week
Rewritten: Organised inventory by stocking shelves and counting medicine stock each week

Target job: ${title}${wants.length ? ` (wants: ${wants.join(", ")})` : ""}
Bullet: ${original}
Rewritten:`,
  };
}

export function summaryPrompt(input: TailorInput): Prompt {
  const job = jobGist(input);
  const best = rankBullets(input.bullets, job).slice(0, 1).map((i) => `- ${input.bullets[i]}`);
  return {
    system: "You write the opening sentence of a resume summary: who the person is and the single most relevant thing they have done for this job. One sentence. Use only the facts given; add no skill, tool, employer, number or claim that is not in them. No 'I'. No company names.",
    user: `Example
JOB: Pharmacy Technician. Fill prescriptions accurately and keep inventory organised.
FACTS:
- Studying biology at Riverside College, expected 2027
- Skills: inventory, customer service, Microsoft Office
- Counted and restocked medicine stock each week
SUMMARY: Biology student who counted and restocked medicine stock every week.

Now yours
JOB: ${job}
FACTS:
${input.facts.map((f) => `- ${f}`).join("\n") || "- (none given)"}
- Skills: ${input.skills.slice(0, 12).join(", ") || "none listed"}
${best.join("\n")}
SUMMARY:`,
  };
}

/** Models like to add quotes, labels and bullet glyphs. Keep the first real line. */
export function cleanLine(raw: string): string {
  const line = raw.split("\n").map((l) => l.trim()).find((l) => l && !/^(here|sure|reworded|rewrite|summary)\b.*:$/i.test(l)) ?? "";
  let t = line;
  for (let k = 0; k < 3; k++) {
    t = t.replace(/^(reworded bullet|rewritten|rewrite|summary)\s*:\s*/i, "").replace(/^["'“]+|["'”]+$/g, "").replace(/^[\s\-*•·▪–—]+/, "").trim();
  }
  return t.replace(/^\d+[.)]\s+/, "");
}

/** Capitalised words in the middle of a sentence are names (employers, schools, tools). */
function invented(text: string, source: string): boolean {
  const known = new Set(source.toLowerCase().match(/[a-z][a-z'+#.-]*/g) ?? []);
  for (const m of text.matchAll(/(?<=[a-z,;:)] )[A-Z][A-Za-z]{2,}/g)) if (!known.has(m[0].toLowerCase())) return true;
  return false;
}
const numbers = (s: string) => new Set(s.match(/\d[\d,.]*%?|\$\d[\d,.]*[kKmM]?/g) ?? []);

/** True when `text` adds no number, no recognised skill and no name that `source` lacks. */
export function addsNothingNew(text: string, source: string): boolean {
  if (invented(text, source)) return false;
  const have = numbers(source);
  for (const n of numbers(text)) if (!have.has(n)) return false;
  const known = new Set(extractKeywords(source).map((k) => k.toLowerCase()));
  return extractKeywords(text).every((k) => known.has(k.toLowerCase()));
}

const ENDINGS = /(ing|ed|es|s|ly|er|ion)$/;
const stem = (w: string) => w.replace(ENDINGS, "").slice(0, 5);

/** Content words in `text` that the source never used (other than the opening verb). A reword reuses; an invention adds. */
export function newWords(text: string, source: string): string[] {
  const have = new Set((source.toLowerCase().match(/[a-z]+/g) ?? []).map(stem));
  const ws = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return ws.slice(1).filter((w) => w.length >= 6 && !have.has(stem(w)));
}

export type Verdict = "ok" | "unchanged" | "rejected";
export function checkRewrite(original: string, text: string): Verdict {
  if (!text || norm(text) === norm(original)) return "unchanged";
  const longest = Math.max(original.length * 1.5, original.length + 40);
  if (text.length > longest || text.length < 12 || !addsNothingNew(text, original) || newWords(text, original).length > 1) return "rejected";
  return "ok";
}

export function checkSummary(text: string, input: TailorInput): boolean {
  const company = norm(input.job.company);
  if (text.length < 30 || text.length > 260 || /\bI\b/.test(text)) return false;
  if (company.length > 2 && norm(text).includes(company)) return false;
  const source = `${input.resume}\n${input.facts.join("\n")}`;
  return addsNothingNew(text, source) && newWords(text, source).length <= 2;
}

export interface TailorHooks {
  signal?: AbortSignal;
  /** Runs one prompt. Defaults to the chosen local engine; tests pass a stub. */
  run: (p: Prompt, h: RunHandlers) => Promise<string>;
  onStatus?: (note: string) => void;
  onProgress?: RunHandlers["onProgress"];
  onSummary?: (text: string) => void;
  onRewrite?: (r: Rewrite) => void;
}

export function engineRunner(engine: Engine): TailorHooks["run"] {
  return (p, h) => runModel(engine, p, h);
}

export async function tailorResume(input: TailorInput, hooks: TailorHooks): Promise<TailorResult> {
  const out: TailorResult = { summary: "", rewrites: [], dropped: 0 };
  const h: RunHandlers = { signal: hooks.signal, onProgress: hooks.onProgress, maxTokens: 220 };
  const job = `${input.job.title}. ${input.job.description}`;

  hooks.onStatus?.("Writing a summary for this job");
  const s = cleanLine(await hooks.run(summaryPrompt(input), h));
  if (checkSummary(s, input)) {
    // The second sentence is written by code from skills the resume and the posting share, so it cannot overreach.
    const shared = sharedTerms(input.resume, `${input.job.title} ${input.job.description}`).slice(0, 4);
    out.summary = `${s.replace(/[.\s]+$/, "")}.${shared.length ? ` Works with ${shared.length > 1 ? `${shared.slice(0, -1).join(", ")} and ${shared[shared.length - 1]}` : shared[0]}.` : ""}`;
    hooks.onSummary?.(out.summary);
  } else if (s) out.dropped++;

  const picks = rankBullets(input.bullets, job).slice(0, MAX_REWRITES);
  for (const [k, idx] of picks.entries()) {
    if (hooks.signal?.aborted) break;
    hooks.onStatus?.(`Rewording bullet ${k + 1} of ${picks.length}`);
    const original = input.bullets[idx];
    const text = cleanLine(await hooks.run(rewritePrompt(input, original), h));
    const verdict = checkRewrite(original, text);
    if (verdict === "ok") { const r = { n: idx + 1, original, text }; out.rewrites.push(r); hooks.onRewrite?.(r); }
    else if (verdict === "rejected") out.dropped++;
  }
  return out;
}

const SECTION = /^(education|experience|work experience|professional experience|projects?|skills|technical skills|certifications?|leadership|activities|employment)\b/i;

/** The resume with the chosen rewrites swapped in and, optionally, a tailored summary under the header. */
export function applyTailoring(resume: string, rewrites: Rewrite[], summary?: string): string {
  let out = resume;
  for (const r of rewrites) out = replaceBullet(out, r.original, r.text);
  if (summary) {
    const lines = out.split("\n");
    let at = lines.findIndex((l, idx) => idx > 0 && SECTION.test(l.trim()));
    if (at < 0) at = Math.min(3, lines.length);
    lines.splice(at, 0, "SUMMARY", summary, "");
    out = lines.join("\n");
  }
  return out;
}
