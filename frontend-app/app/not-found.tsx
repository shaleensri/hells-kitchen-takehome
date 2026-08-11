import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="container" style={{ padding: "80px 20px", maxWidth: 480 }}>
      <span style={{ fontSize: "2.2rem" }} aria-hidden="true">
        🍳
      </span>
      <h1 style={{ fontSize: "1.4rem", marginTop: 14, marginBottom: 12 }}>Page not found</h1>
      <p style={{ color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>
        That page doesn&rsquo;t exist. Try the recipe list instead.
      </p>
      <Link href="/recipes" style={{ color: "var(--accent)", fontWeight: 600 }}>
        ← Back to recipes
      </Link>
    </div>
  );
}
