"use client";
import { useEffect, useState } from "react";

export function fitTone(fit: number) {
  if (fit >= 75) return "bg-emerald-600";
  if (fit >= 55) return "bg-amber-500";
  return "bg-slate-400";
}

export function FitPill({ fit }: { fit: number }) {
  return (
    <span className={`inline-block min-w-9 rounded-md px-2 py-0.5 text-center font-mono text-[12px] font-medium text-white ${fitTone(fit)}`}>{fit}</span>
  );
}

/** Quiet tags: two tones, so a row reads as a list of terms and not a bag of sweets. */
export const TAG_TONES = [
  "bg-[#edecfb] text-[#36439f] ring-1 ring-inset ring-[#dcdaf6]",
  "bg-[#efeff5] text-[#3d3860] ring-1 ring-inset ring-[#e1e0ec]",
];
export const tagTone = (s: string) => TAG_TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % TAG_TONES.length];

export const card =
  "rounded-2xl border border-[#e1e0ec] bg-white";
export const input =
  "w-full rounded-lg border border-[#d6d5e3] bg-white px-3 py-2 text-sm outline-none transition placeholder:text-[#9896ad] focus:border-[#5266eb] focus:ring-2 focus:ring-[#5266eb]/20";
export const btn =
  "rounded-full bg-[#5266eb] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4354c7] disabled:cursor-not-allowed disabled:opacity-40";
export const btnGhost =
  "rounded-full border border-[#d6d5e3] bg-white px-4 py-2 text-sm font-medium text-[#3d3860] transition hover:border-[#9896ad] hover:bg-[#f7f7fb] disabled:opacity-40";

export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.some((v) => v.toLowerCase() === p.toLowerCase()))]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#d6d5e3] bg-white p-1.5 transition focus-within:border-[#5266eb] focus-within:ring-2 focus-within:ring-[#5266eb]/20">
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
const CONFETTI = ["#5e6ad2", "#27a644", "#828fff", "#d0d6e0", "#8a8f98", "#f7f8f8"];
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
