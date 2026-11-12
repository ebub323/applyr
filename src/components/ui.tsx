"use client";
import { useState } from "react";

export function fitTone(fit: number) {
  if (fit >= 75) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (fit >= 55) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400";
}

export function FitPill({ fit }: { fit: number }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${fitTone(fit)}`}>{fit}</span>
  );
}

export const card = "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";
export const input =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";
export const btn =
  "rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-300";
export const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800";

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-300 p-1.5 dark:border-neutral-700">
      {value.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
          {t}
          <button aria-label={`Remove ${t}`} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white" onClick={() => onChange(value.filter((v) => v !== t))}>
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
