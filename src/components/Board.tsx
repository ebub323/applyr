"use client";
import { useState } from "react";
import { STAGES, type Role, type Stage } from "@/lib/types";
import type { FitResult } from "@/lib/score";
import { FitPill } from "./ui";

export type Scored = Role & FitResult;

export default function Board({ roles, dueIds, onMove, onSelect }: { roles: Scored[]; dueIds: Set<string>; onMove: (id: string, stage: Stage) => void; onSelect: (id: string) => void }) {
  const [over, setOver] = useState<Stage | null>(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((s) => {
        const col = roles.filter((r) => r.stage === s.id).sort((a, b) => b.fit - a.fit);
        return (
          <div
            key={s.id}
            onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
            onDragLeave={() => setOver((o) => (o === s.id ? null : o))}
            onDrop={(e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, s.id); }}
            className={`w-60 shrink-0 rounded-2xl border p-2.5 transition-colors ${over === s.id ? "border-neutral-900 bg-neutral-100 dark:border-neutral-300 dark:bg-neutral-800" : "border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/60"}`}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              {s.label}<span className="font-mono">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-200 bg-white shadow-sm hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600">
                  <button
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", r.id); e.dataTransfer.effectAllowed = "move"; }}
                    onClick={() => onSelect(r.id)}
                    className="block w-full cursor-grab p-2.5 text-left active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-snug">{r.title}</div>
                      <FitPill fit={r.fit} />
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{r.company} · {r.remote ? "Remote" : r.location}</div>
                    {dueIds.has(r.id) && <div className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">Follow up due</div>}
                    {r.outcome && <div className="mt-1 text-xs text-neutral-400">{r.outcome}</div>}
                  </button>
                  {/* Dragging is unreliable on phones, so touch screens get a plain menu. */}
                  <select aria-label={`Move ${r.title}`} value={r.stage} onChange={(e) => onMove(r.id, e.target.value as Stage)}
                    className="mx-2.5 mb-2.5 hidden w-[calc(100%-1.25rem)] rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs pointer-coarse:block dark:border-neutral-700">
                    {STAGES.map((x) => <option key={x.id} value={x.id}>Move to: {x.label}</option>)}
                  </select>
                </div>
              ))}
              {col.length === 0 && <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-center text-xs text-neutral-400 dark:border-neutral-700">Drop a role here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
