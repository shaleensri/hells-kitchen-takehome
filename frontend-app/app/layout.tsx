import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

// Design system pass (pulled forward before Iteration 4, see PLAN.md §3.18):
// a warm, characterful serif for headings (food-editorial feel, not generic
// system UI) paired with a clean, highly-legible sans for body/UI text.
// Both self-hosted at build time by next/font — no extra runtime requests.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Hell's Kitchen — Recipe Manager",
  description: "Browse, search, and organize recipes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning here only covers attributes on <html> itself —
    // some browser extensions (ad blockers, price-comparison tools, etc.)
    // inject data-* attributes into <html>/<body> before React hydrates,
    // which React otherwise (correctly, but noisily) flags as a mismatch.
    // Doesn't hide a real content mismatch anywhere else in the tree.
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <header className={styles.header}>
          <div className={`container ${styles.headerInner}`}>
            <Link href="/recipes" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true">
                🔥
              </span>
              Hell&rsquo;s Kitchen
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
