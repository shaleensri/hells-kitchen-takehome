# Recipe photo attribution — PLAN.md §3.35

One real photo per recipe, sourced from Wikimedia Commons (no API key required), downloaded once and checked into `frontend-app/public/images/recipes/{recipeId}.jpg`. No live/runtime dependency on Wikimedia — the deployed app never calls out to Commons.

Every entry below was chosen only after the agent implementing this visually looked at the actual downloaded photo next to the actual recipe (title + real ingredient list from `data.json`), not picked from search-result text alone — several initial candidates were rejected this way (a license-matching bug in the fetch script also caused a lot of early false "no candidate found" results — see `README.md` in this folder for the full account).

| # | Recipe | Source file (Wikimedia Commons) | Author | License |
|---|--------|----------------------------------|--------|---------|
| 1 | Classic Margherita Pizza | [Margherita Originale.JPG](https://commons.wikimedia.org/wiki/File:Margherita_Originale.JPG) | Mario56 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 2 | Chocolate Chip Cookies | *see note below* | — | Wikimedia Commons (openly licensed) |
| 3 | Chicken Stir-Fry | [Chicken fried rice - Stir Fry by CK 2023-12-02.jpg](https://commons.wikimedia.org/wiki/File:Chicken_fried_rice_-_Stir_Fry_by_CK_2023-12-02.jpg) | Andy Li | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 4 | Beef Tacos | [Sonoritas DTLA Beef and chicken tacos (July 2022).jpg](https://commons.wikimedia.org/wiki/File:Sonoritas_DTLA_Beef_and_chicken_tacos_(July_2022).jpg) | Benoît Prieur | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 5 | Greek Salad | [Greek salad and Tzatziki.jpg](https://commons.wikimedia.org/wiki/File:Greek_salad_and_Tzatziki.jpg) | Paasikivi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 6 | Sushi Roll | [Vegetarian Sushi Maki roll.jpg](https://commons.wikimedia.org/wiki/File:Vegetarian_Sushi_Maki_roll.jpg) | Miscellaneous contributor | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 7 | Vegetable Curry | [Mixed vegetable curry 2.jpg](https://commons.wikimedia.org/wiki/File:Mixed_vegetable_curry_2.jpg) | Dolon Prova | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 8 | Berry Smoothie Bowl | [Green smoothie bowl with berries and seeds.jpg](https://commons.wikimedia.org/wiki/File:Green_smoothie_bowl_with_berries_and_seeds.jpg) | Miscellaneous contributor | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 9 | Pasta Carbonara | [Espaguetis carbonara.jpg](https://commons.wikimedia.org/wiki/File:Espaguetis_carbonara.jpg) | Javier Somoza | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 10 | Quinoa Buddha Bowl | [Tasty Buddha Bowl with Falafel - Dyke Road Park Cafe 2025-05-09.jpg](https://commons.wikimedia.org/wiki/File:Tasty_Buddha_Bowl_with_Falafel_-_Dyke_Road_Park_Cafe_2025-05-09.jpg) | Andy Li | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 11 | Shrimp Scampi | [Shrimp scampi at B&V Whiskey Bar & Grill - Sarah Stierch - June 2023.jpg](https://commons.wikimedia.org/wiki/File:Shrimp_scampi_at_B%26V_Whiskey_Bar_%26_Grill_-_Sarah_Stierch_-_June_2023.jpg) | Missvain | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 12 | Stir-Fried Tofu | [Stir Fry with Tofu.JPG](https://commons.wikimedia.org/wiki/File:Stir_Fry_with_Tofu.JPG) | ParentingPatch | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 13 | Grilled Salmon with Asparagus | [Grilled salmon and asparagus on rice - Boston, Massachusetts.jpg](https://commons.wikimedia.org/wiki/File:Grilled_salmon_and_asparagus_on_rice_-_Boston,_Massachusetts.jpg) | Daderot | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 14 | Almond-Crusted Chicken | [Mandelschnitzel, Hofheim.jpg](https://commons.wikimedia.org/wiki/File:Mandelschnitzel,_Hofheim.jpg) | Gerda Arendt | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 15 | Lemon Garlic Pasta | [Delicious Aglio Olio.jpg](https://commons.wikimedia.org/wiki/File:Delicious_Aglio_Olio.jpg) | Imelda Suwandi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 16 | Honey Garlic Chicken with Broccoli | [Crispy sesame chicken and broccoli - Cambridge, MA.jpg](https://commons.wikimedia.org/wiki/File:Crispy_sesame_chicken_and_broccoli_-_Cambridge,_MA.jpg) | Daderot | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 17 | Sheet-Pan Honey Garlic Salmon | [Liat Portal for Foodie Disorder - Oven-baked teriyaki salmon with vegetables.jpg](https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Oven-baked_teriyaki_salmon_with_vegetables.jpg) | HaJunkiyada | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 18 | Weeknight Egg Fried Rice | [Fried Rice 1 (Eggs & Vegetables).jpg](https://commons.wikimedia.org/wiki/File:Fried_Rice_1_(Eggs_%26_Vegetables).jpg) | Gary Dee | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 19 | Family-Style Shrimp Tacos | [Shrimp tacos at Los Gallitos - April 2023 - Sarah Stierch.jpg](https://commons.wikimedia.org/wiki/File:Shrimp_tacos_at_Los_Gallitos_-_April_2023_-_Sarah_Stierch.jpg) | Missvain | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 20 | Greek Yogurt Tandoori Chicken | [Tandoori chicken Indian.jpg](https://commons.wikimedia.org/wiki/File:Tandoori_chicken_Indian.jpg) | pelican | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| 21 | Sweet Potato & Beef Skillet | [2020-05-08 20 54 30 Skillet full of beef and vegetables in the Franklin Farm section of Oak Hill, Fairfax County, Virginia.jpg](https://commons.wikimedia.org/wiki/File:2020-05-08_20_54_30_Skillet_full_of_beef_and_vegetables_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg) | Famartin | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 22 | Crispy Peanut Tofu with Quinoa | [Salt & Pepper Tofu Rice Bowl - Tiger Bites Pig 2025-11-20.jpg](https://commons.wikimedia.org/wiki/File:Salt_%26_Pepper_Tofu_Rice_Bowl_-_Tiger_Bites_Pig_2025-11-20.jpg) | Andy Li | [CC0](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |
| 23 | Spanish-Style Potato & Egg Skillet | [Tortilla Española (Spanish Potato Omelet).jpg](https://commons.wikimedia.org/wiki/File:Tortilla_Espa%C3%B1ola_(Spanish_Potato_Omelet).jpg) | Joy | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| 24 | Pan-Seared Crab Cakes | [Dungeness crab cake at Oso - Sarah Stierch.jpg](https://commons.wikimedia.org/wiki/File:Dungeness_crab_cake_at_Oso_-_Sarah_Stierch.jpg) | Missvain | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) |
| 25 | Curried Cauliflower Chickpea Soup | [Cauliflower soup at a sittning.jpg](https://commons.wikimedia.org/wiki/File:Cauliflower_soup_at_a_sittning.jpg) | JIP | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 26 | Broccoli & Potato Soup | [Cream of broccoli soup.jpg](https://commons.wikimedia.org/wiki/File:Cream_of_broccoli_soup.jpg) | Alpha from Melbourne, Australia | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| 27 | Tahini Kale Salad with Chickpeas | [Kale & ChickPea Salad (8425128977).jpg](https://commons.wikimedia.org/wiki/File:Kale_%26_ChickPea_Salad_(8425128977).jpg) | Cajsa Lilliehook from Portland | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) |
| 28 | Hummus & Veggie Lunch Bowl | [Healthy eating the rainbow on a plate (52249826052).jpg](https://commons.wikimedia.org/wiki/File:Healthy_eating_the_rainbow_on_a_plate_(52249826052).jpg) | Winniepix | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) |
| 29 | Greek Yogurt Parfait with Granola & Berries | [Home prepared yoghurt and muesli with berries.JPG](https://commons.wikimedia.org/wiki/File:Home_prepared_yoghurt_and_muesli_with_berries.JPG) | Papathanasiouk | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) |
| 30 | Veggie & Egg Scramble | [Scrambled eggs with cucumbers.jpg](https://commons.wikimedia.org/wiki/File:Scrambled_eggs_with_cucumbers.jpg) | Zhou Yuji1028 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 31 | Roasted Cauliflower Steaks with Tahini Drizzle | [Liat Portal for Foodie Disorder – Whole roasted cauliflower.jpg](https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_%E2%80%93_Whole_roasted_cauliflower.jpg) | HaJunkiyada | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |
| 32 | Tropical Coconut Almond Smoothie | [DFC 0873 Two colorful tropical smoothies - one strawberry-red one mango-yellow - each topped with a fun stirrer and straw ready to sip.jpg](https://commons.wikimedia.org/wiki/File:DFC_0873_Two_colorful_tropical_smoothies_-_one_strawberry-red_one_mango-yellow_-_each_topped_with_a_fun_stirrer_and_straw_ready_to_sip.jpg) | PattayaPatrol | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) |

## Approximate matches (documented honestly, not hidden)

Commons doesn't have a free, correctly-licensed, visually-accurate photo for every specific recipe in this dataset. For a handful, the closest real match found is a good-faith approximation rather than an exact match — noted here rather than silently presented as precise:

- **#3 Chicken Stir-Fry** — Photo reads more like fried rice than a wok stir-fry with distinct chicken pieces; file is literally titled 'Chicken fried rice - Stir Fry'.
- **#15 Lemon Garlic Pasta** — Shows a garlic-oil spaghetti with mushrooms, not specifically lemon-and-parmesan; closest clean (non-seafood) match found for a fairly generic pasta dish.
- **#21 Sweet Potato & Beef Skillet** — Beef-and-vegetable skillet without sweet potato specifically visible; closest real match for a home-skillet beef dish.
- **#28 Hummus & Veggie Lunch Bowl** — Turmeric hummus rather than plain hummus, served as a fuller mezze plate; still genuinely a hummus bowl with vegetables.
- **#29 Greek Yogurt Parfait with Granola & Berries** — Home-style yogurt with berries and shredded coconut rather than a visibly layered granola parfait; closest real match found after multiple search rounds.
- **#31 Roasted Cauliflower Steaks with Tahini Drizzle** — Whole roasted cauliflower rather than sliced into 'steaks', but otherwise an exact dish match (roasted, whole, plated).

## Not individually file-tracked

These photos didn't go through the fetch scripts above, so there's no specific Commons file/artist recorded for them the way there is for the rest of this table — flagged here rather than left silently inconsistent with it:

- **#2 Chocolate Chip Cookies** — Swapped directly (not via the fetch scripts) for a warmer, in-context photo — the original was a stark isolated product shot. Sourced from Wikimedia Commons like the rest of the set; the specific file/artist wasn't individually tracked the way the other 31 were.
