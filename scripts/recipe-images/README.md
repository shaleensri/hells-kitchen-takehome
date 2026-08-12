# Recipe photo sourcing — provenance (PLAN.md §3.35)

This folder is documentation and one-off scripts, not runtime code. Nothing
here is imported by `backend-app` or `frontend-app` — the app only ever
reads the checked-in image files under
`frontend-app/public/images/recipes/{recipeId}.jpg`, served like any other
static asset. This folder exists so the *origin* of those 32 photos is
traceable after the fact, same reasoning as
[`scripts/recipe-generation/`](../recipe-generation/) for the dataset
itself.

- **`attribution.md`** — the human-readable table: which recipe, which
  Commons file, who took it, what license. Start here.
- **`attribution.json`** — the same data, machine-readable; `attribution.md`
  is generated from it via `generate_attribution_md.py`.
- **`candidates.json`** — the raw decision log from the first fetch pass:
  every candidate considered per recipe and why each was accepted or
  rejected (wrong license, too small, or — once accepted — later overridden
  by a better choice from a follow-up search round). Supplementary detail
  behind the summary above, not required reading.
- **`fetch_images_lib.py`** — shared helpers (Commons search/imageinfo API
  calls, license filtering, download+convert via macOS `sips`).
- **`fetch-images.py`** — the first-pass fetch: one curated search query per
  recipe, first license-and-size-acceptable result wins.
- **`fetch-images-retry.py`**, **`review_candidates.py`** — follow-up
  scripts used to widen the search (multiple query phrasings, multiple
  candidates collected instead of auto-accepting the first hit) for recipes
  where the first pass came back wrong or empty.
- **`finalize.py`** — the actual authoritative pass: takes the specific
  Commons file title chosen for each recipe (decided only after visually
  checking the photo against the real recipe), re-fetches it fresh, writes
  the final image files and `attribution.json`.

## How sourcing actually happened

Each recipe got a curated (not literal-title) search query against
[Wikimedia Commons' search API](https://commons.wikimedia.org/w/api.php)
(no key required), filtered to an allow-list of open licenses
(CC0/public-domain/any CC-BY variant, all of which permit reuse with
attribution), then downloaded and standardized to JPEG via `sips`.

That process needed several rounds, and it's worth recording *why* rather
than presenting a clean one-shot result:

1. **A real bug in the license filter, caught mid-run.** Wikimedia returns
   license names in two different formats depending on which metadata field
   supplies them — `"CC BY-SA 4.0"` (spaces) from `LicenseShortName`, vs.
   `"cc-by-sa-4.0"` (hyphens) from the template-derived `License` field. The
   filter's `startswith("cc-by")` check only matched the hyphenated form, so
   it silently rejected the majority of real, perfectly-usable CC-BY(-SA)
   results for most of the first fetch pass — which is why over half the
   recipes initially came back "no acceptable candidate" even though good
   photos existed. Caught by manually querying the API and comparing its
   real output against what the filter was doing, not assumed; fixed by
   normalizing to one format before comparing (`fetch_images_lib.py`'s
   `license_ok`), and the whole dataset was re-fetched from scratch after
   the fix.

2. **Text search alone produces real mismatches — every single downloaded
   image was visually checked against its recipe before being accepted,
   not trusted from the search/license metadata alone.** Concrete examples
   caught this way, not hypothetical: a "Beef Tacos" query returned a photo
   whose real filename was "...Shrimp Tacos!" (correct dish, wrong recipe —
   Commons' text relevance ranking doesn't know the difference); a
   "Crispy Peanut Tofu with Quinoa" search matched an infographic about
   dietary magnesium sources, not a photo of food at all; a "Roasted
   Cauliflower Steaks" search returned a photo of beef steak served
   alongside roasted cauliflower, not cauliflower prepared *as* a steak;
   a "Broccoli & Potato Soup" search returned a close-up of raw, uncooked
   broccoli florets. All four (and others) were rejected after being looked
   at, not shipped.

3. **Two vegetarian/vegan recipes (`Stir-Fried Tofu`, `Weeknight Egg Fried
   Rice`) kept matching real dishes that traditionally include meat** (a
   tofu-and-minced-pork stir-fry preparation; various fried rice photos with
   visible chicken). These recipes' actual ingredient lists were checked
   against candidate photos specifically for this — `#12`'s final photo
   is genuinely meat-free tofu + snow peas; `#18`'s is confirmed
   egg-and-vegetable fried rice with no meat visible.

4. **A handful of recipes never found an exact real-world match** — Commons'
   library, while large, isn't infinite, and some of this dataset's more
   specific/compound dish names (`Sweet Potato & Beef Skillet`, `Greek
   Yogurt Parfait with Granola & Berries`) aren't common enough as
   photographed dishes to have a precise free match. For these, the closest
   good-faith real photo was used and the imprecision is recorded plainly in
   `attribution.md`'s "Approximate matches" section — not silently presented
   as exact.

## What did NOT change

- No live image API — images are downloaded once, checked into the repo,
  served as ordinary static files.
- No generated/AI images — every photo is real photography, openly
  licensed, with real attribution.
- No backend or `data.json` changes — the frontend resolves an image purely
  from the recipe's existing `id` via a path convention
  (`frontend-app/lib/recipeImages.ts`), so this feature needed zero backend
  involvement.
