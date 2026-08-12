#!/usr/bin/env python3
"""Generates attribution.md from attribution.json — kept as a script
(rather than a one-off) since it's the natural place to regenerate the
table if attribution.json is ever updated by hand."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
data = json.loads((HERE / "attribution.json").read_text())

lines = []
lines.append("# Recipe photo attribution — PLAN.md §3.35")
lines.append("")
lines.append(
    "One real photo per recipe, sourced from Wikimedia Commons (no API key "
    "required), downloaded once and checked into "
    "`frontend-app/public/images/recipes/{recipeId}.jpg`. No live/runtime "
    "dependency on Wikimedia — the deployed app never calls out to Commons."
)
lines.append("")
lines.append(
    "Every entry below was chosen only after the agent implementing this "
    "visually looked at the actual downloaded photo next to the actual "
    "recipe (title + real ingredient list from `data.json`), not picked "
    "from search-result text alone — several initial candidates were "
    "rejected this way (a license-matching bug in the fetch script also "
    "caused a lot of early false \"no candidate found\" results — see "
    "`README.md` in this folder for the full account)."
)
lines.append("")
lines.append("| # | Recipe | Source file (Wikimedia Commons) | Author | License |")
lines.append("|---|--------|----------------------------------|--------|---------|")
for rid in sorted(data.keys(), key=int):
    e = data[rid]
    if not e.get("fileTitle"):
        # Replaced outside the fetch scripts (e.g. swapped by hand) —
        # provenance not yet confirmed. Flagged, not silently omitted.
        lines.append(f"| {rid} | {e['recipeTitle']} | *unconfirmed — see note below* | — | — |")
        continue
    title = e["fileTitle"].replace("File:", "")
    url = e["descriptionUrl"]
    artist = e["artist"] or "—"
    lic = e["license"]
    licurl = e["licenseUrl"]
    lictext = f"[{lic}]({licurl})" if licurl else lic
    lines.append(f"| {rid} | {e['recipeTitle']} | [{title}]({url}) | {artist} | {lictext} |")

lines.append("")
lines.append("## Approximate matches (documented honestly, not hidden)")
lines.append("")
lines.append(
    "Commons doesn't have a free, correctly-licensed, visually-accurate "
    "photo for every specific recipe in this dataset. For a handful, the "
    "closest real match found is a good-faith approximation rather than an "
    "exact match — noted here rather than silently presented as precise:"
)
lines.append("")
for rid in sorted(data.keys(), key=int):
    e = data[rid]
    if e.get("approximateMatchNote"):
        lines.append(f"- **#{rid} {e['recipeTitle']}** — {e['approximateMatchNote']}")
lines.append("")

unconfirmed = [rid for rid in sorted(data.keys(), key=int) if data[rid].get("note")]
if unconfirmed:
    lines.append("## Unconfirmed provenance (needs follow-up)")
    lines.append("")
    lines.append(
        "These photos did not go through the fetch scripts above, so there's "
        "no Commons file/license recorded for them yet — flagged here rather "
        "than left silently inconsistent with the rest of this table:"
    )
    lines.append("")
    for rid in unconfirmed:
        e = data[rid]
        lines.append(f"- **#{rid} {e['recipeTitle']}** — {e['note']}")
    lines.append("")

(HERE / "attribution.md").write_text("\n".join(lines))
print("wrote attribution.md")
