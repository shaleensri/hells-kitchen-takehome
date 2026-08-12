#!/usr/bin/env python3
"""
Final assembly pass — PLAN.md §3.35. Takes the specific, already
agent-reviewed Commons file title chosen for each recipe (FINAL_CHOICES
below, decided only after visually checking each candidate against its
recipe's real title/ingredients — see this folder's attribution.md and
PLAN.md §3.35 for the full account of what got rejected and why) and does
the actual, authoritative fetch: pulls fresh imageinfo directly from the
API (not reused from any earlier candidate-review dump, to avoid stale or
mismatched review-file bookkeeping), downloads each image, converts it to
a standardized JPEG via macOS `sips`, and writes
frontend-app/public/images/recipes/{recipeId}.jpg. Also writes
attribution.json, the machine-readable source of truth attribution.md is
generated from.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_images_lib import DATA_PATH, OUT_DIR, REPO_ROOT, download_and_convert, extract_meta, get_imageinfo  # noqa: E402

ATTRIBUTION_JSON = Path(__file__).resolve().parent / "attribution.json"

FINAL_CHOICES = {
    "1": "File:Margherita Originale.JPG",
    "2": "File:Choc-Chip-Cookie.jpg",
    "3": "File:Chicken fried rice - Stir Fry by CK 2023-12-02.jpg",
    "4": "File:Sonoritas DTLA Beef and chicken tacos (July 2022).jpg",
    "5": "File:Greek salad and Tzatziki.jpg",
    "6": "File:Vegetarian Sushi Maki roll.jpg",
    "7": "File:Mixed vegetable curry 2.jpg",
    "8": "File:Green smoothie bowl with berries and seeds.jpg",
    "9": "File:Espaguetis carbonara.jpg",
    "10": "File:Tasty Buddha Bowl with Falafel - Dyke Road Park Cafe 2025-05-09.jpg",
    "11": "File:Shrimp scampi at B&V Whiskey Bar & Grill - Sarah Stierch - June 2023.jpg",
    "12": "File:Stir Fry with Tofu.JPG",
    "13": "File:Grilled salmon and asparagus on rice - Boston, Massachusetts.jpg",
    "14": "File:Mandelschnitzel, Hofheim.jpg",
    "15": "File:Delicious Aglio Olio.jpg",
    "16": "File:Crispy sesame chicken and broccoli - Cambridge, MA.jpg",
    "17": "File:Liat Portal for Foodie Disorder - Oven-baked teriyaki salmon with vegetables.jpg",
    "18": "File:Fried Rice 1 (Eggs & Vegetables).jpg",
    "19": "File:Shrimp tacos at Los Gallitos - April 2023 - Sarah Stierch.jpg",
    "20": "File:Tandoori chicken Indian.jpg",
    "21": "File:2020-05-08 20 54 30 Skillet full of beef and vegetables in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg",
    "22": "File:Salt & Pepper Tofu Rice Bowl - Tiger Bites Pig 2025-11-20.jpg",
    "23": "File:Tortilla Española (Spanish Potato Omelet).jpg",
    "24": "File:Dungeness crab cake at Oso - Sarah Stierch.jpg",
    "25": "File:Cauliflower soup at a sittning.jpg",
    "26": "File:Cream of broccoli soup.jpg",
    "27": "File:Kale & ChickPea Salad (8425128977).jpg",
    "28": "File:Healthy eating the rainbow on a plate (52249826052).jpg",
    "29": "File:Home prepared yoghurt and muesli with berries.JPG",
    "30": "File:Scrambled eggs with cucumbers.jpg",
    "31": "File:Liat Portal for Foodie Disorder – Whole roasted cauliflower.jpg",
    "32": "File:DFC 0873 Two colorful tropical smoothies - one strawberry-red one mango-yellow - each topped with a fun stirrer and straw ready to sip.jpg",
}

# Recipes where the closest real photo found is a good-faith approximation
# rather than a precise match (different but visually/conceptually close
# dish, or the specific named ingredient not confirmed in the photo) —
# documented honestly in attribution.md rather than silently presented as
# exact, per this project's standing practice.
APPROXIMATE_MATCHES = {
    "3": "Photo reads more like fried rice than a wok stir-fry with distinct chicken pieces; file is literally titled 'Chicken fried rice - Stir Fry'.",
    "15": "Shows a garlic-oil spaghetti with mushrooms, not specifically lemon-and-parmesan; closest clean (non-seafood) match found for a fairly generic pasta dish.",
    "21": "Beef-and-vegetable skillet without sweet potato specifically visible; closest real match for a home-skillet beef dish.",
    "28": "Turmeric hummus rather than plain hummus, served as a fuller mezze plate; still genuinely a hummus bowl with vegetables.",
    "29": "Home-style yogurt with berries and shredded coconut rather than a visibly layered granola parfait; closest real match found after multiple search rounds.",
    "31": "Whole roasted cauliflower rather than sliced into 'steaks', but otherwise an exact dish match (roasted, whole, plated).",
}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DATA_PATH.read_text())
    titles_by_id = {r["id"]: r["title"] for r in data["recipes"]}

    attribution = {}
    for recipe_id, file_title in FINAL_CHOICES.items():
        print(f"[{recipe_id}] {titles_by_id.get(recipe_id)!r} <- {file_title}")
        info = get_imageinfo(file_title)
        if not info:
            print("  FAILED: no imageinfo")
            continue
        meta = extract_meta(file_title, info)
        out_path = download_and_convert(meta["thumbUrl"], recipe_id)
        print(f"  saved {out_path.relative_to(REPO_ROOT)} ({meta['license']})")
        attribution[recipe_id] = {
            "recipeTitle": titles_by_id.get(recipe_id),
            "fileTitle": file_title,
            "descriptionUrl": meta["descriptionUrl"],
            "artist": meta["artist"],
            "license": meta["license"],
            "licenseUrl": meta["licenseUrl"],
            "approximateMatchNote": APPROXIMATE_MATCHES.get(recipe_id),
        }
        time.sleep(0.3)

    ATTRIBUTION_JSON.write_text(json.dumps(attribution, indent=2, ensure_ascii=False))
    print(f"\nWrote {ATTRIBUTION_JSON}")


if __name__ == "__main__":
    main()
