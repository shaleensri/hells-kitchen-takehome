import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "./_components/NavLinks";
import styles from "./layout.module.css";

// Design system pass v2 (PLAN.md §3.20) — replaces §3.19's warm/serif
// direction with the "Industry" spec-sheet look from the user's mockup:
// Barlow Condensed (technical, tracked, uppercase) for headings, Barlow for
// body/UI text. Both self-hosted at build time by next/font.
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Hell's Kitchen — Recipe Index",
  description: "Browse, search, and organize recipes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning here only covers attributes on <html> itself —
    // some browser extensions (ad blockers, price-comparison tools, etc.)
    // inject data-* attributes into <html>/<body> before React hydrates,
    // which React otherwise (correctly, but noisily) flags as a mismatch.
    // Doesn't hide a real content mismatch anywhere else in the tree.
    <html lang="en" suppressHydrationWarning className={`${barlowCondensed.variable} ${barlow.variable}`}>
      <body>
        <header className={styles.header}>
          <div className={`container ${styles.headerInner}`}>
            <Link href="/recipes" className={styles.brand}>
              Hell&rsquo;s Kitchen
            </Link>
            <span className={styles.brandSub}>Recipe Index / Rev. 2</span>
            <NavLinks />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
