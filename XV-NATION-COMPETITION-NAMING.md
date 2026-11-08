# XV Nation competition naming standard

## Purpose
Use an American-conference-style information architecture while preserving each rugby competition's historic trophy name and local identity.

## Public hierarchy
1. XV Nation — global club rugby rankings platform.
2. Regional conference — XVN-created geographic grouping label.
3. Historic competition — official cup, shield or competition title.
4. Division — numbered competitive tier (Division 1, Division 2, etc.).
5. Club — permanent club identity.

## Display rules
- Competition directory: show the conference name as the eyebrow and the historic competition name as the main title.
- Competition profile: show conference name above the historic competition title.
- Club profile, rankings and directory: show the conference + historic competition display name, followed by Division N where known.
- Standings and season history: render raw D1/D2 data as Division 1/Division 2.
- Use D1/D2 only in compact data contexts; never as the primary public-facing division label.
- Season membership belongs in team_competitions.csv. Promotion/relegation changes seasonal membership, not team identity.
- Keep competition_id and team_id stable. Do not alter match history or Elo inputs as part of a naming change.
- "Conference Champion" is a competition title/winner designation, not an automatic synonym for the highest Elo-rated club.
- "XVN Global Club Rankings" is the overall cross-region ranking product.

## XVN conference labels
| Conference | Historic competition |
|---|---|
| Capital Rugby Conference | John I Dent Cup |
| Auckland Rugby Conference | Gallaher Shield |
| Counties Manukau Rugby Conference | McNamara Cup |
| Canterbury Rugby Conference | Bascik Transport Cup |
| Otago Rugby Conference | Speight's Championship Shield |
| Queensland Rugby Conference | Hospital Cup |
| Sydney Rugby Conference | Shute Shield |

Conference labels are XVN editorial branding, not assertions that unions officially use these names. Geographic scope and union details should be checked with the relevant governing body before being described as official.

## Data contract
- competitions_meta.csv: competition identity, conference_name and display_name.
- team_competitions.csv: season, team_id, competition_id, division (stored as D1/D2...) and movement.
- teams_meta.csv: permanent club identity and profile metadata.
- data/matches.json: match history/results; unchanged by naming work.

## Standard public labels
- XVN Global Club Rankings
- National Club Rankings
- Conference Rankings
- Division 1 / Division 2 / Division 3...
- Promotion & Relegation
- Conference Champions
