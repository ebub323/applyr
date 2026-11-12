import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Applyr — job search autopilot",
  description:
    "Ranks, tracks and files job applications. Built because applying to 50 roles a day is a data problem, not a willpower problem.",
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
        <footer className="border-t border-neutral-200 px-5 py-6 text-center text-xs text-neutral-500 dark:border-neutral-800">
          Applyr · demo dataset · the live run writes to a private database
        </footer>
      </body>
    </html>
  );
}
