export const metadata = { title: "How Applyr works" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-neutral-900 font-mono text-xs text-white dark:bg-white dark:text-neutral-900">{n}</span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{children}</p>
      </div>
    </li>
  );
}

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-3 text-neutral-600 dark:text-neutral-400">
        Applying at volume fails in two places: a resume that software cannot read or a recruiter will not finish, and a search that
        wastes the day on roles you will never get. Applyr works on both, and it does all of it in your browser.
      </p>

      <ol className="mt-9 space-y-7">
        <Step n={1} title="Read your resume">
          Upload a PDF, DOCX or text file, or paste it. The text is extracted on your device with no upload. Contact details, sections,
          bullets, graduation year, GPA and 60-odd technologies are pulled out by rules you can read, not a model that guesses.
        </Step>
        <Step n={2} title="Grade it, check by check">
          Fifteen checks across ATS readiness, impact, technical depth and completeness. Do bullets start with a verb? Do they
          contain a number? Are there filler phrases? Do projects link to proof? Every point awarded or withheld is listed with the
          fix, and you can edit the text and watch the grade move.
        </Step>
        <Step n={3} title="Tell it what you want">
          Your skills and target roles are filled in from the resume. Then answer the questions that actually decide a match:
          where you can work, whether you will relocate, citizenship, minimum pay. Seven sliders set how much each factor counts.
        </Step>
        <Step n={4} title="Search real postings, live">
          Greenhouse, Lever and Ashby publish every company&rsquo;s open roles as public JSON that browsers are allowed to read, so there is
          no server and no scraping. Applyr pulls the boards you choose, drops senior, advanced-degree and non-software roles, collapses
          one job posted per city into one, and reads the full descriptions of the best candidates.
        </Step>
        <Step n={5} title="Rank by match, with the reason">
          Each role gets 0 to 100. The score is the sum of named factors: title, skills, location, eligibility, pay, freshness and how
          painful the application portal is. Open any role to see each factor, what it contributed, and which skills you have and lack.
        </Step>
        <Step n={6} title="Find the skill that unlocks the most roles">
          For the roles you nearly match, Applyr counts the skills they keep asking for and re-scores everything as if you had each
          one. &ldquo;Adding Kubernetes lifts 2 roles to a strong match&rdquo; is a computed answer, not a guess.
        </Step>
        <Step n={7} title="Search past the company boards">
          Company boards miss most Workday and iCIMS portals. A community-maintained internship list (SimplifyJobs and Pitt CSC) covers
          them, so Applyr reads it live from its public repository, merges it with the boards, and shows a role once even when both
          list it. The data is never copied, and the source is credited in the app.
        </Step>
        <Step n={8} title="Work the day, not the pile">
          Today&rsquo;s queue is your best unapplied matches, sized to what is left of your daily goal. Open a role and mark it applied in
          one click, copy a cover note, skip what does not fit. A streak counts days in a row, and a role you applied to a week ago
          with no reply comes back as a follow-up with a note ready to send.
        </Step>
        <Step n={9} title="Tailor and apply without retyping">
          For any role, see which of its technologies are already on your resume, get your skills line reordered to lead with them,
          and copy every form field from an apply kit filled in from your resume. The cover note is built only from your resume
          and the posting, so it never claims a skill you do not have.
        </Step>
        <Step n={10} title="Track to the offer">
          Drag roles across a board from Found to Offer, or use the move menu on a phone, keep notes, and export a CSV or a full
          backup you can restore on any device. The reply rate tells you whether your approach is working.
        </Step>
      </ol>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Design notes</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        <p><strong className="text-neutral-900 dark:text-neutral-100">Your resume never leaves the page.</strong> Parsing, grading and scoring all run client-side, and the only network calls are to companies&rsquo; public job boards, which carry nothing about you. State lives in localStorage and one click deletes it.</p>
        <p><strong className="text-neutral-900 dark:text-neutral-100">Every number has a reason.</strong> The grade and the match score both return their parts. A ranking you cannot explain is a ranking you cannot fix, so the explanation is the output, not a log line.</p>
        <p><strong className="text-neutral-900 dark:text-neutral-100">Blunt weights on purpose.</strong> A learned model over a few hundred applications would overfit and could not be explained. Linear weights you can drag beat an unexplainable improvement at this data volume.</p>
        <p><strong className="text-neutral-900 dark:text-neutral-100">It is tested where it is easy to be wrong.</strong> There are regression tests for the bugs that bit me: &ldquo;intern&rdquo; matching <em>Internal</em>, &ldquo;, CA&rdquo; matching Canada as well as California, and a race where concurrent fetches overwrote each other and silently dropped roles.</p>
        <p><strong className="text-neutral-900 dark:text-neutral-100">Demo data never counts as your activity.</strong> The sample roles on a fresh board carry made-up dates, so they are excluded from your streak, queue and reply rate. A streak you did not earn would be worse than none.</p>
      </div>
    </div>
  );
}
