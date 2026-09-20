# Denise's Recipe Box

92 saved recipes in 12 collections, adapted from Denise's supplied recipe box.

## Use on a phone
Open the published site in Safari (iPhone) or Chrome (Android). Use Share > Add to Home Screen on iPhone, or Install app / Add to Home screen on Android. After the first online visit, recipe text works offline; remote photos require a connection.

Search titles, ingredients, or collections. Tap Collections to browse on a phone. Tried status, scores from 1–10, favorites and notes are stored in that browser on that device, not synced to GitHub or other devices. Browser data clearing removes them. Existing favorites/notes in a local HTML file do not transfer automatically.

## Hosting
In repository Settings > Pages, select GitHub Actions as the build source. The included workflow publishes only `site/` on pushes to `main`. This site is public and has no sign-in.

## Local preview
Run `python -m http.server 8787 --directory site` and visit http://localhost:8787. No build tools or dependencies are required.

## Meal plans and grocery lists

Open **Meal plan & groceries** to create a dated one- or two-week plan. Add saved recipes to either week, choose portions per meal, and return to older plans from Saved plans. Changes save automatically to `recipeBoxMealPlans:v1` in this browser. A new plan preserves earlier plans. Reducing a two-week plan to one week moves its meals into Week 1.

The eight-meal starter includes the selected keto-style menu, proposed sides and 8–12 servings per meal for a family of four with leftovers. Suggestions choose unplanned meals from the existing recipe collection, with optional untried, keto-style, no-seafood, no-chili and no-beef-tips filters. They do not fetch new recipes or calculate nutritional macros.

Grocery quantities scale by each recipe's stated yield. Matching ingredients and compatible volume/weight units combine; package sizes and different ingredient forms remain explicit. Unquantified ingredients keep their source wording and scale factor. Sides are included for the starter menu; add other sides through Extra groceries. Check items as you shop, copy the list, or download it. Changed quantities invalidate the old checkmark. Plans and shopping checkmarks are device-local and clearing browser storage removes them.

Run `node test-reviews.cjs` and `node test-planner.cjs` before publishing. Serve with `python -m http.server 8787 --directory site` for browser checks.

## Updating the app
Recipe content is in `site/recipes.js`, behavior in `site/app.js`, and styling in `site/styles.css`. Update the cache version in `site/sw.js` when changing assets. Close and reopen existing tabs to activate a newly installed offline version.

Recipe source links and attribution are retained. Third-party recipes and photos remain attributed to their original sources; no license for that content is implied.
