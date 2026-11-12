import { matchDetail } from "./score";
import type { Kit, Profile, Role } from "./types";

const plain = (s: string) => s.trim();
const joinList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Every line states only what the person's own resume says. Missing facts are left out, never invented. */
export function coverNote(kit: Kit, role: Pick<Role, "title" | "company" | "keywords">, profile: Profile): string {
  const have = matchDetail(role, profile).have.slice(0, 4);
  const where = kit.school ? ` at ${plain(kit.school)}` : "";
  const grad = kit.gradDate ? ` (graduating ${plain(kit.gradDate)})` : "";
  const study = kit.degree ? `working toward a ${plain(kit.degree)}${where}` : kit.school ? `a student${where}` : "";
  const intro = study ? `I'm ${study}${grad} and I'm applying for the ${role.title} role.` : `I'm applying for the ${role.title} role.`;
  const parts = [`Hi ${role.company} team,`, intro];
  if (have.length) parts.push(`The technologies this role names that I work with most are ${joinList(have)}.`);
  if (kit.pitch) parts.push(`A project I would point you to: ${kit.pitch}${/[.\u2026!?]$/.test(kit.pitch) ? "" : "."}`);
  parts.push("I'd welcome the chance to talk. Thank you for your time.");
  const sig = [kit.name, [kit.email, kit.phone].filter(Boolean).join(" | "), [kit.linkedin, kit.github].filter(Boolean).join(" | ")].filter(Boolean);
  return `${parts.join("\n\n")}\n\n${sig.join("\n")}`;
}

export function followUpNote(kit: Kit, role: Pick<Role, "title" | "company">, appliedOn: string): string {
  return [
    `Hi ${role.company} recruiting team,`,
    `I applied for the ${role.title} role on ${appliedOn} and wanted to confirm it reached you. I'm still very interested and glad to share anything that would help.`,
    "Thank you for your time.",
    [kit.name, [kit.email, kit.phone].filter(Boolean).join(" | ")].filter(Boolean).join("\n"),
  ].join("\n\n");
}

/** The skills the posting names that you have, listed first, so the line a recruiter reads first matches the role. */
export function tailoredSkillsLine(role: Pick<Role, "keywords">, profile: Profile): string {
  const { have } = matchDetail(role, profile);
  const lower = new Set(have.map((h) => h.toLowerCase()));
  const rest = profile.skills.filter((s) => !lower.has(s.toLowerCase()));
  return [...have, ...rest].join(", ");
}

export function kitAsText(kit: Kit): string {
  const rows: [string, string][] = [["Name", kit.name], ["Email", kit.email], ["Phone", kit.phone], ["Location", kit.location], ["LinkedIn", kit.linkedin],
    ["GitHub", kit.github], ["Website", kit.website], ["School", kit.school], ["Degree", kit.degree], ["Graduation", kit.gradDate], ["GPA", kit.gpa]];
  return rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
}
