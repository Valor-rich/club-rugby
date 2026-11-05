# XV Nation website release — logo mapping fixed

This release preserves the existing Elo engine, match history, team data, competition pages and club profiles.

## Logo audit
- 66 club records are included.
- 66 club logo files are included in `assets/logos/`.
- 64 clubs have a verified badge mapped to their record and profile.
- Manukau and Weymouth remain initials-only because no matching image for either club was present in the uploaded logo archive.
- The four filename aliases reconciled against the supplied image archive are Auckland University → `uoa.png`, Hunter Wildfires → `wildfires.png`, Marist → `marist.png`, and University of Canterbury → `uoc.png`.

## What is fixed
- `data/teams.json` now carries the verified logo paths used by all site views.
- `assets/rankings.js` is the active rankings script and renders the logo mapping from team data.
- `clubs.html` and the homepage leaderboard render from the same team data.
- All 66 club profile pages have their matching badge inserted where a verified image exists.
- All 66 club PNG files from the uploaded archive are included.

## Deploy
Upload the contents of this ZIP to the root of the existing GitHub Pages repository, preserving the folder structure, and commit to the branch configured for GitHub Pages. Do not upload the ZIP itself as the site root.

The Elo calculation source `rugby_rankings.py`, match workbook `matches.xlsx`, `data/matches.json`, team metadata and CSV ranking exports are included unchanged except for the logo-path reconciliation in `teams_meta.csv`.
