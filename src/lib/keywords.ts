/**
 * Pulls known technology terms out of free text. A fixed vocabulary on purpose:
 * it is explainable, fast, and cannot hallucinate a skill the posting never named.
 */
const TERMS: { name: string; pattern: RegExp }[] = [
  ["Python", "python"], ["Java", "java"], ["JavaScript", "javascript"], ["TypeScript", "typescript"],
  ["C++", "c\\+\\+"], ["C#", "c#"], ["Go", "golang"], ["Rust", "rust"], ["SQL", "sql"],
  ["PostgreSQL", "postgres(?:ql)?"], ["MySQL", "mysql"], ["MongoDB", "mongodb"], ["Redis", "redis"],
  ["React", "react"], ["React Native", "react native"], ["Next.js", "next\\.?js"], ["Node.js", "node\\.?js"],
  ["Django", "django"], ["Flask", "flask"], ["Swift", "swift"], ["Kotlin", "kotlin"],
  ["AWS", "aws|amazon web services"], ["GCP", "gcp|google cloud"], ["Azure", "azure"],
  ["Docker", "docker"], ["Kubernetes", "kubernetes|k8s"], ["Terraform", "terraform"],
  ["Git", "git"], ["CI/CD", "ci/cd|continuous integration"], ["REST", "rest(?:ful)? api|rest"],
  ["GraphQL", "graphql"], ["Linux", "linux"], ["Agile", "agile|scrum"],
  ["Machine Learning", "machine learning|ml"], ["Supabase", "supabase"], ["HTML", "html"], ["CSS", "css"],
  ["Data Structures", "data structures"], ["Algorithms", "algorithms?"],
  ["Tailwind", "tailwind(?: css)?"], ["Express", "express(?:\\.js)?"], ["Spring", "spring(?: boot)?"], [".NET", "\\.net"],
  ["Unity", "unity"], ["Jira", "jira"], ["Excel", "excel"], ["Tableau", "tableau"], ["Power BI", "power ?bi"],
  ["PowerShell", "powershell"], ["Bash", "bash|shell scripting"], ["Active Directory", "active directory"],
  ["Networking", "networking|tcp/ip|dns|dhcp|vlans?"], ["Security", "cybersecurity|security\\+|infosec|penetration testing"],
  ["Figma", "figma"], ["Firebase", "firebase"], ["Vue", "vue(?:\\.js)?"], ["Angular", "angular"], ["Redux", "redux"],
  ["Pandas", "pandas"], ["NumPy", "numpy"], ["TensorFlow", "tensorflow"], ["PyTorch", "pytorch"],
  ["iOS", "ios"], ["Android", "android"], ["Flutter", "flutter"], ["Testing", "unit tests?|unit testing|integration tests?|pytest|jest|junit"],
  ["Object-Oriented Programming", "object[- ]oriented|oop"],
].map(([name, p]) => ({
  name,
  pattern: new RegExp(`(?<![a-z0-9+#])(?:${p})(?![a-z0-9+#])`, "i"),
}));

export function extractKeywords(text: string): string[] {
  const out: string[] = [];
  for (const t of TERMS) if (t.pattern.test(text)) out.push(t.name);
  return out;
}

export function htmlToText(html: string): string {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hard requirements that decide eligibility before skills matter. */
export function extractFlags(text: string): ("citizenship" | "clearance")[] {
  const out: ("citizenship" | "clearance")[] = [];
  if (/(u\.?s\.?|united states)\s+citizen(ship)?/i.test(text)) out.push("citizenship");
  if (/(security clearance|ts\/sci|top secret|secret clearance|clearance)/i.test(text)) out.push("clearance");
  return out;
}
