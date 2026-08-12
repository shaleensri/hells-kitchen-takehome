#!/usr/bin/env python3
"""
Round-3 helper — for stubborn recipes (wrong first-pass match, or none
found at all), fetches MULTIPLE acceptable candidates per query (not just
the first passing one) and saves them to a scratch review folder as
{recipeId}_{n}.jpg so the agent can look at several real options and pick
deliberately, instead of repeatedly auto-accepting whatever Commons ranks
first (which is how recipe 4 kept getting the same wrong shrimp-taco
photo). Nothing here writes into frontend-app/public/ — promotion to the
final path happens by hand after a candidate is chosen.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_images_lib import (  # noqa: E402
    REPO_ROOT,
    extract_meta,
    get_imageinfo,
    license_ok,
    search_candidates,
)

REVIEW_DIR = Path(
    "/private/tmp/claude-501/-Users-shaleensrivastava-Documents-GitHub-hells-kitchen/"
    "dacef202-c80d-4244-a7d0-5d5e1f78c15d/scratchpad/recipe-image-candidates"
)
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MIN_WIDTH = 700

QUERIES = {
    "10": ["buddha bowl quinoa vegetables", "grain bowl roasted vegetables chickpeas", "quinoa bowl vegetables"],
    "12": ["tofu stir fry vegetables no meat", "tofu bell pepper stir fry", "vegetable tofu stir fry"],
    "14": ["chicken schnitzel almond", "breaded baked chicken breast", "almond crusted fish OR chicken"],
    "15": ["spaghetti lemon parmesan", "pasta lemon garlic olive oil parsley", "spaghetti aglio e olio lemon"],
    "16": ["sesame chicken broccoli", "honey garlic chicken stir fry", "orange chicken broccoli"],
    "17": ["baked salmon fillet glazed", "honey garlic salmon fillet", "teriyaki salmon fillet rice"],
    "18": ["vegetable fried rice no meat", "egg fried rice carrots", "fried rice vegetables egg"],
    "19": ["shrimp tacos", "grilled shrimp tacos avocado", "shrimp taco cilantro lime"],
    "21": ["ground beef skillet vegetables", "beef sweet potato hash skillet", "beef stew sweet potato"],
    "22": ["crispy tofu peanut sauce bowl", "tofu peanut sauce quinoa bowl", "baked tofu peanut glaze"],
    "25": ["cauliflower soup bowl", "curried chickpea soup bowl", "creamy curry soup"],
    "26": ["broccoli potato soup bowl", "cream of broccoli soup", "potato leek soup bowl"],
    "28": ["hummus bowl vegetables pita", "mezze hummus vegetables plate", "hummus veggie plate"],
    "29": ["yogurt parfait berries granola glass", "granola parfait jar berries", "greek yogurt berries granola"],
    "31": ["roasted cauliflower steak vegan", "cauliflower steak plate", "whole roasted cauliflower slice"],
    "32": ["mango coconut smoothie glass", "tropical smoothie glass fruit", "pineapple coconut smoothie"],
}

MAX_PER_RECIPE = 4


def collect_candidates(recipe_id, queries):
    found = []
    seen_titles = set()
    for query in queries:
        try:
            titles = search_candidates(query, limit=10)
        except Exception as e:  # noqa: BLE001
            print(f"    search failed for {query!r}: {e}")
            continue
        time.sleep(0.3)
        for title in titles:
            if len(found) >= MAX_PER_RECIPE:
                return found
            if title in seen_titles:
                continue
            seen_titles.add(title)
            ext = title.rsplit(".", 1)[-1].lower()
            if ext not in ALLOWED_EXTENSIONS:
                continue
            try:
                info = get_imageinfo(title)
            except Exception:  # noqa: BLE001
                continue
            time.sleep(0.3)
            if not info:
                continue
            m = extract_meta(title, info)
            width = m.get("width") or 0
            if width < MIN_WIDTH or not license_ok(m.get("license", "")):
                continue
            m["matchedQuery"] = query
            found.append(m)
    return found


def download(url, out_path):
    import urllib.request

    from fetch_images_lib import USER_AGENT

    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    out_path.write_bytes(raw)


def main():
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for recipe_id, queries in QUERIES.items():
        print(f"[{recipe_id}] collecting candidates...")
        candidates = collect_candidates(recipe_id, queries)
        print(f"  found {len(candidates)} candidates")
        entry = []
        for i, c in enumerate(candidates):
            out_path = REVIEW_DIR / f"{recipe_id}_{i}.jpg"
            try:
                download(c["thumbUrl"], out_path)
            except Exception as e:  # noqa: BLE001
                print(f"    download failed for {c['fileTitle']}: {e}")
                continue
            print(f"    [{i}] {c['fileTitle']} (query: {c['matchedQuery']!r}) -> {out_path.name}")
            entry.append({**c, "reviewFile": out_path.name})
        manifest[recipe_id] = entry

    manifest_path = REVIEW_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\nWrote {manifest_path}")


if __name__ == "__main__":
    main()
