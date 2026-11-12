export const metadata = { title: "How Applyr works" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-neutral-900 font-mono text-xs text-white dark:bg-white dark:text-neutral-900">
        {n}
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {children}
        </p>
      </div>
    </li>
  );
}

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        The hard part of applying at volume is not filling forms. It is knowing
        which 50 of 4,000 postings are worth the hour, keeping one identity
        consistent across six portals, and noticing a reply before it goes cold.
      </p>

      <ol className="mt-9 space-y-7">
        <Step n={1} title="Ingest">
          Postings come from Greenhouse, Lever and Ashby job boards, Handshake,
          Workday tenants and Indeed. The first three publish structured JSON per
          company, which is why they are cheap to poll and why a posting from
          them arrives with its real requirements rather than a scraped blob.
          Everything is normalised to one shape before it is stored.
        </Step>
        <Step n={2} title="Score, and keep the reason">
          Every posting is scored 0&ndash;100 against one profile: title match,
          skill overlap, location against a hard commute filter, a pay floor,
          staleness, and the friction of the portal itself. The scorer returns
          its reasons with the number. A ranking you cannot explain is a ranking
          you cannot fix, so the <em>why</em> is a first-class output, not a log
          line.
        </Step>
        <Step n={3} title="Deduplicate">
          The same job is posted to four boards under three titles. Matching on
          company plus normalised title plus location collapses them, so the
          queue holds roles rather than postings &mdash; and nobody gets two
          applications from the same person.
        </Step>
        <Step n={4} title="Apply">
          Accounts are created once per portal and reused, with credentials held
          in a vault outside the repo. High-friction portals &mdash; Workday
          wants a fresh account and your whole history per employer &mdash; are
          scored down rather than skipped, because sometimes the role is worth
          the twenty minutes.
        </Step>
        <Step n={5} title="Watch the inbox">
          A reply is the only real signal in this system. Incoming mail is
          classified as rejection, scheduling request, recruiter question or
          noise, and matched back to the application by company and thread.
          Scheduling requests are checked against a calendar before anything is
          confirmed. Status moves because something happened, never on a guess.
        </Step>
        <Step n={6} title="Measure the funnel">
          Reply rate per source and per score band is the only way to find out
          whether the scorer is any good. If roles scoring 80 do not reply more
          often than roles scoring 60, the weights are wrong and the board says
          so.
        </Step>
      </ol>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Design notes</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        <p>
          <strong className="text-neutral-900 dark:text-neutral-100">
            Scores are computed, never stored.
          </strong>{" "}
          Persisting a score would mean every weight change needed a backfill,
          and old rows would quietly disagree with new ones. Storing the inputs
          and deriving the score keeps one source of truth.
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-neutral-100">
            Stages move on evidence.
          </strong>{" "}
          There is no timer that promotes an application to &ldquo;probably
          reviewed&rdquo;. A stage changes when an email arrives or a portal
          status flips, which means the funnel numbers are worth trusting.
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-neutral-100">
            This page ships demo data.
          </strong>{" "}
          A public portfolio build has no business exposing a real application
          history &mdash; which companies rejected whom is nobody else&rsquo;s
          business. The live run writes to a private Postgres; this build is
          seeded with representative postings so the logic is still inspectable.
        </p>
        <p>
          <strong className="text-neutral-900 dark:text-neutral-100">
            Weights are blunt on purpose.
          </strong>{" "}
          A learned model over a few hundred applications would overfit and could
          not be explained in an interview. Linear weights with stated reasons
          beat an unexplainable improvement at this data volume.
        </p>
      </div>
    </div>
  );
}
