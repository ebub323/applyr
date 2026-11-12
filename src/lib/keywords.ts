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
  ["Customer Service", "customer service|customer support|client service"], ["Sales", "sales"], ["CRM", "crm"], ["Salesforce", "salesforce"],
  ["HubSpot", "hubspot"], ["Zendesk", "zendesk"], ["Microsoft Office", "microsoft office|ms office|office 365|microsoft 365|microsoft word|powerpoint"],
  ["PowerPoint", "powerpoint"], ["Google Workspace", "google workspace|g suite|google docs|google sheets"],
  ["QuickBooks", "quickbooks"], ["Accounting", "accounting"], ["Bookkeeping", "bookkeeping"], ["Payroll", "payroll"], ["Budgeting", "budgeting|budgets?"],
  ["Financial Analysis", "financial analysis|financial modeling"], ["GAAP", "gaap"], ["Data Analysis", "data analysis|data analytics"],
  ["Data Entry", "data entry"], ["Scheduling", "scheduling"], ["Inventory", "inventory"], ["Logistics", "logistics"], ["Supply Chain", "supply chain"],
  ["Forklift", "forklift"], ["Safety", "workplace safety|safety protocols?|osha"], ["OSHA", "osha"],
  ["Patient Care", "patient care|direct care"], ["CPR", "cpr"], ["BLS", "bls"], ["EHR", "ehr|emr|electronic health records?"], ["HIPAA", "hipaa"],
  ["Medical Terminology", "medical terminology"], ["Phlebotomy", "phlebotomy"], ["Epic", "epic (?:ehr|emr|systems|hyperspace|certified)"],
  ["Recruiting", "recruiting|talent acquisition|sourcing candidates"], ["Onboarding", "onboarding"], ["HRIS", "hris|workday hcm|adp"], ["Employee Relations", "employee relations"],
  ["Project Management", "project management|pmp"], ["Lesson Planning", "lesson plan(?:ning|s)?"], ["Curriculum Development", "curriculum"],
  ["Classroom Management", "classroom management"], ["Tutoring", "tutoring|tutor"], ["Public Speaking", "public speaking"],
  ["Social Media", "social media"], ["SEO", "seo"], ["Copywriting", "copywriting"], ["Content Writing", "content writing|content creation"],
  ["Google Analytics", "google analytics|ga4"], ["Email Marketing", "email marketing|mailchimp|klaviyo"], ["Canva", "canva"],
  ["Photoshop", "photoshop"], ["Illustrator", "illustrator"], ["Premiere", "premiere"], ["Video Editing", "video editing|final cut|davinci resolve"], ["Photography", "photography"],
  ["Cash Handling", "cash handling|cash register|cash drawer"], ["POS", "pos|point of sale"], ["Food Safety", "food safety|servsafe"],
  ["Bilingual", "bilingual"], ["Spanish", "spanish"], ["Negotiation", "negotiat(?:ion|ing)"], ["Cold Calling", "cold calling|outbound calls?"], ["Lead Generation", "lead generation|prospecting"],
  ["Conflict Resolution", "conflict resolution|de-escalation"], ["Welding", "welding|welder"], ["HVAC", "hvac"], ["CDL", "cdl"], ["Blueprint Reading", "blueprints?"],
  ["Legal Research", "legal research|westlaw|lexisnexis"], ["Compliance", "compliance"], ["Contracts", "contract (?:drafting|review|management)"],
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
