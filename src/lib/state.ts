"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PROFILE, SEED_ROLES } from "./data";
import { DEFAULT_WEIGHTS } from "./score";
import type { Profile, Role, Weights } from "./types";

export interface AppState {
  profile: Profile;
  weights: Weights;
  roles: Role[];
  resume: string;
  resumeName: string;
  dailyGoal: number;
  /** Becomes true once a resume has been analysed, so the app can start in the right place. */
  onboarded: boolean;
  /** The best of the last search, so Today's queue works before anything is searched again. */
  lastResults: Role[];
  /** The day of the last search. Roles posted on or after it are "new". */
  lastSearchAt: string;
  /** Roles dismissed from the queue, by day. */
  skipped: Record<string, string>;
}

const KEY = "applyr:v3";
const initial = (): AppState => ({
  profile: DEFAULT_PROFILE, weights: DEFAULT_WEIGHTS, roles: SEED_ROLES, resume: "", resumeName: "", dailyGoal: 10, onboarded: false,
  lastResults: [], lastSearchAt: "", skipped: {},
});

/** Fills anything an older save lacks, so a new field never breaks someone's saved board. */
export function normalise(saved: Partial<AppState>): AppState {
  const base = initial();
  return {
    ...base, ...saved,
    profile: { ...base.profile, ...saved.profile, kit: { ...base.profile.kit, ...saved.profile?.kit } },
    weights: { ...base.weights, ...saved.weights },
    roles: saved.roles ?? base.roles,
    lastResults: saved.lastResults ?? [],
    skipped: saved.skipped ?? {},
  };
}

/**
 * Everything lives in the visitor's own browser. There is no server and no
 * account: that is why resume parsing and the live job search can run safely
 * in public. The resume text never leaves the page.
 */
export function useAppState() {
  const [state, setState] = useState<AppState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem("applyr:v2");
      if (raw) setState(normalise(JSON.parse(raw) as Partial<AppState>));
    } catch {
      /* corrupt or unavailable storage: start from the defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state, (k, v) => (k === "description" ? undefined : v))); } catch { /* quota or private mode */ }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const replace = useCallback((s: Partial<AppState>) => setState(normalise(s)), []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); localStorage.removeItem("applyr:v2"); } catch { /* ignore */ } setState(initial()); }, []);
  return { state, update, replace, reset, hydrated };
}
