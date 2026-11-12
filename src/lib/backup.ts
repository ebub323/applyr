import type { AppState } from "./state";

const FORMAT = "applyr-backup";

export function exportBackup(state: AppState): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

/** Validate before trusting: a wrong or damaged file must never overwrite someone's board. */
export function parseBackup(text: string): { ok: true; state: Partial<AppState> } | { ok: false; error: string } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "That file is not valid JSON." }; }
  const d = data as { format?: string; version?: number; state?: Partial<AppState> };
  if (!d || d.format !== FORMAT) return { ok: false, error: "That is not an Applyr backup file." };
  if (d.version !== 1) return { ok: false, error: `Backup version ${d.version} is not supported.` };
  const s = d.state;
  if (!s || !Array.isArray(s.roles)) return { ok: false, error: "The backup has no roles in it." };
  if (s.roles.some((r) => !r || typeof r.id !== "string" || typeof r.title !== "string")) return { ok: false, error: "The backup contains a damaged role." };
  return { ok: true, state: s };
}
