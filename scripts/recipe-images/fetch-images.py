#!/usr/bin/env python3
"""
One-off fetch script — PLAN.md §3.35 (recipe hero images). Not runtime code
for either app; kept here for reproducibility, same spirit as
scripts/recipe-generation/prompt.md documenting how that dataset was built.

For each recipe, searches Wikimedia Commons (no API key required) for a
real, openly-licensed food photo, filters candidates down to an allowed
license set (see fetch_images_lib.py), downloads the best match, converts
it to a standardized JPEG via macOS `sips`, and writes it to
frontend-app/public/images/recipes/{recipeId}.jpg. Also writes a full
candidate dump (all considered candidates + why each was accepted/rejected)
to scripts/recipe-images/candidates.json, so every image's provenance is
traceable later. attribution.md (hand-written from this dump) is the
human-readable version.

This is a *sourcing* pass, not a final-answer pass — every downloaded image
still gets visually spot-checked against its recipe by the agent afterward
(see attribution.md's "verified" column), same "don't just trust the
metadata" discipline as the rest of this project. Recipes whose first-pass
candidate was wrong or unconvincing on that visual check, or that got no
candidate at all, were retried with different search terms via
fetch-images-retry.py rather than by editing this file per recipe.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_images_lib import CANDIDATES_JSON, DATA_PATH, OUT_DIR, REPO_ROOT, choose_best, download_and_convert, search_candidates  # noqa: E402

# Curated per-recipe search terms — recipe titles alone are often too
# specific/compound for Commons' library to match well (e.g. "Sweet Potato
# & Beef Skillet" isn't a standard dish name), so these are hand-picked to
# maximize the odds of a genuinely matching, appetizing real photo.
SEARCH_TERMS = {
    "1": "margherita pizza",
    "2": "chocolate chip cookies",
    "3": "chicken stir fry",
    "4": "beef tacos",
    "5": "greek salad",
    "6": "sushi roll maki",
    "7": "vegetable curry",
    "8": "smoothie bowl berries",
    "9": "spaghetti carbonara",
    "10": "buddha bowl quinoa vegetables",
    "11": "shrimp scampi pasta",
    "12": "tofu stir fry vegetables",
    "13": "grilled salmon asparagus",
    "14": "almond crusted chicken",
    "15": "lemon garlic pasta",
    "16": "honey garlic chicken broccoli",
    "17": "honey garlic salmon sheet pan",
    "18": "egg fried rice",
    "19": "shrimp tacos",
    "20": "tandoori chicken",
    "21": "ground beef sweet potato skillet",
    "22": "peanut tofu quinoa",
    "23": "spanish tortilla potato omelette",
    "24": "crab cakes",
    "25": "cauliflower chickpea curry soup",
    "26": "broccoli potato soup",
    "27": "kale salad chickpeas",
    "28": "hummus vegetable bowl",
    "29": "yogurt parfait granola berries",
    "30": "scrambled eggs vegetables",
    "31": "roasted cauliflower steak",
    "32": "tropical smoothie coconut",
}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA_PATH.read_text())
    recipes = {r["id"]: r["title"] for r in data["recipes"]}

    results = {}
    for recipe_id, title in recipes.items():
        query = SEARCH_TERMS.get(recipe_id, title)
        print(f"[{recipe_id}] {title!r} — query: {query!r}")
        try:
            candidates = search_candidates(query)
        except Exception as e:  # noqa: BLE001
            print(f"  search failed: {e}")
            results[recipe_id] = {"title": title, "query": query, "error": str(e)}
            continue
        time.sleep(0.3)

        best, tried = choose_best(candidates)
        if best is None:
            print(f"  NO ACCEPTABLE CANDIDATE among {len(candidates)} results")
            results[recipe_id] = {"title": title, "query": query, "tried": tried, "chosen": None}
            continue

        try:
            out_path = download_and_convert(best["thumbUrl"], recipe_id)
            print(f"  -> {best['fileTitle']} ({best['license']}) saved to {out_path.relative_to(REPO_ROOT)}")
        except Exception as e:  # noqa: BLE001
            print(f"  download/convert failed: {e}")
            results[recipe_id] = {"title": title, "query": query, "tried": tried, "chosen": best, "error": str(e)}
            continue

        results[recipe_id] = {"title": title, "query": query, "tried": tried, "chosen": best}
        time.sleep(0.3)

    CANDIDATES_JSON.write_text(json.dumps(results, indent=2))
    print(f"\nWrote candidate/decision log to {CANDIDATES_JSON.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
