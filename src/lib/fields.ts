/**
 * The kinds of work Applyr searches for. A field carries everything the rest of
 * the app needs to treat it as a real career direction: the titles to look for,
 * a pattern that recognises those titles in a posting, the skills that point
 * toward it, and the Remotive categories that carry its remote roles.
 */
export interface Field {
  id: string;
  label: string;
  /** Software and IT fields keep the stricter rules that engineering boards need. */
  tech: boolean;
  titles: string[];
  /** Recognises a posting title that belongs to this field. */
  match: RegExp;
  skills: string[];
  /** Remotive category slugs that hold this field's remote roles. */
  remotive: string[];
}

const TECH_TITLE = /\b(software|engineer|engineering|developer|full[\s-]?stack|back[\s-]?end|front[\s-]?end|platform|infrastructure|web|data|machine learning|devops|cloud|security|mobile|ios|android|information technology|it support|help desk|sysadmin)\b/i;

export const FIELDS: Field[] = [
  { id: "web", label: "Frontend / full-stack", tech: true, titles: ["frontend", "front end", "full stack", "web developer"], match: TECH_TITLE, remotive: ["software-development"],
    skills: ["React", "Next.js", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", "Node.js", "Angular", "Vue", "Redux"] },
  { id: "backend", label: "Backend", tech: true, titles: ["backend", "back end", "software engineer intern"], match: TECH_TITLE, remotive: ["software-development"],
    skills: ["Python", "Java", "Go", "SQL", "PostgreSQL", "MySQL", "Node.js", "Django", "Flask", "REST", "GraphQL", "Redis", "Spring", "Express", "C#"] },
  { id: "infra", label: "Platform / DevOps / cloud", tech: true, titles: ["platform", "infrastructure", "devops", "cloud"], match: TECH_TITLE, remotive: ["devops"],
    skills: ["AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "Linux", "CI/CD", "Bash"] },
  { id: "data", label: "Data / machine learning", tech: true, titles: ["data", "machine learning"], match: TECH_TITLE, remotive: ["data", "artificial-intelligence"],
    skills: ["Python", "SQL", "Machine Learning", "Pandas", "NumPy", "TensorFlow", "PyTorch", "Tableau", "Excel", "Power BI"] },
  { id: "mobile", label: "Mobile", tech: true, titles: ["mobile", "ios", "android"], match: TECH_TITLE, remotive: ["software-development"],
    skills: ["React Native", "Swift", "Kotlin", "iOS", "Android", "Flutter"] },
  { id: "security", label: "Security / IT", tech: true, titles: ["security", "it support"], match: TECH_TITLE, remotive: ["information-technology"],
    skills: ["Security", "Networking", "Active Directory", "PowerShell", "Linux"] },
  { id: "swe", label: "General software engineering", tech: true, titles: ["software engineer intern", "software engineering intern", "software developer intern"], match: TECH_TITLE, remotive: ["software-development", "qa"],
    skills: ["Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "Git", "Data Structures", "Algorithms", "Object-Oriented Programming"] },

  { id: "customer", label: "Customer service & support", tech: false, remotive: ["customer-service"],
    titles: ["customer service", "customer support", "support specialist", "customer success", "call center"],
    match: /\b(customer (service|support|success|care|experience)|support (specialist|representative|agent|associate)|service (representative|agent|advisor)|call cent(er|re)|client services?|contact cent(er|re))\b/i,
    skills: ["Customer Service", "CRM", "Zendesk", "Salesforce", "Microsoft Office", "Conflict Resolution", "Bilingual", "Spanish"] },
  { id: "sales", label: "Sales & business development", tech: false, remotive: ["sales", "business-development", "account-management"],
    titles: ["sales", "account executive", "business development", "sales development", "account manager"],
    match: /\b(sales|account (executive|manager|representative)|business development|bdr|sdr|inside sales|territory|outside sales|relationship (manager|banker))\b/i,
    skills: ["Sales", "Salesforce", "CRM", "HubSpot", "Cold Calling", "Lead Generation", "Negotiation", "Customer Service"] },
  { id: "marketing", label: "Marketing & communications", tech: false, remotive: ["marketing", "communications", "writing"],
    titles: ["marketing", "social media", "content", "communications", "public relations"],
    match: /\b(marketing|social media|content (writer|creator|strategist|marketing)|copywriter|communications?|public relations|pr\b|brand|seo|community manager|editor|writer)\b/i,
    skills: ["SEO", "Social Media", "Content Writing", "Copywriting", "Google Analytics", "Email Marketing", "HubSpot", "Canva"] },
  { id: "design", label: "Design & creative", tech: false, remotive: ["design"],
    titles: ["designer", "graphic design", "ux", "video editor", "photographer"],
    match: /\b(design(er)?|graphic|illustrat\w+|ux|ui|creative|video (editor|producer)|photograph\w+|animator|art director|videographer)\b/i,
    skills: ["Photoshop", "Illustrator", "Figma", "Premiere", "Canva", "Video Editing", "Photography"] },
  { id: "finance", label: "Finance & accounting", tech: false, remotive: ["finance", "compliance"],
    titles: ["accountant", "accounting", "bookkeeper", "financial analyst", "payroll", "auditor"],
    match: /\b(financ\w+|account(ant|ing)|bookkeep\w+|audit\w*|payroll|tax|treasury|billing|accounts (payable|receivable)|controller|banking|teller|underwrit\w+|loan)\b/i,
    skills: ["Excel", "QuickBooks", "Accounting", "Bookkeeping", "Financial Analysis", "Payroll", "GAAP", "Budgeting"] },
  { id: "ops", label: "Operations, logistics & supply chain", tech: false, remotive: ["operations", "supply-chain"],
    titles: ["operations", "logistics", "warehouse", "supply chain", "inventory", "dispatcher"],
    match: /\b(operations?|logistics|warehouse|supply chain|inventory|dispatch\w*|fulfillment|shipping|receiving|procurement|purchasing|planner|coordinator|production)\b/i,
    skills: ["Inventory", "Logistics", "Forklift", "Supply Chain", "Scheduling", "Microsoft Office", "Safety", "Excel"] },
  { id: "admin", label: "Administrative & office", tech: false, remotive: [],
    titles: ["administrative assistant", "office assistant", "receptionist", "data entry", "executive assistant"],
    match: /\b(administrative|admin|assistant|receptionist|office (manager|coordinator|clerk)|clerk|secretary|data entry|front desk|scheduler|coordinator)\b/i,
    skills: ["Data Entry", "Microsoft Office", "Scheduling", "Customer Service", "Google Workspace", "Excel"] },
  { id: "hr", label: "HR & recruiting", tech: false, remotive: ["human-resources"],
    titles: ["human resources", "recruiter", "talent acquisition", "hr coordinator", "people operations"],
    match: /\b(human resources|hr|recruit\w+|talent|people (operations|partner)|benefits|onboarding|sourcer)\b/i,
    skills: ["Recruiting", "Onboarding", "HRIS", "Employee Relations", "Payroll", "Microsoft Office"] },
  { id: "health", label: "Healthcare & clinical", tech: false, remotive: ["medical"],
    titles: ["nurse", "medical assistant", "patient care", "pharmacy technician", "caregiver", "phlebotomist"],
    match: /\b(nurs\w+|rn|lpn|cna|medical|clinical|clinic|patient|pharmac\w+|phlebotom\w+|therap\w+|caregiver|health(care)? (aide|assistant|worker)|dental|hygienist|paramedic|emt|care (coordinator|manager)|behavioral)\b/i,
    skills: ["Patient Care", "CPR", "BLS", "EHR", "HIPAA", "Medical Terminology", "Phlebotomy", "Epic"] },
  { id: "education", label: "Education & training", tech: false, remotive: ["education"],
    titles: ["teacher", "tutor", "teaching assistant", "instructor", "trainer", "counselor"],
    match: /\b(teach\w*|tutor\w*|instructor|educator|education|curriculum|trainer|training|counselor|paraprofessional|professor|school|academic advisor)\b/i,
    skills: ["Lesson Planning", "Curriculum Development", "Classroom Management", "Tutoring", "Public Speaking"] },
  { id: "hospitality", label: "Retail, hospitality & food service", tech: false, remotive: ["travel-hospitality"],
    titles: ["retail associate", "server", "barista", "cashier", "host", "team member"],
    match: /\b(retail|store|cashier|barista|server|host(ess)?|bartender|cook|chef|restaurant|hotel|guest|concierge|team member|crew|sales associate|stocker|merchandis\w+|food service|front of house|hospitality)\b/i,
    skills: ["Customer Service", "Cash Handling", "POS", "Food Safety", "Inventory"] },
  { id: "trades", label: "Skilled trades & technicians", tech: false, remotive: [],
    titles: ["technician", "electrician", "mechanic", "maintenance", "driver", "welder"],
    match: /\b(technician|electrician|mechanic|hvac|plumb\w+|weld\w+|machinist|maintenance|driver|cdl|operator|installer|carpenter|apprentice|millwright|inspector)\b/i,
    skills: ["Welding", "HVAC", "CDL", "OSHA", "Blueprint Reading", "Forklift", "Safety"] },
  { id: "legal", label: "Legal & compliance", tech: false, remotive: ["legal"],
    titles: ["paralegal", "legal assistant", "compliance", "contracts"],
    match: /\b(legal|paralegal|attorney|lawyer|compliance|contracts?|regulatory|counsel)\b/i,
    skills: ["Legal Research", "Compliance", "Contracts", "Microsoft Office"] },
  { id: "business", label: "Business, strategy & project management", tech: false, remotive: ["project-management", "strategy", "product"],
    titles: ["project coordinator", "business analyst", "program manager", "consultant", "analyst"],
    match: /\b(project (coordinator|manager)|program (coordinator|manager)|business analyst|consultant|analyst|strategy|product (manager|owner)|management trainee|rotational)\b/i,
    skills: ["Project Management", "Excel", "PowerPoint", "Data Analysis", "Agile", "Microsoft Office"] },
];

export const fieldById = (id: string): Field | undefined => FIELDS.find((f) => f.id === id);
export const isTechField = (id: string): boolean => !!fieldById(id)?.tech;
