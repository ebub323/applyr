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
}

const KEY = "applyr:v2";
const initial = (): AppState => ({
  profile: DEFAULT_PROFILE, weights: DEFAULT_WEIGHTS, roles: SEED_ROLES, resume: "", resumeName: "", dailyGoal: 10, onboarded: false,
});

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
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<AppState>;
        const base = initial();
        setState({
          ...base, ...saved,
          profile: { ...base.profile, ...saved.profile },
          weights: { ...base.weights, ...saved.weights },
          roles: saved.roles ?? base.roles,
        });
      }
    } catch {
      /* corrupt or unavailable storage: start from the defaults */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  }, [state, hydrated]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setState(initial()); }, []);
  return { state, update, reset, hydrated };
}
