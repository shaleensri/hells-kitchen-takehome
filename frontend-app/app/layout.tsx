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
    <html lang="en">
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
