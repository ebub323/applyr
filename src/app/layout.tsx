import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Applyr: grade your resume, find the internships you match",
  description:
    "Upload your resume to see how it grades, then search live internship and entry-level postings ranked by how well you match. Runs entirely in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-lg bg-neutral-900 text-sm text-white dark:bg-white dark:text-neutral-900">
                A
              </span>
              Applyr
            </Link>
            <nav className="flex items-center gap-5 text-sm text-neutral-600 dark:text-neutral-400">
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">Board</Link>
              <Link href="/how-it-works" className="hover:text-neutral-900 dark:hover:text-neutral-100">How it works</Link>
              <a
                href="https://github.com/ebub323"
                className="hover:text-neutral-900 dark:hover:text-neutral-100"
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
