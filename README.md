# Applyr

**Live:** https://applyr.techboy.dev · **How it works:** https://applyr.techboy.dev/how-it-works/

Upload your resume, see how it grades, then search live internship and entry-level postings
ranked by how well you match. Everything runs in the browser: your resume is never uploaded.

## What it does

| Step | What happens |
| --- | --- |
| **Resume** | Reads a PDF, DOCX or pasted text on-device. Extracts contact details, sections, bullets, graduation year, GPA and technologies, then grades it with 15 transparent checks (ATS readiness, impact, technical depth, completeness). Edit the text and the grade updates live. |
| **Profile** | Skills and target roles are filled from the resume. Answer where you can work, whether you will relocate, citizenship and pay. Seven weights re-rank everything as you drag them. |
| **Discover** | Pulls live postings from Greenhouse, Lever and Ashby (31 boards by default, any company can be added). Filters out senior, advanced-degree and non-software roles, deduplicates one-job-per-city, and reads the full description of the best candidates. |
| **Match** | Every role gets 0-100 as a sum of named factors, with the skills you have and lack. A what-if engine shows which missing skill lifts the most roles to a strong match. |
| **Board** | Drag roles from Found to Offer, keep notes, track a daily goal, export CSV. |

## Design decisions worth defending

- **Client-side only.** The job boards send `Access-Control-Allow-Origin: *`, so a browser can read them directly. No server, no key, no scraping, and no resume ever leaves the device.
- **Every number carries its reasons.** `scoreFit()` returns each factor's signed contribution. `parseResume()` returns each check's points. A score you cannot explain is a score you cannot debug.
- **Weights are multipliers on named factors.** Tunable in the UI, deliberately blunt: a learned model over a few hundred applications would overfit and could not be explained.
- **A fixed skills vocabulary, not a model.** The extractor cannot hallucinate a skill the text never named.
- **Eligibility outranks skills.** A citizenship requirement costs more than any skill gains, because it decides whether you can be hired at all.

## Two bugs worth knowing about

1. A bare `intern` substring also matches **Internal**, **International** and **Internals**. Match `\bintern\b`.
2. A US-location test of `, [A-Z]{2}` also matches **", IE"** (Dublin), and `, CA` is both California *and* Canada ("Toronto, ON, CA"). Rule Canada out by name before trusting a state code.

Both have regression tests in `src/lib/ats.test.ts`.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # 30 tests
npm run build   # static export to out/
```

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind v4 · pdf.js and JSZip (loaded only when a file is uploaded) · Vitest · GitHub Actions
