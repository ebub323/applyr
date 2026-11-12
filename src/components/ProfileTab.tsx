"use client";
import { useMemo, useState } from "react";
import { kitAsText } from "@/lib/kit";
import { extractKit, parseResume, TARGET_OPTIONS } from "@/lib/resume";
import { DEFAULT_WEIGHTS } from "@/lib/score";
import type { Kit, Profile, Weights } from "@/lib/types";
import CopyButton from "./CopyButton";
import { btn, btnGhost, card, input, TagInput } from "./ui";

const FIELD_GRADS = ["from-violet-600 to-fuchsia-500", "from-sky-500 to-cyan-400", "from-orange-500 to-amber-400", "from-emerald-500 to-teal-400", "from-pink-500 to-rose-400", "from-indigo-500 to-violet-400"];

const WEIGHT_LABELS: { key: keyof Weights; label: string; help: string }[] = [
  { key: "title", label: "Title fit", help: "How much the job title matches what you want" },
  { key: "skills", label: "Skill overlap", help: "How many of the posting's skills and tools you have" },
  { key: "location", label: "Location", help: "Home area, remote, or having to relocate" },
  { key: "eligibility", label: "Eligibility", help: "Citizenship and clearance requirements" },
  { key: "pay", label: "Pay floor", help: "Postings paying under your minimum" },
  { key: "freshness", label: "Freshness", help: "New postings up, stale ones down" },
  { key: "friction", label: "Application effort", help: "Workday-style portals cost more of your time" },
];

function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
      <span><span className="text-sm font-medium">{label}</span>{help && <span className="block text-xs text-neutral-500">{help}</span>}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-fuchsia-500" />
    </label>
  );
}

export default function ProfileTab({ profile, weights, resume, onProfile, onWeights, onNext }: {
  profile: Profile; weights: Weights; resume: string; onProfile: (p: Partial<Profile>) => void; onWeights: (w: Weights) => void; onNext: () => void;
}) {
  const analysis = useMemo(() => parseResume(resume), [resume]);
  const [changing, setChanging] = useState(false);
  const picked = TARGET_OPTIONS.filter((o) => profile.targets.includes(o.id));
  const strength = (id: string) => analysis.targets.find((t) => t.id === id)?.strength;
  const detected = !!resume && picked.length > 0 && !changing;
  const reread = () => {
    const ids = analysis.targets.map((t) => t.id);
    if (!ids.length) return;
    onProfile({ targets: ids, wantTitles: [...new Set(TARGET_OPTIONS.filter((o) => ids.includes(o.id)).flatMap((o) => o.titles))],
      level: analysis.isStudent || analysis.bullets.length < 6 ? "entry" : "any" });
    setChanging(false);
  };
  const toggleTarget = (id: string) => {
    const next = profile.targets.includes(id) ? profile.targets.filter((t) => t !== id) : [...profile.targets, id];
    onProfile({ targets: next, wantTitles: TARGET_OPTIONS.filter((o) => next.includes(o.id)).flatMap((o) => o.titles) });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {detected && (
          <section className={`${card} anim-up overflow-hidden p-0`}>
            <div className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 px-5 py-4 text-white">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">✨ We read your resume</div>
              <h2 className="mt-0.5 text-xl font-extrabold">Looks like you are after {picked.length === 1 ? picked[0].label : picked.slice(0, -1).map((p) => p.label).join(", ") + " and " + picked[picked.length - 1].label}</h2>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2.5">
                {picked.map((o, i) => (
                  <span key={o.id} className={`anim-pop inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-semibold text-white shadow-md ${FIELD_GRADS[i % FIELD_GRADS.length]}`} style={{ animationDelay: `${i * 70}ms` }}>
                    {o.label}{strength(o.id) !== undefined && <span className="rounded-full bg-white/25 px-1.5 text-[11px]">{Math.round(strength(o.id)! * 100)}%</span>}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-violet-950/70 dark:text-violet-100/70">
                {profile.level === "entry" ? "Searching entry-level roles and internships." : "Searching roles at every level."} Not right? Change it and every match re-ranks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className={btn} onClick={onNext}>Looks right, find my matches →</button>
                <button className={btnGhost} onClick={() => setChanging(true)}>Change what I am looking for</button>
              </div>
            </div>
          </section>
        )}

        {!detected && (
        <section className={`${card} anim-up p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">What are you looking for?</h2>
              <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/60">{resume ? "Pick the kinds of work you want. Every answer changes how roles are ranked, immediately." : "Upload your resume and this fills itself in. Or pick by hand."}</p>
            </div>
            <div className="flex gap-2">
              {resume && analysis.targets.length > 0 && <button className={btnGhost} onClick={reread}>✨ Use what my resume says</button>}
              {changing && profile.targets.length > 0 && <button className={btn} onClick={() => setChanging(false)}>Done</button>}
            </div>
          </div>
          {[{ name: "Any kind of work", tech: false }, { name: "Software and IT", tech: true }].map((g) => (
            <div key={g.name} className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{g.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {TARGET_OPTIONS.filter((o) => o.tech === g.tech).map((o) => {
                  const on = profile.targets.includes(o.id);
                  return (
                    <button key={o.id} onClick={() => toggleTarget(o.id)} aria-pressed={on}
                      className={`press rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${on ? "border-transparent bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-md shadow-violet-500/30" : "border-violet-200 bg-white/70 hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:border-violet-500/30 dark:bg-transparent"}`}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <label className="mt-5 block text-sm font-medium">How experienced am I?</label>
          <div className="mt-1.5 inline-flex rounded-lg border border-neutral-300 p-0.5 text-sm dark:border-neutral-700" role="group" aria-label="Experience level">
            {([["entry", "Entry level and internships"], ["any", "Any level"]] as const).map(([v, label]) => (
              <button key={v} aria-pressed={profile.level === v} onClick={() => onProfile({ level: v })}
                className={`rounded-lg px-3 py-1 font-medium transition-all ${profile.level === v ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow" : "text-violet-700 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10"}`}>{label}</button>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Entry level hides senior, lead and manager titles. Any level keeps everything in your fields.</p>

          <label className="mt-5 block text-sm font-medium">Title keywords I would apply to</label>
          <div className="mt-1.5"><TagInput value={profile.wantTitles} onChange={(v) => onProfile({ wantTitles: v })} placeholder="Add a title and press Enter" /></div>

          <label className="mt-5 block text-sm font-medium">My skills</label>
          <div className="mt-1.5"><TagInput value={profile.skills} onChange={(v) => onProfile({ skills: v })} placeholder="Add a skill and press Enter" /></div>
        </section>
        )}

        {detected && (
          <section className={`${card} p-5`}>
            <label className="block text-sm font-medium">Title keywords I would apply to</label>
            <div className="mt-1.5"><TagInput value={profile.wantTitles} onChange={(v) => onProfile({ wantTitles: v })} placeholder="Add a title and press Enter" /></div>
            <label className="mt-5 block text-sm font-medium">My skills</label>
            <div className="mt-1.5"><TagInput value={profile.skills} onChange={(v) => onProfile({ skills: v })} placeholder="Add a skill and press Enter" /></div>
          </section>
        )}

        <section className={`${card} p-5`}>
          <h2 className="text-lg font-semibold">Where and for how much</h2>
          <label className="mt-4 block text-sm font-medium">Home area (comma separated)</label>
          <input className={`${input} mt-1.5`} value={profile.homeMetro} onChange={(e) => onProfile({ homeMetro: e.target.value })} placeholder="Baltimore, Washington, DC" />
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <Toggle checked={profile.willRelocate} onChange={(v) => onProfile({ willRelocate: v })} label="Open to relocating for a term" help="Many internships pay housing. Off means roles outside your area score sharply lower." />
            <Toggle checked={profile.usCitizen} onChange={(v) => onProfile({ usCitizen: v })} label="I can meet a US citizenship requirement" help="Defense and government roles often require it. Off pushes those roles down." />
            <Toggle checked={profile.hasClearance} onChange={(v) => onProfile({ hasClearance: v })} label="I hold a security clearance" />
          </div>
          <label className="mt-3 block text-sm font-medium">Minimum hourly pay: <span className="font-mono">${profile.minHourly}</span></label>
          <input type="range" min={0} max={60} step={1} value={profile.minHourly} onChange={(e) => onProfile({ minHourly: Number(e.target.value) })} className="mt-2 w-full accent-fuchsia-500" />
        </section>

        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-semibold">My apply kit</h2><p className="text-sm text-neutral-500">The details every application form asks for. Copy any one, or all of them, from any role.</p></div>
            <div className="flex gap-2">
              <button className={btnGhost} disabled={!resume} onClick={() => onProfile({ kit: { ...profile.kit, ...Object.fromEntries(Object.entries(extractKit(resume)).filter(([, v]) => v)) } })}>Re-read from my resume</button>
              <CopyButton text={kitAsText(profile.kit)} label="Copy all" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([["name", "Full name"], ["email", "Email"], ["phone", "Phone"], ["location", "City, state"], ["linkedin", "LinkedIn"], ["github", "GitHub"], ["website", "Website"], ["school", "School"], ["degree", "Degree"], ["gradDate", "Graduation"], ["gpa", "GPA"]] as [keyof Kit, string][]).map(([k, label]) => (
              <label key={k} className="block text-xs text-neutral-500">{label}
                <input className={`${input} mt-1 text-sm text-neutral-900 dark:text-neutral-100`} value={profile.kit[k]} onChange={(e) => onProfile({ kit: { ...profile.kit, [k]: e.target.value } })} />
              </label>
            ))}
          </div>
          <label className="mt-3 block text-xs text-neutral-500">The project I lead with in cover notes
            <input className={`${input} mt-1 text-sm text-neutral-900 dark:text-neutral-100`} value={profile.kit.pitch} placeholder="Project name: what it does, in one line" onChange={(e) => onProfile({ kit: { ...profile.kit, pitch: e.target.value } })} />
          </label>
        </section>

        <button className={`${btn} !px-5 !py-2.5 !text-base`} onClick={onNext}>Find my matches →</button>
      </div>

      <section className={`${card} h-fit p-5 lg:col-span-2`}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tune the ranking</h2>
          <button className={btnGhost} onClick={() => onWeights(DEFAULT_WEIGHTS)}>Reset</button>
        </div>
        <p className="mt-1 text-sm text-neutral-500">Care more about location than pay? Slide it. Every role re-ranks as you drag. Zero switches a factor off.</p>
        <div className="mt-4 space-y-4">
          {WEIGHT_LABELS.map((w) => (
            <div key={w.key}>
              <div className="flex justify-between text-sm"><span className="font-medium">{w.label}</span><span className="font-mono text-xs text-neutral-500">{weights[w.key].toFixed(1)}x</span></div>
              <input type="range" min={0} max={2} step={0.1} value={weights[w.key]} aria-label={w.label}
                onChange={(e) => onWeights({ ...weights, [w.key]: Number(e.target.value) })} className="w-full accent-fuchsia-500" />
              <div className="text-xs text-neutral-400">{w.help}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
