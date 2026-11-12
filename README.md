# Applyr

**Live:** https://applyr.techboy.dev · **How it works:** https://applyr.techboy.dev/how-it-works/

Upload your resume, see how it grades, then search live postings in any field (healthcare, sales, support, finance, education, trades, software and more)
ranked by how well you match. Everything runs in the browser: your resume is never uploaded.

## What it does

| Step | What happens |
| --- | --- |
| **Resume** | Reads a PDF, DOCX or pasted text on-device. Extracts contact details, sections, bullets, graduation year, GPA and technologies, then grades it with 15 transparent checks (ATS readiness, impact, technical depth, completeness). Edit the text and the grade updates live. |
| **Profile** | Skills and target roles are filled from the resume. Answer where you can work, whether you will relocate, citizenship and pay. Seven weights re-rank everything as you drag them. |
| **Discover** | Pulls live postings from Greenhouse, Lever and Ashby (31 boards by default, any company can be added). Filters out senior, advanced-degree and non-software roles, deduplicates one-job-per-city, and reads the full description of the best candidates. |
| **Match** | Every role gets 0-100 as a sum of named factors, with the skills you have and lack. A what-if engine shows which missing skill lifts the most roles to a strong match. |
| **Community list** | Also reads the community-maintained Summer 2027 internship list live (about 2,400 US software and data roles, including Workday and iCIMS portals the company APIs cannot reach). Credited in the app and never copied: the repository declares no license. |
| **Today** | A daily queue of your best unapplied matches sized to your goal, a streak, follow-up reminders for applications a week old with no reply, and one-click "open and mark applied". |
| **Tailor and apply** | Per role: which technologies are already on your resume, a skills line reordered to lead with them, an apply kit of copy-ready form fields, and a cover note built only from your resume and the posting. |
| **Resume fixes** | A per-bullet review with the smallest honest rewrite (never inflating "helped" into "led"), applied with one click. |
| **Board** | Drag roles from Found to Offer (a move menu on touch screens), notes, CSV export, and a validated JSON backup you can restore anywhere. |

## Design decisions worth defending

- **Client-side only.** The job boards send `Access-Control-Allow-Origin: *`, so a browser can read them directly. No server, no key, no scraping, and no resume ever leaves the device.
- **Every number carries its reasons.** `scoreFit()` returns each factor's signed contribution. `parseResume()` returns each check's points. A score you cannot explain is a score you cannot debug.
- **Weights are multipliers on named factors.** Tunable in the UI, deliberately blunt: a learned model over a few hundred applications would overfit and could not be explained.
- **A fixed skills vocabulary, not a model.** The extractor cannot hallucinate a skill the text never named.
- **Eligibility outranks skills.** A citizenship requirement costs more than any skill gains, because it decides whether you can be hired at all.

## Three bugs worth knowing about

1. A bare `intern` substring also matches **Internal**, **International** and **Internals**. Match `\bintern\b`.
2. A US-location test of `, [A-Z]{2}` also matches **", IE"** (Dublin), and `, CA` is both California *and* Canada ("Toronto, ON, CA"). Rule Canada out by name before trusting a state code.

3. `list = [...list, ...(await fetch())]` copies `list` **before** the await. With concurrent fetches, later results overwrote earlier ones and roles silently vanished. Read the list after the await. Found by driving the published app, not by a unit test; `src/lib/race.test.ts` now pins it.

The first two have regression tests in `src/lib/ats.test.ts`.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 56 tests
npm run build   # static export to out/
```

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind v4 · pdf.js and JSZip (loaded only when a file is uploaded) · Vitest · GitHub Actions

## Any field, and a local AI

- **Fields.** Pick the kinds of work you want (21 fields, software and otherwise) and a level (entry or any). Titles, skills, scoring and the resume grade all follow: a nurse is not asked for a GitHub link.
- **Sources.** Company boards (now including care, retail, food, finance and education employers) plus remote jobs in every field from Remotive, cached six hours.
- **Tailor with a local AI.** In any role, "Suggest changes" has a small model reword your bullets and write a summary for that job. It runs on your machine: through Ollama if it is running, otherwise inside the browser with WebLLM (about 1 GB, downloaded once). The model never sees the employer's name, works on one bullet at a time, and every line it writes is checked in code: anything that adds a number, tool or name your resume does not already state is discarded. Gaps are listed by vocabulary matching, not by the model.
- For Ollama on a deployed site, start it with `OLLAMA_ORIGINS=https://your-site`.
