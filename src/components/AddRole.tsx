"use client";
import { useState } from "react";
import { extractFlags, extractKeywords } from "@/lib/keywords";
import type { Role, Source } from "@/lib/types";
import { btn, btnGhost, card, input } from "./ui";

/** For a posting found anywhere else. Paste the description and its skills are read out for scoring. */
export default function AddRole({ onAdd, onClose }: { onAdd: (r: Role) => void; onClose: () => void }) {
  const [f, setF] = useState({ title: "", company: "", location: "", url: "", description: "", source: "manual" as Source });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const ok = f.title.trim() && f.company.trim();
  const submit = () => {
    if (!ok) return;
    onAdd({
      id: `manual:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      title: f.title.trim(), company: f.company.trim(), location: f.location.trim(), remote: /remote/i.test(f.location),
      source: f.source, url: f.url.trim() || undefined, stage: "found", notes: "",
      keywords: extractKeywords(`${f.title} ${f.description}`), flags: extractFlags(f.description), descriptionLoaded: !!f.description,
      postedAt: new Date().toISOString().slice(0, 10),
    });
    onClose();
  };
  return (
    <div className={`${card} space-y-3 p-4`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Job title" value={f.title} onChange={(e) => set("title", e.target.value)} />
        <input className={input} placeholder="Company" value={f.company} onChange={(e) => set("company", e.target.value)} />
        <input className={input} placeholder="Location (or Remote)" value={f.location} onChange={(e) => set("location", e.target.value)} />
        <input className={input} placeholder="Link to the posting" value={f.url} onChange={(e) => set("url", e.target.value)} />
      </div>
      <select className={`${input} !w-auto`} value={f.source} onChange={(e) => set("source", e.target.value)} aria-label="Where it was posted">
        <option value="manual">Company site</option><option value="workday">Workday</option><option value="indeed">Indeed</option><option value="handshake">Handshake</option><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option>
      </select>
      <textarea rows={5} className={input} placeholder="Paste the job description to read its required skills (optional)" value={f.description} onChange={(e) => set("description", e.target.value)} />
      <div className="flex gap-2"><button className={btn} disabled={!ok} onClick={submit}>Add to board</button><button className={btnGhost} onClick={onClose}>Cancel</button></div>
    </div>
  );
}
