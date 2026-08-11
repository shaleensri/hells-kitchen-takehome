import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <div className="container" style={{ padding: "48px 0 64px", maxWidth: 560 }}>
      <div
        className="blueprint"
        style={{
          position: "relative",
          padding: "32px 24px",
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--accent-soft) 0 8px, transparent 8px 16px)",
        }}
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        <div className="eyebrow">Error 404 — page not on file</div>
        <h1 style={{ fontSize: 34, marginTop: 6 }}>Page not found</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.5, margin: "12px 0 20px" }}>
          That page doesn&rsquo;t exist. Try the recipe index instead.
        </p>
        <Link href="/recipes" className="btn btn-primary">
          Back to index
        </Link>
      </div>
    </div>
  );
}
