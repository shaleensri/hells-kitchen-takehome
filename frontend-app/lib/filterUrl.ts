/**
 * Pure helpers for building /recipes filter URLs server-side. Lets the
 * filter rail render as plain `<a href>` links (server component, no
 * client JS) that toggle one value while preserving every other active
 * filter — the mockup's checkbox/segmented-control rail, implemented
 * without needing a client-side form for the common case.
 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

function toParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v !== "") params.append(key, v);
    }
  }
  return params;
}

function commaList(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns the /recipes?... href with `value` added to or removed from the
 * comma-list at `key`, all other params preserved. */
export function hrefWithToggledListValue(raw: RawSearchParams, key: string, value: string): string {
  const params = toParams(raw);
  const current = commaList(params, key);
  const lower = value.toLowerCase();
  const next = current.some((v) => v.toLowerCase() === lower)
    ? current.filter((v) => v.toLowerCase() !== lower)
    : [...current, value];

  if (next.length > 0) {
    params.set(key, next.join(","));
  } else {
    params.delete(key);
  }
  const qs = params.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export function isListValueActive(raw: RawSearchParams, key: string, value: string): boolean {
  const params = toParams(raw);
  const lower = value.toLowerCase();
  return commaList(params, key).some((v) => v.toLowerCase() === lower);
}

/** Returns the /recipes?... href with a single-value param set (or cleared
 * if `value` is undefined or already the current value — makes the
 * difficulty toggle a real toggle, not just a one-way setter). */
export function hrefWithParam(raw: RawSearchParams, key: string, value: string | undefined): string {
  const params = toParams(raw);
  const current = params.get(key);
  if (value === undefined || current?.toLowerCase() === value.toLowerCase()) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/recipes?${qs}` : "/recipes";
}

export function paramValue(raw: RawSearchParams, key: string): string | undefined {
  const params = toParams(raw);
  return params.get(key) ?? undefined;
}
