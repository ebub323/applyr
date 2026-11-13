import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Applyr: grade your resume, find the jobs you match",
  description:
    "Upload your resume to see how it grades, then search live postings in any field, from healthcare to software, ranked by how well you match. A small local AI tailors your resume to each job. Runs in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f7f7fb] text-[#1f1d33]">
        <header className="border-b border-[#e1e0ec] bg-[#f7f7fb]">
          <div className="mx-auto flex max-w-6xl items-end justify-between px-6 pb-4 pt-6">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="font-serif text-[28px] font-medium leading-none tracking-tight">Applyr</span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-[#70707d] sm:inline">Resume review and job matching</span>
            </Link>
            <nav className="flex items-center gap-6 text-[13px] font-medium text-[#554e7b]">
              <Link href="/" className="hover:text-[#1f1d33]">Workspace</Link>
              <Link href="/how-it-works" className="hover:text-[#1f1d33]">Method</Link>
              <a href="https://github.com/ebub323" className="hover:text-[#1f1d33]">GitHub</a>
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
