import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="container" style={{ padding: "80px 20px" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 14 }}>Page not found</h1>
      <p style={{ color: "var(--muted)", marginBottom: 14 }}>
        That page doesn&rsquo;t exist. Try the recipe list instead.
      </p>
      <Link href="/recipes" style={{ color: "var(--accent)", fontWeight: 600 }}>
        ← Back to recipes
      </Link>
    </div>
  );
}
