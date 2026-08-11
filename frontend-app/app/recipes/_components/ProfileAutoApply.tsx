"use client";

/**
 * Auto-applies the saved dietary profile (PLAN.md §3.1, Iteration 5) as the
 * default `dietary` filter — but only on a genuinely fresh, param-less visit
 * to /recipes. If any search param is already present, the user has an
 * intentional filter state (including one where they deliberately cleared
 * dietary) and this must not fight them by re-injecting it.
 *
 * Trade-off, documented rather than hidden: because this runs client-side
 * after the server already rendered the unfiltered list, a fresh landing
 * with a saved profile shows a brief flash of the unfiltered grid before
 * the redirect lands. No backend session/cookie exists to avoid this
 * (§3.1 — no accounts in scope), and it only happens once per landing, so
 * it was accepted rather than built around.
 *
 * Renders nothing — pure side effect, mounted once on the recipes list page.
 */
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/lib/profile";

export function ProfileAutoApply() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, hydrated } = useProfile();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || !hydrated) return;
    applied.current = true;
    if (searchParams.size === 0 && profile.dietary.length > 0) {
      router.replace(`/recipes?dietary=${profile.dietary.join(",")}`);
    }
    // Deliberately excludes `searchParams`/`router` from deps beyond the
    // initial run — this should fire once per mount (fresh landing), not
    // re-run every time the URL changes as a result of its own redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile]);

  return null;
}
