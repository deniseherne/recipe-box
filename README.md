# Denise's Recipe Box

86 saved recipes in 12 collections, adapted from Denise's supplied recipe box.

## Use on a phone
Open the published site in Safari (iPhone) or Chrome (Android). Use Share > Add to Home Screen on iPhone, or Install app / Add to Home screen on Android. After the first online visit, recipe text works offline; remote photos require a connection.

Search titles, ingredients, or collections. Tap Collections to browse on a phone. Tried status, scores from 1–10, favorites and notes are stored in that browser on that device, not synced to GitHub or other devices. Browser data clearing removes them. Existing favorites/notes in a local HTML file do not transfer automatically.

## Hosting
In repository Settings > Pages, select GitHub Actions as the build source. The included workflow publishes only `site/` on pushes to `main`. This site is public and has no sign-in.

## Local preview
Run `python -m http.server 8787 --directory site` and visit http://localhost:8787. No build tools or dependencies are required.

## Updates
Recipe content is in `site/recipes.js`, behavior in `site/app.js`, and styling in `site/styles.css`. Update the cache version in `site/sw.js` when changing assets. Close and reopen existing tabs to activate a newly installed offline version.

Recipe source links and attribution are retained. Third-party recipes and photos remain attributed to their original sources; no license for that content is implied.
