import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <header className={styles.header}>
          <div className={`container ${styles.headerInner}`}>
            <Link href="/recipes" className={styles.brand}>
              Hell&rsquo;s Kitchen
            </Link>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
