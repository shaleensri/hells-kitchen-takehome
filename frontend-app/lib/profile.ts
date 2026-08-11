"use client";

/**
 * localStorage-based dietary/interest profile (PLAN.md §3.1, §4.3,
 * Iteration 5) — the lightweight substitute for real accounts. Saved once
 * on /preferences, then auto-applied as the default `dietary` filter on a
 * fresh, param-less visit to /recipes (see ProfileAutoApply.tsx) — that
 * auto-apply is the entire point of building this before Iteration 6, per
 * §3.1's "its whole value is auto-applying as their default state".
 */
import { useCallback, useEffect, useState } from "react";
import type { DietaryTag } from "@hells-kitchen/shared";
import { readLocalStorage, writeLocalStorage } from "./storage";

export interface Profile {
  dietary: DietaryTag[];
}

const PROFILE_KEY = "hk:profile";
const PROFILE_EVENT = "hk:profile-changed";
const EMPTY_PROFILE: Profile = { dietary: [] };

export function getProfile(): Profile {
  return readLocalStorage<Profile>(PROFILE_KEY, EMPTY_PROFILE);
}

export function saveProfile(profile: Profile): void {
  writeLocalStorage(PROFILE_KEY, profile);
  window.dispatchEvent(new Event(PROFILE_EVENT));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setHydrated(true);
    const onChange = () => setProfile(getProfile());
    window.addEventListener(PROFILE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(PROFILE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((next: Profile) => {
    saveProfile(next);
    setProfile(next);
  }, []);

  const toggleDietary = useCallback(
    (tag: DietaryTag) => {
      setProfile((current) => {
        const next: Profile = {
          dietary: current.dietary.includes(tag)
            ? current.dietary.filter((t) => t !== tag)
            : [...current.dietary, tag],
        };
        saveProfile(next);
        return next;
      });
    },
    []
  );

  return { profile, hydrated, update, toggleDietary };
}
