"use client";
import { useEffect, useState } from "react";

export function fitTone(fit: number) {
  if (fit >= 75) return "from-emerald-500 to-teal-400 shadow-emerald-500/30";
  if (fit >= 55) return "from-amber-500 to-orange-400 shadow-amber-500/30";
  return "from-slate-400 to-slate-500 shadow-slate-500/20";
}

export function FitPill({ fit }: { fit: number }) {
  return (
    <span className={`inline-block min-w-9 rounded-full bg-gradient-to-br px-2 py-0.5 text-center font-mono text-[12px] font-bold text-white shadow-md ${fitTone(fit)}`}>{fit}</span>
  );
}

/** Rotating colours so a row of tags reads as a row of different things. */
export const TAG_TONES = [
  "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
  "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200",
];
export const tagTone = (s: string) => TAG_TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TAG_TONES.length];

export const card =
  "rounded-2xl border border-violet-100 bg-white/90 shadow-[0_1px_2px_rgba(124,58,237,0.06),0_10px_28px_-14px_rgba(124,58,237,0.22)] backdrop-blur dark:border-violet-500/20 dark:bg-[#1a1433]/80";
export const input =
  "w-full rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-200/60 dark:border-violet-500/30 dark:bg-[#140f2b] dark:focus:ring-fuchsia-500/20";
export const btn =
  "press rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";
export const btnGhost =
  "press rounded-xl border border-violet-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-violet-700 transition hover:-translate-y-px hover:border-fuchsia-300 hover:bg-fuchsia-50 disabled:opacity-40 dark:border-violet-500/30 dark:bg-transparent dark:text-violet-200 dark:hover:bg-violet-500/10";

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-violet-200 bg-white p-1.5 transition focus-within:border-fuchsia-400 focus-within:ring-4 focus-within:ring-fuchsia-200/60 dark:border-violet-500/30 dark:bg-[#140f2b]">
      {value.map((t) => (
        <span key={t} className={`anim-pop flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tagTone(t)}`}>
          {t}
          <button aria-label={`Remove ${t}`} className="opacity-50 hover:opacity-100" onClick={() => onChange(value.filter((v) => v !== t))}>
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1)); }}
        onBlur={commit}
      />
    </div>
  );
}

/** A short burst of confetti, for the moment something good happens. Remount with a new `burst` to fire again. */
const CONFETTI = ["#7c3aed", "#d946ef", "#fb923c", "#14b8a6", "#0ea5e9", "#facc15"];
export function Confetti({ burst }: { burst: number }) {
  const [live, setLive] = useState(0);
  useEffect(() => {
    if (!burst) return;
    setLive(burst);
    const t = setTimeout(() => setLive(0), 1300);
    return () => clearTimeout(t);
  }, [burst]);
  if (!live) return null;
  return (
    <div aria-hidden>
      {Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 160 + ((i * 53) % 190);
        return <span key={`${live}-${i}`} className="confetti-bit" style={{
          background: CONFETTI[i % CONFETTI.length],
          ["--dx" as string]: `${Math.cos(angle) * dist}px`, ["--dy" as string]: `${Math.sin(angle) * dist + 120}px`, ["--rot" as string]: `${(i * 97) % 720}deg`,
        }} />;
      })}
    </div>
  );
}
