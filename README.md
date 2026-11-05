# XV Nation website release — logo mapping fixed

This release preserves the existing Elo engine, match history, team data, competition pages and club profiles.

## Logo audit
- 66 club records are included.
- 68 PNG files are included in `assets/logos/` (66 mapped club badges plus supplied/alternate archive artwork).
- All 66 clubs have a badge mapped to their record and profile.
- Manukau Rovers and Weymouth badges supplied by the user are included and connected.
- Four legacy filename aliases in the uploaded metadata were reconciled to the actual archive filenames: Auckland University → `uoa.png`, Hunter Wildfires → `wildfires.png`, Marist → `marist.png`, and University of Canterbury → `uoc.png`.
- The four filename aliases reconciled against the supplied image archive are Auckland University → `uoa.png`, Hunter Wildfires → `wildfires.png`, Marist → `marist.png`, and University of Canterbury → `uoc.png`.

## What is fixed
- `data/teams.json` now carries the verified logo paths used by all site views.
- `assets/rankings.js` is the active rankings script and renders the logo mapping from team data.
- `clubs.html` and the homepage leaderboard render from the same team data.
- All 66 club profile pages have their matching badge inserted where a verified image exists.
- All 66 club records are connected to a valid logo file; Manukau and Weymouth use the newly supplied images.

## Deploy
Upload the contents of this ZIP to the root of the existing GitHub Pages repository, preserving the folder structure, and commit to the branch configured for GitHub Pages. Do not upload the ZIP itself as the site root.

The Elo calculation source `rugby_rankings.py`, match workbook `matches.xlsx`, `data/matches.json`, team metadata and CSV ranking exports are included unchanged except for the logo-path reconciliation in `teams_meta.csv`.

## Club profile metadata and social links (v2)

All 66 club profile pages now use the shared `assets/profile.js` renderer. It loads `data/teams.json` for rankings, Elo history and match records, then overlays club details from `teams_meta.csv` by `team_id`. To add or update a club's official links, edit the matching row in `teams_meta.csv` and fill any of: `website`, `instagram`, `facebook`, `x`, `youtube`. Use full URLs (including `https://`) where possible. Only populated, valid HTTP(S) URLs are displayed; blank fields are hidden. The website is also shown in Club information.

The homepage and global rankings now use the same recent-form dot treatment: green for wins, red for losses and gold for draws. The homepage retains the Recent form column, but renders dots instead of the W/L/D letter string.

### Important publishing note

Upload/extract the **entire contents** of this ZIP into the published site root, preserving the folder structure. In particular, do not omit `assets/logos/`, `assets/profile.js`, `assets/site.css`, `data/teams.json`, or `teams_meta.csv`. Club profile pages are in `clubs/` and load their badge files from `../assets/logos/`. If deploying with GitHub Actions, ensure the workflow publishes the whole site directory rather than only the HTML files.


## Final badge update
The uploaded `teams_meta.csv` has been integrated. The logo paths for all 66 clubs resolve to PNG files in `assets/logos/`. The same metadata is reflected in `data/teams.json` for the homepage, rankings and club directory, while club profiles continue to read the CSV for club information and social links.
