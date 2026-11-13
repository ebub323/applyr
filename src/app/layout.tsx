import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Applyr: grade your resume, find the jobs you match",
  description:
    "Upload your resume to see how it grades, then search live postings in any field, from healthcare to software, ranked by how well you match. A small local AI tailors your resume to each job. Runs in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#010102] text-[#f7f8f8]">
        <header className="sticky top-0 z-30 border-b border-[#23252a] bg-[#010102]/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="anim-wiggle grid size-8 place-items-center rounded-lg bg-[#5e6ad2] text-sm font-semibold text-white">
                A
              </span>
              <span className="text-[15px] font-semibold">Applyr</span>
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
