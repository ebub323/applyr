"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BROWSER_MODEL, BROWSER_MODEL_LABEL, detectOllama, hasWebGpu, OLLAMA_HOST, pickModel, type Engine, type OllamaModel } from "@/lib/ai";
import { loadDescription } from "@/lib/ats";
import { parseResume } from "@/lib/resume";
import { applyTailoring, engineRunner, tailorResume, type Rewrite, type TailorInput, type TailorResult } from "@/lib/tailor";
import type { Profile, Role } from "@/lib/types";
import CopyButton from "./CopyButton";
import { btn, btnGhost, card, input } from "./ui";

const PREF = "applyr:ai";
type Choice = "ollama" | "browser";

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Suggests changes to your resume for one job, using a small model that runs on this computer. */
export default function AiTailor({ role, profile, resumeText }: { role: Role; profile: Profile; resumeText: string }) {
  const [ollama, setOllama] = useState<OllamaModel[] | null | undefined>(undefined);   // undefined: still looking
  const [choice, setChoice] = useState<Choice | null>(null);
  const [model, setModel] = useState("");
  const [description, setDescription] = useState(role.description ?? "");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [live, setLive] = useState<{ summary: string; rewrites: Rewrite[] }>({ summary: "", rewrites: [] });
  const [skip, setSkip] = useState<Set<number>>(new Set());
  const [useSummary, setUseSummary] = useState(true);
  const abort = useRef<AbortController | null>(null);
  const webgpu = typeof navigator !== "undefined" && hasWebGpu();

  useEffect(() => {
    let alive = true;
    detectOllama().then((m) => {
      if (!alive) return;
      setOllama(m && m.length ? m : null);
      let saved: { choice?: Choice; model?: string } = {};
      try { saved = JSON.parse(localStorage.getItem(PREF) ?? "{}"); } catch { /* none */ }
      const best = m && pickModel(m);
      if (best) { setChoice(saved.choice === "browser" ? "browser" : "ollama"); setModel(saved.model && m!.some((x) => x.name === saved.model) ? saved.model : best); }
      else if (webgpu) setChoice("browser");
    });
    return () => { alive = false; abort.current?.abort(); };
  }, [webgpu]);

  const remember = (c: Choice, m: string) => { try { localStorage.setItem(PREF, JSON.stringify({ choice: c, model: m })); } catch { /* private mode */ } };
  const engine: Engine | null = choice === "ollama" && model ? { kind: "ollama", host: OLLAMA_HOST, model } : choice === "browser" ? { kind: "browser", model: BROWSER_MODEL } : null;

  const analysis = useMemo(() => parseResume(resumeText), [resumeText]);
  const kit = profile.kit;
  const facts = useMemo(() => {
    const f: string[] = [];
    if (kit.degree || kit.school) f.push(`${kit.degree ? `Studying ${kit.degree}` : "Student"}${kit.school ? ` at ${kit.school}` : ""}${kit.gradDate ? `, expected ${kit.gradDate}` : ""}`);
    return f;
  }, [kit.degree, kit.school, kit.gradDate]);

  const run = async () => {
    if (!engine) return;
    const ac = new AbortController(); abort.current = ac;
    setBusy(true); setError(""); setResult(null); setLive({ summary: "", rewrites: [] }); setSkip(new Set()); setUseSummary(true); setProgress(null);
    try {
      let desc = description.trim();
      if (!desc) {
        setStatus("Reading the posting");
        desc = (await loadDescription(role, ac.signal)).trim();
        if (desc) setDescription(desc);
      }
      const input: TailorInput = {
        resume: resumeText, bullets: analysis.bullets, skills: analysis.skills, facts,
        job: { title: role.title, company: role.company, description: desc },
      };
      setStatus(engine.kind === "browser" ? "Loading the model" : "Starting");
      const res = await tailorResume(input, {
        run: engineRunner(engine), signal: ac.signal,
        onStatus: (s) => { setStatus(s); setProgress(null); },
        onProgress: (note, f) => { setStatus(note); setProgress(f); },
        onSummary: (summary) => setLive((l) => ({ ...l, summary })),
        onRewrite: (r) => setLive((l) => ({ ...l, rewrites: [...l.rewrites, r] })),
      });
      if (!ac.signal.aborted) setResult(res);
    } catch (e) {
      if (!ac.signal.aborted) setError(e instanceof Error ? e.message : "The model did not answer.");
    } finally {
      setBusy(false); setStatus(""); setProgress(null);
    }
  };

  const shown = result ?? { ...live, dropped: 0 };
  const accepted = shown.rewrites.filter((r) => !skip.has(r.n));
  const tailored = () => applyTailoring(resumeText, accepted, useSummary ? shown.summary : undefined);
  const fileName = `resume-${role.company}-${role.title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + ".txt";
  const origin = typeof location !== "undefined" ? location.origin : "";

  return (
    <div className={`${card} space-y-3 p-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">Suggest changes with a local AI</h4>
          <p className="text-xs text-neutral-500">A small model on your own computer rewords your bullets for this job. Your resume never leaves it.</p>
        </div>
        {busy
          ? <button className={btnGhost} onClick={() => abort.current?.abort()}>Stop</button>
          : <button className={btn} disabled={!engine || !resumeText || ollama === undefined} onClick={() => void run()}>{result || live.rewrites.length ? "Try again" : "Suggest changes"}</button>}
      </div>

      {!resumeText && <p className="text-xs text-amber-700 dark:text-amber-400">Add your resume on the Resume tab first.</p>}

      {ollama === undefined ? <p className="text-xs text-neutral-500">Looking for a local model...</p> : (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select className={`${input} !w-auto !py-1 text-xs`} aria-label="Where the model runs" value={choice ?? ""} disabled={busy}
            onChange={(e) => { const c = e.target.value as Choice; setChoice(c); remember(c, model); }}>
            {ollama && <option value="ollama">Ollama on this computer</option>}
            {webgpu && <option value="browser">Inside this browser ({BROWSER_MODEL_LABEL})</option>}
            {!ollama && !webgpu && <option value="">No local model found</option>}
          </select>
          {choice === "ollama" && ollama && (
            <select className={`${input} !w-auto !py-1 text-xs`} aria-label="Model" value={model} disabled={busy} onChange={(e) => { setModel(e.target.value); remember("ollama", e.target.value); }}>
              {ollama.map((m) => <option key={m.name} value={m.name}>{m.name} · {(m.size / 1e9).toFixed(1)} GB</option>)}
            </select>
          )}
          {choice === "browser" && <span className="text-neutral-500">One-time download of about 1 GB, then it works offline.</span>}
        </div>
      )}
      {ollama === null && (
        <p className="rounded-lg bg-neutral-100 p-2.5 text-xs leading-relaxed text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {webgpu ? "Ollama was not found, so the in-browser model will be used. " : "This browser cannot run a model itself (no WebGPU). "}
          For a faster, stronger one, install <a className="underline" href="https://ollama.com" target="_blank" rel="noreferrer">Ollama</a>, run <code className="font-mono">ollama pull qwen2.5:3b</code>
          {origin && !origin.includes("localhost") && <>, and start it with <code className="font-mono">OLLAMA_ORIGINS={origin}</code> so this page may talk to it</>}.
        </p>
      )}

      <details open={!role.description && !description}>
        <summary className="cursor-pointer text-xs font-medium text-neutral-500">Job posting text {description ? `(${description.length.toLocaleString()} characters)` : "(will be loaded, or paste it)"}</summary>
        <textarea rows={5} className={`${input} mt-2 text-xs`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the job description here if it could not be loaded" />
      </details>

      {busy && (
        <div className="text-xs text-neutral-500" aria-live="polite">
          {status || "Working"}...
          {progress !== null && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-full bg-neutral-900 transition-all dark:bg-white" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
        </div>
      )}
      {error && <p className="text-xs text-red-700 dark:text-red-400">{error}{/fetch|network|Failed/i.test(error) && choice === "ollama" ? " Is Ollama running, and does it allow this site (OLLAMA_ORIGINS)?" : ""}</p>}

      {(shown.summary || shown.rewrites.length > 0) && (
        <div className="space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {shown.summary && (
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"><input type="checkbox" checked={useSummary} onChange={(e) => setUseSummary(e.target.checked)} className="accent-neutral-900" /> Summary for this job</label>
                <CopyButton text={shown.summary} />
              </div>
              <p className="mt-1.5 rounded-lg bg-emerald-500/10 p-2.5 text-sm leading-relaxed">{shown.summary}</p>
            </div>
          )}
          {shown.rewrites.length > 0 && (
            <ul className="space-y-2.5">
              {shown.rewrites.map((r) => (
                <li key={r.n} className="rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-neutral-900" checked={!skip.has(r.n)} onChange={() => setSkip((s) => { const n = new Set(s); if (n.has(r.n)) n.delete(r.n); else n.add(r.n); return n; })} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-neutral-400 line-through decoration-neutral-300">{r.original}</span>
                      <span className="mt-0.5 block leading-snug">{r.text}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {result && (
            <>
              <p className="text-xs text-neutral-500">
                {result.rewrites.length === 0 ? "Your bullets already read well for this job, so none were changed. " : ""}
                Every line is checked against your resume: a suggestion that adds a number, tool or name you did not write is thrown away{result.dropped ? ` (${result.dropped} this time)` : ""}. Read each one and untick what does not sound like you.
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyButton text={tailored()} label="Copy tailored resume" />
                <button className={btnGhost} onClick={() => download(fileName, tailored())}>Download .txt</button>
              </div>
            </>
          )}
        </div>
      )}
      {result && !result.summary && result.rewrites.length === 0 && !busy && !error && (
        <p className="text-xs text-neutral-500">The model made no safe suggestions this time. {result.dropped ? `${result.dropped} were discarded for adding things your resume does not say. ` : ""}Try again, or pick a larger model.</p>
      )}
    </div>
  );
}
