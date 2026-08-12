#!/usr/bin/env python3
"""
Retry pass for scripts/recipe-images/fetch-images.py — targets only the
recipe IDs listed in RETRY_QUERIES (either a wrong match caught by the
agent's visual spot-check, or "no acceptable candidate" from pass one),
trying multiple query phrasings per recipe until one produces an
acceptable candidate. Same license/size filtering as the main script;
imports its helpers directly rather than duplicating them.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_images_lib import (  # noqa: E402
    CANDIDATES_JSON,
    DATA_PATH,
    OUT_DIR,
    REPO_ROOT,
    choose_best,
    download_and_convert,
    search_candidates,
)

# recipeId -> ordered list of query attempts, tried in order until one works
RETRY_QUERIES = {
    "3": ["chicken vegetable stir fry wok", "stir fried chicken vegetables", "chicken stir fry"],
    "4": ["beef taco", "ground beef tacos", "carne asada taco"],
    "5": ["greek salad feta olives", "greek salad tomato cucumber feta"],
    "8": ["acai bowl", "smoothie bowl berries granola", "berry smoothie bowl"],
    "10": ["buddha bowl", "grain bowl roasted vegetables"],
    "12": ["tofu vegetable stir fry", "stir fried tofu"],
    "14": ["almond crusted chicken breast", "chicken schnitzel almond crust", "baked chicken breast almond"],
    "15": ["lemon garlic spaghetti", "lemon pasta parsley", "lemon butter pasta"],
    "16": ["honey garlic chicken broccoli", "sesame chicken broccoli", "honey garlic chicken stir fry"],
    "17": ["honey garlic salmon", "baked salmon sheet pan broccoli", "glazed salmon fillet"],
    "18": ["egg fried rice bowl", "fried rice"],
    "21": ["ground beef skillet sweet potato", "beef hash sweet potato", "ground beef skillet"],
    "22": ["crispy tofu peanut sauce", "peanut sauce tofu quinoa", "peanut tofu bowl"],
    "25": ["cauliflower soup curry", "curried cauliflower soup", "chickpea soup"],
    "26": ["broccoli soup", "potato leek soup", "cream of broccoli soup"],
    "27": ["massaged kale salad chickpeas", "kale salad", "kale chickpea salad"],
    "28": ["hummus bowl vegetables", "hummus plate vegetables", "mezze bowl hummus"],
    "29": ["yogurt parfait granola", "granola parfait berries", "yogurt granola berries glass"],
    "30": ["scrambled eggs vegetables", "vegetable omelette", "egg scramble vegetables"],
    "31": ["roasted cauliflower steak", "cauliflower steak tahini"],
    "32": ["tropical smoothie", "coconut mango smoothie", "smoothie glass tropical fruit"],
}


def main():
    data = json.loads(DATA_PATH.read_text())
    titles = {r["id"]: r["title"] for r in data["recipes"]}
    results = json.loads(CANDIDATES_JSON.read_text()) if CANDIDATES_JSON.exists() else {}

    for recipe_id, queries in RETRY_QUERIES.items():
        title = titles.get(recipe_id, "?")
        print(f"[{recipe_id}] {title!r}")
        found = False
        all_tried = []
        for query in queries:
            print(f"  trying query: {query!r}")
            try:
                candidates = search_candidates(query, limit=10)
            except Exception as e:  # noqa: BLE001
                print(f"    search failed: {e}")
                continue
            time.sleep(0.3)
            best, tried = choose_best(candidates)
            all_tried.extend(tried)
            if best is not None:
                out_path = download_and_convert(best["thumbUrl"], recipe_id)
                print(f"  -> {best['fileTitle']} ({best['license']}) via query {query!r}")
                print(f"     saved to {out_path.relative_to(REPO_ROOT)}")
                results[recipe_id] = {"title": title, "query": query, "tried": all_tried, "chosen": best}
                found = True
                break
        if not found:
            print(f"  STILL NO ACCEPTABLE CANDIDATE after {len(queries)} query attempts")
            results[recipe_id] = {"title": title, "query": queries[0], "tried": all_tried, "chosen": None}
        time.sleep(0.3)

    CANDIDATES_JSON.write_text(json.dumps(results, indent=2))
    print(f"\nUpdated {CANDIDATES_JSON.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
