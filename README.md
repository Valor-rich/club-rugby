# XV Nation website refresh

## Upload
Upload the **contents** of this folder into the root of the existing `club-rugby` GitHub repository.

Included:
- `index.html`, `rankings.html`, `competitions.html`, `results.html`, `clubs.html`, `news.html`
- `clubs/` — 66 individual club profile pages
- `leagues/` — seven competition pages
- `assets/` — XVN master logo, stylesheet, ranking interactions and verified supplied club badges
- `data/teams.json` and `data/matches.json`
- `teams_meta.csv`, `global_rankings.csv`, `league_team_ratings.csv`

## Club data notes
- City and country come from the current rankings dataset.
- Stadium is the most frequently recorded home venue in the supplied `matches.xlsx`; it should be checked with each club before being described as its official home ground.
- Official websites and social URLs are intentionally blank until verified.
- Club badges are only assigned where a supplied image has a clear matching club. Other clubs use initials placeholders.

## Elo history notes
The club profile graph replays match-by-match Elo chronologically from the supplied match workbook using the update formula and constants in `rugby_rankings.py` (1500 starting rating, 50-point home advantage, K=20 regular / 35 grand final, capped log margin multiplier 1.8). It is explicitly labelled **replayed match Elo**. It is not the transformed global Elo rating in `global_rankings.csv`.

## Hosting
This is a static GitHub Pages site. It does not yet include an automated data rebuild workflow. Upload new versions of the generated files to publish updates.
