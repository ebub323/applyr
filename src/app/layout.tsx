import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Applyr: grade your resume, find the jobs you match",
  description:
    "Upload your resume to see how it grades, then search live postings in any field, from healthcare to software, ranked by how well you match. A small local AI tailors your resume to each job. Runs in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-[#1e1b2e] dark:text-[#f1edff]">
        <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/70 backdrop-blur-md dark:border-slate-500/20 dark:bg-[#0e0f12]/70">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="anim-wiggle grid size-8 place-items-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-lg">
                A
              </span>
              <span className="text-lg font-bold">Applyr</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-slate-900/70 dark:text-slate-200/70">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-300">Board</Link>
              <Link href="/how-it-works" className="hover:text-blue-600 dark:hover:text-blue-300">How it works</Link>
              <a
                href="https://github.com/ebub323"
                className="hover:text-blue-600 dark:hover:text-blue-300"
              >
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="hidden">
          Applyr · demo dataset · the live run writes to a private database
        </footer>
      </body>
    </html>
  );
}
