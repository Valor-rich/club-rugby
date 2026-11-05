XV NATION REDESIGN — DEPLOYMENT

This is a redesigned static website for GitHub Pages.

UPLOAD THE CONTENTS OF THIS FOLDER into the ROOT of the existing club-rugby GitHub repository. Do not upload the outer folder as a nested directory.

Files: index.html, rankings.html, competitions.html, results.html, clubs.html, news.html, leagues/, assets/, teams_meta.csv, global_rankings.csv, league_team_ratings.csv.

LOGOS: Known logos are mapped to matching club names in teams_meta.csv and in the rankings data. Clubs without a supplied matching logo use initials placeholders rather than broken images. A few visually similar or ambiguous badge/name matches were intentionally left unmapped to avoid assigning the wrong club badge.

NEWS: The News page is a designed editorial landing page. It does not invent or publish news articles.

The current site is static. To update rankings and pages from match data, the Python Elo pipeline and GitHub Actions workflow still need to be added/configured separately.
