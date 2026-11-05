# XV Nation — team metadata source-of-truth patch

This patch makes `teams_meta.csv` the authoritative source for club-facing identity and profile information.

## Data contract
- `teams_meta.csv`: `team_id`, `team_name`, `league_id`, `logo`, `city`, `country`, `stadium`, `website`, `instagram`, `facebook`, `x`, `youtube`. These fields control all club labels and profile details.
- `matches.xlsx` / `data/matches.json`: match facts only. `home_team_id` and `away_team_id` connect each fixture to the club metadata. The workbook's `home_team_name`, `away_team_name`, `city`, and `country` are not used as club display labels. Fixture `league_id` remains the historical competition for the match itself.
- `data/teams.json`: rankings, Elo, played/won/drawn/lost, form, rank and Elo history. It is joined to metadata by `team_id`; its old name/location/competition/logo labels are not authoritative.

## Match ID reconciliation found in the supplied workbook
The workbook has two legacy spellings normalized by the updated Elo engine: `two blues_prem` → `two_blues_prem`, and `ardmoremarist_prem` → `ardmore_marist_prem`. It also contains 2025 Papatoetoe fixtures, but Papatoetoe is not one of the current 66 ranked teams. `teams_meta_historical_additions.csv` contains a metadata row for Papatoetoe. Append that row to your live `teams_meta.csv` if you want historical results to show the official `Papatoetoe` label rather than the raw team ID. This does not add Papatoetoe to the ranked directory because it is not in `data/teams.json`.

## Install
Copy the contents of this patch into the root of the existing GitHub Pages repository, preserving paths and replacing matching files. Do **not** replace your live `teams_meta.csv` with an older copy. Keep the latest edited CSV at the repository root.

Replace `rugby_rankings.py` in the repository/automation source with this version if you use the Python engine to regenerate rankings.

After commit, allow GitHub Pages to deploy and hard-refresh the browser (Ctrl+F5).

## Important
Never change `team_id` when renaming a club or changing its city. A rename/location change is safe because every match joins through `team_id`, not club name or city. If a club moves competitions, change its `league_id` in metadata; the match workbook retains each fixture's actual competition.
