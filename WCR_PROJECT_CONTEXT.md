# WCR — Project Context & Technical Source of Truth

> **Current as reviewed from GitHub `main`: 28 November 2026.**
> This file is the central working reference for ChatGPT project conversations and repository contributors. If it disagrees with older XV Nation chats, scripts, or install notes, inspect the latest committed GitHub code and use that instead.

## Project and brand
- **Current brand:** WCR — World Club Rugby, a global club rugby rankings, results, competition and club profile platform.
- **Previous brand:** XV Nation (obsolete for public-facing copy and new work).
- **Repository:** [Valor-rich/club-rugby](https://github.com/Valor-rich/club-rugby), default branch `main`.
- **Publication:** GitHub Pages, with `CNAME` set to `www.worldclubrugby.com`; Wix is not used.
- **Current crest:** `assets/wcr-shield.svg`, with compatible asset aliases documented in `WCR-BRANDING.md`.

## Live site architecture
- GitHub Pages serves static HTML, CSS, and JavaScript from the repository root.
- **Current WCR website pages:** `index.html` (homepage), `rankings.html`, `competitions.html`, `results.html`, `clubs.html`, `news.html`, `clubs/*.html` (club profiles), `leagues/*.html` (competition pages).
- Frontend shared loader: `assets/team-data.js`. It reads `data/teams.json`, `data/matches.json`, `teams_meta.csv`, `competitions_meta.csv`, and `team_competitions.csv`.
- Page logic: `assets/home.js`, `assets/rankings.js`, `assets/profile.js`, `assets/league.js`, `assets/clubs.js`, `assets/competitions.js`, `assets/results.js`. Styling: `assets/site.css`.
- For compatibility, the global JavaScript loader is still named `XVN`. This internal identifier does **not** indicate current XV Nation branding.
- `data/teams.json` is the live ranking dataset for the JavaScript site, and `data/matches.json` supplies the site match history. Updating only `global_rankings.csv` does not update the live rankings page.
- Several older static HTML competition pages coexist with the current JavaScript pages. Check which page implementation is in use before changing a template.

## Data ownership and identifiers
- **Club names and public-facing identity** are authoritative in `teams_meta.csv`, joined using stable `team_id`; see `README.md`.
- **Competition metadata:** `competitions_meta.csv`; **club membership by season:** `team_competitions.csv`.
- **Match facts:** `matches.xlsx` and the published `data/matches.json`. Results may be manually maintained; no current automated collection or scheduled publishing workflow is present in `.github/workflows/` as of this review.
- Do not rename team IDs to change a club name. Preserve historical fixtures' actual competition IDs.
- Keep club logo paths and WCR brand assets intact unless explicitly asked to change them.

## Ratings methodology — fixed WCR scale (Option 2)
**Important: the existing Elo engine determines ordering. The 0–100 WCR rating is a public-facing monotonic conversion only.**

```text
WCR rating = 100 / (1 + 10 ^ ((1500 - global_elo) / 400))
```

- 1500 Elo = 50.0 WCR; 1800 Elo ≈ 84.9 WCR; 2000 Elo ≈ 94.7 WCR.
- A rating of 100 is a **theoretical ceiling**, **not** automatically assigned to the number-one club.
- Public ratings are shown to **one decimal place**. Ranking positions and sorting retain full-precision underlying `global_rating` (Elo), so clubs do not move based on rounded display scores.
- Preserve `global_rating` and `league_rating` Elo data and `history[*].elo`; the new `wcr_rating` field is additional.
- In the browser, `assets/team-data.js` derives `wcr_rating` from `global_rating` on every load and exposes `XVN.wcrRating(elo)`. The published `data/teams.json` also has `wcr_rating` for direct consumers.
- In Python, `rugby_rankings.py` defines `elo_to_wcr()` and outputs `wcr_rating` columns in the global and league CSVs. League table WCR ratings use `league_rating`; global WCR ratings use `global_rating`. They must not be confused.
- **Underlying Python Elo constants (at this review):** `ELO_CENTER=1500`, `HGA=50`, `K_REGULAR=20`, `K_PLAYOFF=30`, `K_FINAL=35`, `MARGIN_CAP=1.8`, `SD_FLOOR=60`, `SIGMA_GLOBAL=150`; preseason blend enabled at `0.70`. The optional `league_strengths.csv` is supported but absent from the reviewed repository root; do not infer nonzero league strength offsets without inspecting current data.
- The 0–100 value is not a win-probability percentage; it is a fixed rating display scale.

## Operational caution: Python and GitHub Pages
- `rugby_rankings.py` is a **legacy generator as well as the Elo engine**. Running its full `run_pipeline()` in the website root rewrites `index.html`, `rankings.html`, and `leagues/*.html` with older generated layouts. **Do not run it directly in the production Pages checkout** without first isolating generation outputs and reconciling the modern website templates.
- Generated/exported CSVs and the published JSON are separate products; current repository code does **not** establish an automatic Python → `data/teams.json` publication process. Verify that publishing path before making automation changes.
- Never replace current GitHub data with old files provided in chat or previously downloaded ZIPs.

## Working preferences / safety rails
1. Inspect the current `main` branch and relevant files before every technical change.
2. Preserve Elo rules, rankings order, match history, IDs, metadata, website functionality, and existing assets unless explicitly instructed otherwise.
3. Test changes first; commit directly to GitHub when permissions allow, and report the exact commit and affected files.
4. For Python rankings edits, provide a link to the **full current `rugby_rankings.py`** and separately show the **specific updated section**.
5. Use WCR in new public-facing copy. Refer to old XV Nation naming only for migration/compatibility.
6. Prefer the current repository and project instructions to older conversations, pasted scripts, or historical assumptions.

## Related documentation
- [README.md](README.md) — historical team-metadata integration notes; verify details against current code.
- [WCR-BRANDING.md](WCR-BRANDING.md) — approved crest and assets.
- [CLUB-LOCATIONS.md](CLUB-LOCATIONS.md) and [CLUB-LOCATION-RESEARCH.md](CLUB-LOCATION-RESEARCH.md) — location research.
- [XV-NATION-COMPETITION-NAMING.md](XV-NATION-COMPETITION-NAMING.md) — **historical**, not the current naming authority.

## Changes made 28 November 2026
- Introduced WCR public ratings out of 100 while preserving underlying Elo and ranking positions.
- Applied display scale to the homepage, global rankings, club directory, club profiles, live competition pages and legacy static competition tables.
- Added `wcr_rating` to the published team dataset and rankings CSV exports.
- Created this shared reference for project continuity.
