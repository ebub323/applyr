# Applyr

**Live:** https://applyr.unv.run · **How it works:** https://applyr.unv.run/how-it-works/

Ranks, tracks and files job applications. Built because applying to 50 roles a
day is a data problem, not a willpower problem.

## Why it exists

I was about to start applying at volume, and the bottleneck was never filling
forms. It was knowing which 50 of several thousand postings were worth the hour,
keeping one identity consistent across six different portals, and noticing a
reply before it went cold.

## What it does

| Stage | What happens |
| --- | --- |
| Ingest | Pulls postings from the public Greenhouse, Lever and Ashby job-board APIs, plus Handshake, Workday tenants and Indeed, and normalises them to one shape |
| Score | Rates every posting 0–100 against one profile, and returns the *reasons* with the number |
| Deduplicate | Collapses the same role posted to four boards under three titles |
| Apply | One reusable account per portal, credentials held outside the repo |
| Watch | Classifies incoming mail as rejection / scheduling / question / noise and matches it back to the application |
| Measure | Reply rate per source and per score band, which is the only way to tell whether the scorer works |

## Design decisions worth defending

- **Scores are computed, never stored.** Persisting them would mean every weight
  change needed a backfill, and old rows would quietly disagree with new ones.
  Store the inputs, derive the score, keep one source of truth.
- **A score carries its reasons.** `scoreFit()` returns `{ fit, reasons }`. A
  ranking you cannot explain is a ranking you cannot debug.
- **Portal friction is part of the score.** Workday wants a fresh account and
  your whole history per employer; Greenhouse does not. Cheap applications are
  worth more per unit of effort, so friction is a weighted input rather than a
  footnote.
- **Stages move on evidence.** Nothing promotes an application on a timer. A
  stage changes when an email arrives or a portal status flips, which is what
  makes the funnel numbers worth trusting.
- **Weights are blunt on purpose.** A learned model over a few hundred
  applications would overfit and could not be explained. Linear weights with
  stated reasons beat an unexplainable improvement at this data volume.

## The ingest, and two bugs worth knowing about

`ingest.py` hits the public ATS endpoints:

```
Greenhouse  https://boards-api.greenhouse.io/v1/boards/<co>/jobs?content=false
Lever       https://api.lever.co/v0/postings/<co>?mode=json
Ashby       https://api.ashbyhq.com/posting-api/job-board/<co>
```

Filtering intern and junior roles has two traps I walked into:

1. A bare `intern` substring also matches **Int*ern*ationalisation**,
   **Int*ern*al** and **Int*ern*als**, which floods the results with senior
   roles. Match `\bintern\b`.
2. A US-location test of `,\s*[A-Z]{2}\b` also matches **", IE"** (Dublin) and
   **", ON"** (Toronto). Use a state allowlist.

57 company slugs yielded 81 deduplicated intern/junior engineering roles.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # static export to out/
```

## Note on the data

This build ships a representative demo dataset. A public portfolio has no
business exposing a real application history — which companies rejected whom is
nobody else's business — so the live run writes to a private database and only
the logic is inspectable here.

## Stack

Next.js 16 (App Router, static export) · TypeScript · Tailwind v4 · Python for ingest
