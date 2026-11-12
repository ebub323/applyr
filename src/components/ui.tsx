"use client";
import { useEffect, useState } from "react";

export function fitTone(fit: number) {
  if (fit >= 75) return "bg-emerald-600";
  if (fit >= 55) return "bg-amber-500";
  return "bg-slate-400";
}

export function FitPill({ fit }: { fit: number }) {
  return (
    <span className={`inline-block min-w-9 rounded-md px-2 py-0.5 text-center font-mono text-[12px] font-bold text-white ${fitTone(fit)}`}>{fit}</span>
  );
}

/** Rotating colours so a row of tags reads as a row of different things. */
export const TAG_TONES = [
  "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/30",
  "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
  "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
  "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30",
  "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30",
  "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-500/10 dark:text-teal-200 dark:ring-teal-500/30",
];
export const tagTone = (s: string) => TAG_TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TAG_TONES.length];

export const card =
  "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/60 dark:bg-[#16181d]";
export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:border-slate-600 dark:bg-[#101216] dark:focus:ring-blue-500/20";
export const btn =
  "press rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "press rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800";

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1.5 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-200/60 dark:border-slate-500/30 dark:bg-[#101216]">
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
const CONFETTI = ["#2563eb", "#10b981", "#f59e0b", "#0ea5e9", "#64748b", "#f43f5e"];
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
