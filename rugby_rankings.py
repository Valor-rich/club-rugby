#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Club Rugby Rankings — Elo + clean & dedupe + NRL-style homepage ladder (Top 20) + index & per-league pages + Top 20 + Top 25 Grid
- Uses league_id verbatim as display
- Cleans historical team names/ids; dedupes teams
- Adds P/W/D/L and last-5 Form to tables
- Outputs:
    - global_rankings.csv
    - league_team_ratings.csv
    - rankings.html (global with P/W/D/L/Form)
    - index.html (HOMEPAGE = NRL-style Top 20 ladder + links + league links)
    - top25.html (Top 20 two-column list; row logos on right)
    - top25_grid.html (5x5 social grid with title banner; logos shown)
    - leagues/<slug>.html (per-league pages with P/W/D/L/Form)
"""

import os, math, re, webbrowser
from datetime import datetime
from typing import Dict, List
import numpy as np
import pandas as pd

# ----------------------- CONFIG -----------------------
ELO_CENTER = 1500.0
HGA = 50.0
K_REGULAR = 20.0
K_PLAYOFF = 30.0
K_FINAL = 35.0
MARGIN_CAP = 1.8
SD_FLOOR = 60.0
SIGMA_GLOBAL = 150.0

PRESEASON_BLEND = True
BLEND_WEIGHT = 0.70

LEAGUE_STRENGTHS_CSV = "league_strengths.csv"
TEAMS_META_CSV       = "teams_meta.csv"

OUT_LEAGUE = "league_team_ratings.csv"
OUT_GLOBAL = "global_rankings.csv"
OUT_HTML   = "rankings.html"
OUT_INDEX  = "index.html"
OUT_TOP25  = "top25.html"          # keep filename; this is your Top 20 page
OUT_TOP25_GRID = "top25_grid.html"
OUT_LEAGUE_DIR = "leagues"

# ----------------------- UTILS -----------------------
def now_stamp() -> str:
    return datetime.now().strftime("%A, %d %B %Y %I:%M %p")

def parse_local_date(x):
    if isinstance(x, (pd.Timestamp, datetime)):
        return x.date()
    s = str(x).strip()
    if not s:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    try:
        return pd.to_datetime(s, dayfirst=True).date()
    except Exception:
        return None

def expected_score(a, b): return 1.0 / (1.0 + 10 ** (-(a - b) / 400.0))
def margin_multiplier(p, cap=MARGIN_CAP): return min(math.log(abs(p)+1.0), cap)
def k_by_stage(s): return K_FINAL if s=="final" else (K_PLAYOFF if s=="playoff" else K_REGULAR)
def to_bool(x): return str(x).strip().upper() == "TRUE"
def html_escape(s): import html; return html.escape("" if s is None else str(s))
def slugify(v): return re.sub(r"[^A-Za-z0-9]+", "-", str(v).strip()).strip("-").lower() or "league"
def safe_logo_src(s): return s.strip() if isinstance(s,str) else ""

def _norm_name(s: str) -> str:
    if not isinstance(s, str): return ""
    return " ".join(s.replace("\u00A0", " ").split()).strip()

def _norm_id_from_name(s: str) -> str:
    s = _norm_name(s).lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s

def _hex_to_rgb(hx: str):
    try:
        s = str(hx).strip().lstrip("#")
        if len(s) == 3: s = "".join(ch*2 for ch in s)
        if len(s) != 6: return None
        r = int(s[0:2], 16); g = int(s[2:4], 16); b = int(s[4:6], 16)
        return (r, g, b)
    except Exception:
        return None

def _auto_text_color(primary_hex: str) -> str:
    rgb = _hex_to_rgb(primary_hex)
    if not rgb: return "#111111"
    r,g,b = rgb
    L = 0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2
    return "#000000" if L > 0.5 else "#FFFFFF"

# ----------------------- LOADERS -----------------------
def _clean_team_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if "home_team_name" in df.columns:
        df["home_team_name"] = df["home_team_name"].astype(str).map(_norm_name)
    if "away_team_name" in df.columns:
        df["away_team_name"] = df["away_team_name"].astype(str).map(_norm_name)

    for side in ("home", "away"):
        id_col = f"{side}_team_id"
        nm_col = f"{side}_team_name"
        if id_col in df.columns:
            df[id_col] = df[id_col].astype(str).map(lambda x: x.strip())
            if nm_col in df.columns:
                df[id_col] = df.apply(
                    lambda r: _norm_id_from_name(r[nm_col]) if not str(r[id_col]).strip() else r[id_col],
                    axis=1
                )
        else:
            if nm_col in df.columns:
                df[id_col] = df[nm_col].map(_norm_id_from_name)
            else:
                raise ValueError(f"Missing both {id_col} and {nm_col}")
    # Normalize known legacy workbook spellings to the canonical team_id values in teams_meta.csv.
    id_aliases = {
        "two blues_prem": "two_blues_prem",
        "ardmoremarist_prem": "ardmore_marist_prem",
    }
    for side in ("home", "away"):
        id_col = f"{side}_team_id"
        if id_col in df.columns:
            df[id_col] = df[id_col].map(lambda value: id_aliases.get(str(value).strip().lower(), str(value).strip()))
    return df

def load_matches_any(base_dir):
    xlsx = os.path.join(base_dir, "matches.xlsx")
    csv  = os.path.join(base_dir, "matches.csv")
    dir_ = os.path.join(base_dir, "matches")
    frames = []
    if os.path.exists(xlsx):
        import openpyxl
        sheets = pd.read_excel(xlsx, sheet_name=None, dtype=str)
        for sn, df in sheets.items():
            if df is None or df.empty: continue
            if "league_id" not in df.columns: df["league_id"] = sn
            frames.append(df)
    elif os.path.exists(csv):
        frames.append(pd.read_csv(csv, dtype=str))
    elif os.path.isdir(dir_):
        for f in os.listdir(dir_):
            if f.lower().endswith(".csv"):
                df = pd.read_csv(os.path.join(dir_, f), dtype=str)
                if "league_id" not in df.columns: df["league_id"] = os.path.splitext(f)[0]
                frames.append(df)
    else:
        raise FileNotFoundError("No matches.xlsx, matches.csv, or matches/ folder found.")
    return pd.concat(frames, ignore_index=True)

def load_teams_meta(base_dir):
    p = os.path.join(base_dir, TEAMS_META_CSV)
    if not os.path.exists(p):
        return pd.DataFrame(columns=["team_id","team_name","league_id","logo","primary_color","text_color"])
    try:
        return pd.read_csv(p, dtype=str).fillna("")
    except UnicodeDecodeError:
        for enc in ("utf-8-sig", "cp1252", "latin-1"):
            try:
                return pd.read_csv(p, dtype=str, encoding=enc).fillna("")
            except Exception:
                continue
        print(f"⚠️ Could not decode {p}; continuing with empty teams meta.")
        return pd.DataFrame(columns=["team_id","team_name","league_id","logo","primary_color","text_color"])

def load_league_strengths(leagues, base_dir):
    lsis = {lg:0.0 for lg in leagues}
    p = os.path.join(base_dir, LEAGUE_STRENGTHS_CSV)
    if os.path.exists(p):
        df = pd.read_csv(p)
        if "league_id" in df.columns and "LSI" in df.columns:
            for _, r in df.iterrows():
                lsis[str(r["league_id"])] = float(r["LSI"])
    return lsis

# ----------------------- ELO -----------------------
def update_match(rh, ra, hs, as_, stage, neutral):
    H = 0 if neutral else HGA
    eh = expected_score(rh+H, ra)
    ea = 1-eh
    sh, sa = (1,0) if hs>as_ else ((0,1) if hs<as_ else (0.5,0.5))
    M = margin_multiplier(hs-as_)
    K = k_by_stage(stage)
    return rh + K*M*(sh-eh), ra + K*M*(sa-ea)

def stage_from_row(row):
    return "final" if str(row.get("is_grand_final","")).strip().upper()=="TRUE" else "regular"

def compute_team_names(matches, teams_meta=None):
    """Display names come from teams_meta.csv, joined only by stable team_id.
    Match workbook name columns are intentionally not authoritative.
    """
    names = {}
    if teams_meta is not None and not teams_meta.empty and {"team_id", "team_name"}.issubset(teams_meta.columns):
        for _, row in teams_meta.iterrows():
            tid = str(row.get("team_id", "")).strip()
            name = _norm_name(str(row.get("team_name", "")))
            if tid and name:
                names[tid] = name
    # Fallback only for IDs not yet present in metadata; never overwrite metadata names.
    for col_id, col_name in (("home_team_id", "home_team_name"), ("away_team_id", "away_team_name")):
        if col_id in matches.columns:
            for _, row in matches[[col_id] + ([col_name] if col_name in matches.columns else [])].drop_duplicates().iterrows():
                tid = str(row[col_id]).strip()
                if tid and tid not in names:
                    names[tid] = _norm_name(str(row.get(col_name, tid))) if col_name in row else tid
    return names

def seasons_sorted(vals):
    try: return [str(i) for i in sorted(set(int(v) for v in vals if str(v).strip()!=""))]
    except: return sorted(set(str(v) for v in vals if str(v).strip()!=""))

def compute_league_elos_by_season(matches):
    for c in ["date_utc","league_id","home_team_id","away_team_id","home_score","away_score","season"]:
        if c not in matches.columns: raise ValueError(f"Missing {c}")
    matches = matches.copy()
    matches["parsed_date"] = matches["date_utc"].apply(parse_local_date)
    matches["is_neutral"] = matches.get("is_neutral", False).apply(to_bool)
    matches["is_grand_final"] = matches.get("is_grand_final", False).apply(to_bool)
    for c in ["home_score","away_score"]:
        matches[c] = pd.to_numeric(matches[c], errors="coerce").fillna(0).astype(int)

    out = []
    for league, dfL in matches.groupby("league_id"):
        season_order = seasons_sorted(dfL["season"].unique())
        last_ratings, last_mean = None, ELO_CENTER
        for s in season_order:
            dfs = dfL[dfL["season"].astype(str)==s].sort_values("parsed_date")
            teams = pd.unique(dfs[["home_team_id","away_team_id"]].values.ravel())
            ratings = {t:(last_mean if last_ratings else ELO_CENTER) for t in teams}
            if PRESEASON_BLEND and last_ratings:
                for t in teams:
                    ratings[t] = BLEND_WEIGHT*last_ratings.get(t,last_mean)+(1-BLEND_WEIGHT)*last_mean
            for _, r in dfs.iterrows():
                h,a = r["home_team_id"], r["away_team_id"]
                hs,as_ = int(r["home_score"]), int(r["away_score"])
                stage = stage_from_row(r); neutral = bool(r["is_neutral"])
                newH, newA = update_match(ratings.get(h,ELO_CENTER), ratings.get(a,ELO_CENTER), hs, as_, stage, neutral)
                ratings[h], ratings[a] = newH, newA

            last_ratings = ratings.copy()
            last_mean = float(np.mean(list(ratings.values()))) if ratings else ELO_CENTER

        for t, r in last_ratings.items():
            subset = dfL[(dfL["home_team_id"]==t) | (dfL["away_team_id"]==t)]
            city = subset["city"].dropna().map(_norm_name)
            country = subset["country"].dropna().map(_norm_name)
            city_val = city.mode().iat[0] if not city.empty else ""
            country_val = country.mode().iat[0] if not country.empty else ""
            out.append({"league_id": league, "team_id": t, "league_rating": r, "city": city_val, "country": country_val})
    return pd.DataFrame(out)

def build_global_table(league_df, base_dir):
    stats = league_df.groupby("league_id")["league_rating"].agg(["mean","std"]).reset_index()
    stats.rename(columns={"mean":"league_mean","std":"league_sd"}, inplace=True)
    df = league_df.merge(stats, on="league_id", how="left")
    df["league_sd"] = df["league_sd"].fillna(0).clip(lower=SD_FLOOR)
    lsi_map = load_league_strengths(df["league_id"].unique(), base_dir)
    df["LSI"] = df["league_id"].map(lsi_map).fillna(0.0)
    df["z"] = (df["league_rating"] - df["league_mean"]) / df["league_sd"]
    df["global_rating"] = 1500.0 + df["LSI"] + df["z"] * SIGMA_GLOBAL
    df = df.sort_values("global_rating", ascending=False).reset_index(drop=True)
    df["rank"] = np.arange(1, len(df) + 1)
    return df

# ----------------------- SEASON STATS (P/W/D/L + last-5) -----------------------
def _result_for(team_side: str, hs: int, as_: int) -> str:
    if hs == as_: return "D"
    if (team_side == "home" and hs > as_) or (team_side == "away" and as_ > hs): return "W"
    return "L"

def compute_latest_season_stats(matches: pd.DataFrame) -> pd.DataFrame:
    """Latest-season P/W/D/L and form per stable team_id, independent of display labels/location."""
    df = matches.copy()
    df["parsed_date"] = df["date_utc"].apply(parse_local_date)
    for c in ["home_score", "away_score"]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
    rows = []
    all_ids = pd.unique(pd.concat([df["home_team_id"], df["away_team_id"]], ignore_index=True))
    for tid in all_ids:
        subset = df[(df["home_team_id"] == tid) | (df["away_team_id"] == tid)].copy()
        seasons = seasons_sorted(subset["season"].unique()) if "season" in subset.columns else []
        if seasons:
            subset = subset[subset["season"].astype(str) == seasons[-1]]
        subset = subset.sort_values("parsed_date")
        seq = []
        for _, r in subset.iterrows():
            hs, as_ = int(r["home_score"]), int(r["away_score"])
            side = "home" if r["home_team_id"] == tid else "away"
            seq.append(_result_for(side, hs, as_))
        P = len(seq); W = seq.count("W"); D = seq.count("D"); L = seq.count("L")
        rows.append({"team_id": tid, "P": P, "W": W, "D": D, "L": L, "form": "".join(seq[-5:])})
    return pd.DataFrame(rows)

def form_boxes(form_str: str) -> str:
    if not form_str:
        return "".join(
            "<span style='display:inline-block;width:14px;height:14px;background:#e5e7eb;border-radius:3px;margin:0 2px'></span>"
            for _ in range(5)
        )
    colors = {"W":"#16a34a", "L":"#dc2626", "D":"#6b7280"}
    seq = list(str(form_str)[-5:])
    pads = 5 - len(seq)
    html = []
    for _ in range(pads):
        html.append("<span style='display:inline-block;width:14px;height:14px;background:#e5e7eb;border-radius:3px;margin:0 2px'></span>")
    for ch in seq:
        c = colors.get(ch, "#e5e7eb")
        html.append(f"<span title='{ch}' style='display:inline-block;width:14px;height:14px;background:{c};border-radius:3px;margin:0 2px'></span>")
    return "".join(html)

# ----------------------- MERGE NAMES/LOGOS/COLOURS -----------------------
def add_team_fields(df, name_map, teams_meta):
    """Attach authoritative club metadata by team_id; do not join on names or location.
    league_id on this intermediate frame remains the match competition for Elo strength.
    team_league_id is the metadata-controlled competition label used for display.
    """
    out = df.copy()
    out["team_name"] = out["team_id"].map(name_map).fillna(out["team_id"]).map(_norm_name)
    for col in ["logo", "primary_color", "text_color", "city", "country", "stadium", "website", "instagram", "facebook", "x", "youtube"]:
        out[col] = ""
    out["team_league_id"] = out.get("league_id", "")
    if not teams_meta.empty and "team_id" in teams_meta.columns:
        meta = teams_meta.copy()
        meta["team_id"] = meta["team_id"].astype(str).str.strip()
        meta = meta.drop_duplicates(subset=["team_id"], keep="last").set_index("team_id")
        for col in ["team_name", "logo", "primary_color", "text_color", "city", "country", "stadium", "website", "instagram", "facebook", "x", "youtube"]:
            if col in meta.columns:
                mapped = out["team_id"].map(meta[col]).fillna("").astype(str).map(_norm_name)
                if col == "team_name":
                    out["team_name"] = mapped.where(mapped.ne(""), out["team_id"].astype(str))
                else:
                    out[col] = mapped
        if "league_id" in meta.columns:
            mapped_league = out["team_id"].map(meta["league_id"]).fillna("").astype(str).map(_norm_name)
            out["team_league_id"] = mapped_league.where(mapped_league.ne(""), out["team_league_id"])
    return out

# ----------------------- HTML (GLOBAL) -----------------------
def build_html(base_dir, global_df):
    css = """
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;font-size:17px;color:#111;}
    header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    header .brand{font-weight:700;font-size:22px}
    .sub{color:#555;margin-bottom:18px}
    table{border-collapse:collapse;width:100%;font-size:16px;}
    th,td{padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:left;vertical-align:middle}
    thead th{position:sticky;top:0;background:#f8fafc;}
    td.rank{width:48px;font-weight:600;}
    td.rating{text-align:right;font-variant-numeric:tabular-nums;}
    img{border-radius:6px;}
    footer{margin-top:18px;color:#666;font-size:13px}
    """
    rows = []
    for _, r in global_df.iterrows():
        logo = safe_logo_src(r.get("logo",""))
        logo_html = f'<img src="{html_escape(logo)}" width="36" height="36" style="vertical-align:middle;margin-right:8px;">' if logo else ""
        form_html = form_boxes(str(r.get("form","")))
        rows.append(
            f"<tr>"
            f"<td class='rank'>{int(r['rank'])}</td>"
            f"<td>{logo_html}{html_escape(r['team_name'])}</td>"
            f"<td>{html_escape(r['league_id'])}</td>"
            f"<td>{html_escape(r.get('city',''))}</td>"
            f"<td>{html_escape(r.get('country',''))}</td>"
            f"<td>{int(r.get('P',0))}</td>"
            f"<td>{int(r.get('W',0))}</td>"
            f"<td>{int(r.get('D',0))}</td>"
            f"<td>{int(r.get('L',0))}</td>"
            f"<td>{form_html}</td>"
            f"<td class='rating'>{r['global_rating']:.1f}</td>"
            f"</tr>"
        )
    html = f"""<!doctype html><html><meta charset='utf-8'>
<title>Club Rugby Rankings</title>
<style>{css}</style>
<body>
  <header><div class="brand">🏉 XV Nation — Club Rugby Rankings</div></header>
  <div class="sub">Global combined rankings and per-league tables.</div>
  <table>
    <thead><tr>
      <th>#</th><th>Team</th><th>League</th><th>City</th><th>Country</th>
      <th>P</th><th>W</th><th>D</th><th>L</th><th>Form</th><th>Rating</th>
    </tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table>
  <footer>Last updated: {html_escape(now_stamp())}</footer>
</body></html>"""
    path = os.path.join(base_dir, OUT_HTML)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    return path

# ----------------------- PER-LEAGUE PAGES -----------------------
def build_per_league_pages(base_dir: str, league_df: pd.DataFrame):
    out_dir = os.path.join(base_dir, OUT_LEAGUE_DIR)
    os.makedirs(out_dir, exist_ok=True)
    css = """
    body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:24px;color:#111;}
    header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    header .brand{font-weight:700;font-size:22px}
    .sub{color:#555;margin-bottom:18px}
    table{border-collapse:collapse;width:100%;}
    th,td{padding:10px 12px;border-bottom:1px solid #e9ecef;text-align:left;vertical-align:middle}
    thead th{position:sticky;top:0;background:#f8fafc;}
    td.rank{width:48px;font-weight:600;}
    td.rating{text-align:right;font-variant-numeric:tabular-nums;}
    img{border-radius:6px;}
    footer{margin-top:18px;color:#666;font-size:13px}
    """
    for lg, g in league_df.groupby("league_id"):
        slug = slugify(lg)
        g_sorted = g.sort_values("league_rating", ascending=False).reset_index(drop=True)
        rows = []
        for i, r in g_sorted.iterrows():
            raw_logo = safe_logo_src(r.get("logo", ""))
            logo_src = raw_logo.replace("\\", "/").lstrip("./")
            if logo_src and not re.match(r'^(https?:)?//', logo_src) and not logo_src.startswith(("/", "file://")):
                logo_src = f"../{logo_src}"
            logo_html = f'<img src="{html_escape(logo_src)}" width="36" height="36" style="vertical-align:middle;margin-right:8px;border-radius:6px;">' if logo_src else ""
            form_html = form_boxes(str(r.get("form","")))
            rows.append(
                f"<tr>"
                f"<td class='rank'>{i+1}</td>"
                f"<td>{logo_html}{html_escape(r['team_name'])}</td>"
                f"<td>{html_escape(lg)}</td>"
                f"<td>{html_escape(r.get('city',''))}</td>"
                f"<td>{html_escape(r.get('country',''))}</td>"
                f"<td>{int(r.get('P',0))}</td>"
                f"<td>{int(r.get('W',0))}</td>"
                f"<td>{int(r.get('D',0))}</td>"
                f"<td>{int(r.get('L',0))}</td>"
                f"<td>{form_html}</td>"
                f"<td class='rating'>{r['league_rating']:.1f}</td>"
                f"</tr>"
            )
        page = f"""<!doctype html><html><meta charset='utf-8'>
<title>{html_escape(lg)} — Club Rugby Rankings</title>
<style>{css}</style>
<body>
  <header><div class="brand">🏉 XV Nation — Club Rugby Rankings</div></header>
  <div class="sub"><a href="../index.html">← Back to homepage</a></div>
  <h1>{html_escape(lg)}</h1>
  <table>
    <thead><tr>
      <th>#</th><th>Team</th><th>League</th><th>City</th><th>Country</th>
      <th>P</th><th>W</th><th>D</th><th>L</th><th>Form</th><th>Rating</th>
    </tr></thead>
    <tbody>{''.join(rows)}</tbody>
  </table>
  <footer>Last updated: {html_escape(now_stamp())}</footer>
</body></html>"""
        with open(os.path.join(out_dir, f"{slug}.html"), "w", encoding="utf-8") as f:
            f.write(page)

# ----------------------- TOP 20 PAGE (two columns, bigger fonts, bigger logos, narrower layout, no rank bg) -----------------------
def build_top20_html(base_dir: str, global_df: pd.DataFrame):
    top = global_df.sort_values("rank").head(20).copy()
    left  = top[top["rank"] <= 10].copy()
    right = top[(top["rank"] >= 11) & (top["rank"] <= 20)].copy()

    def render_col(df_col: pd.DataFrame) -> str:
        rows = []
        for _, r in df_col.iterrows():
            primary = (r.get("primary_color") or "").strip() or "#EDEDED"
            textc   = (r.get("text_color") or "").strip() or _auto_text_color(primary)
            w = int(r.get("W", 0)); l = int(r.get("L", 0))
            name = html_escape(r["team_name"])

            raw_logo = safe_logo_src(r.get("logo", ""))
            logo_src = raw_logo.replace("\\", "/").lstrip("./") if raw_logo else ""
            logo_html = f'<img class="logo" src="{html_escape(logo_src)}" alt="">' if logo_src else ""

            rows.append(
                f"<div class='item' style='background:{html_escape(primary)};color:{html_escape(textc)}'>"
                f"  <span class='rk'>{int(r['rank'])}</span>"
                f"  <span class='nm'>{name} {w}-{l}</span>"
                f"  <span class='spacer'></span>"
                f"  {logo_html}"
                f"</div>"
            )
        return "".join(rows)

    css = """
    @import url('https://fonts.googleapis.com/css2?family=Jersey+25&display=swap');
    body{
      margin:24px;
      font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
      color:#111;
      display:flex; justify-content:center;
    }
    .page{ width: fit-content; }
    .brand{
      font-family:'Jersey 25','JerseyLetters',Impact,sans-serif;
      font-weight:900; font-size:90px; margin-bottom:6px; color:#00E1F1;
      letter-spacing:.6px; text-align:center;
    }
    .sub{color:#555;margin-bottom:16px;font-weight:600;text-align:center}
    .grid{
      display:grid;
      grid-template-columns: 800px 800px;
      gap:16px;
      justify-content:center;
    }
    .item{
      display:flex; align-items:center; gap:16px;
      padding:18px 18px; border-radius:12px; font-weight:800;
      box-shadow:0 2px 10px rgba(0,0,0,.08);
      min-height:110px;
    }
    .rk{ font-size:36px; font-weight:900; line-height:1; margin-right:6px; }
    .nm{ font-size:40px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .spacer{flex:1}
    .logo{
      width:110px; height:110px; object-fit:contain; border-radius:6px; background:transparent;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,.25));
    }
    @media (max-width:900px){ .grid{ grid-template-columns: 1fr; } }
    """

    html_doc = f"""<!doctype html><html><meta charset="utf-8">
<title>Top 20 — Club Rugby Rankings</title>
<style>{css}</style>
<body>
  <div class="page">
    <div class="brand">🏉 XV Nation's Top 20</div>
    <div class="sub">Club Rugby Rankings</div>
    <div class="grid">
      <div>{render_col(left)}</div>
      <div>{render_col(right)}</div>
    </div>
  </div>
</body></html>"""

    path = os.path.join(base_dir, OUT_TOP25)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    return path

# ----------------------- TOP 25 GRID (fixed 1200x1200 HTML) -----------------------
def build_top25_grid_html(base_dir: str, global_df: pd.DataFrame):
    top = global_df.sort_values("rank").head(25).copy()
    tiles_html = []
    for _, r in top.iterrows():
        primary = (r.get("primary_color") or "").strip() or "#EDEDED"
        textc   = (r.get("text_color") or "").strip() or _auto_text_color(primary)
        raw_logo = safe_logo_src(r.get("logo", ""))
        logo_src = raw_logo.replace("\\", "/").lstrip("./") if raw_logo else ""
        team = html_escape(r.get("team_name",""))
        tiles_html.append(f"""
        <div class="tile" style="background:{html_escape(primary)};color:{html_escape(textc)}">
          <div class="rank-badge">{int(r['rank'])}</div>
          {f'<img class="logo" src="{html_escape(logo_src)}" alt="">' if logo_src else ''}
          <div class="label">{team}</div>
        </div>
        """)

    css = """
    @import url('https://fonts.googleapis.com/css2?family=Graduate&display=swap');
    html,body{margin:0;padding:0;background:#0b0b0b;color:#f3f3f3}
    .wrap{width:1200px; height:1200px; margin:0 auto; display:flex; flex-direction:column;}
    .banner{flex:0 0 120px; display:flex; align-items:center; justify-content:space-between;
            padding:18px 22px; background:linear-gradient(90deg,#111,#333,#111);
            color:#f3f3f3; box-shadow: inset 0 4px 24px rgba(0,0,0,.35);}
    .title{font-weight:900; font-size:36px; letter-spacing:.4px}
    .meta{opacity:.9; font-size:16px}
    .grid{flex:1; display:grid; grid-template-columns:repeat(5,1fr); gap:10px; padding:10px 20px 20px; place-items:center;}
    .tile{position:relative; width:220px; height:220px; border-radius:16px; overflow:visible;
          display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(0,0,0,.25);}
    .rank-badge{position:absolute; top:8px; left:8px; z-index:10; background:#000; color:#fff; border-radius:6px; padding:6px 12px;
                font:900 28px/1 'Graduate', Impact, sans-serif; letter-spacing:.5px; text-shadow:0 2px 4px rgba(0,0,0,.5);
                border:2px solid rgba(255,255,255,.15);}
    .tile .logo{width:92%; height:92%; max-width:200px; max-height:200px; object-fit:contain;
                background:transparent; z-index:5; filter:drop-shadow(0 10px 16px rgba(0,0,0,.35));}
    .label{position:absolute; bottom:-6px; left:0; right:0; text-align:center; font:700 14px/1.1 'Graduate', Impact, sans-serif;
           color:#fff; text-shadow:0 2px 4px rgba(0,0,0,.6);}
    """
    html_doc = f"""<!doctype html><html lang="en"><meta charset="utf-8">
<title>Top 25 Grid — Club Rugby Rankings</title>
<style>{css}</style>
<body>
  <div class="wrap">
    <div class="banner">
      <div class="title">🏉 XV Nation — Top 25</div>
      <div class="meta">{html_escape(now_stamp())}</div>
    </div>
    <div class="grid">{''.join(tiles_html)}</div>
  </div>
</body></html>"""
    path = os.path.join(base_dir, OUT_TOP25_GRID)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html_doc)
    return path

# ----------------------- HOMEPAGE (index.html) = NRL-STYLE TOP 20 LADDER + LINKS + LEAGUE LINKS -----------------------
def build_index(base_dir: str, league_df: pd.DataFrame, global_df: pd.DataFrame):
    """
    Replaces index.html:
      - Top section: NRL-style Top 20 ladder (logos inline, Top 8 highlighted)
      - Links: Global Rankings, Top 20 page, Top 25 Grid
      - Bottom: League links
    """
    os.makedirs(os.path.join(base_dir, OUT_LEAGUE_DIR), exist_ok=True)

    top20 = global_df.sort_values("rank").head(20).copy()

    # League links
    leagues = sorted(league_df["league_id"].dropna().unique().tolist())
    league_links = [f'<li><a href="leagues/{slugify(lg)}.html">{html_escape(lg)}</a></li>' for lg in leagues]

    ladder_rows = []
    for _, r in top20.iterrows():
        rk = int(r["rank"])
        row_cls = []
        if rk <= 8:
            row_cls.append("top8")
        if rk == 1:
            row_cls.append("rank1")
        cls_attr = f' class="{" ".join(row_cls)}"' if row_cls else ""

        raw_logo = safe_logo_src(r.get("logo", ""))
        logo_src = raw_logo.replace("\\", "/").lstrip("./") if raw_logo else ""
        logo_html = f'<img class="club-logo" src="{html_escape(logo_src)}" alt="">' if logo_src else ""

        form_html = form_boxes(str(r.get("form", "")))

        ladder_rows.append(
            f"<tr{cls_attr}>"
            f"<td class='rank'>{rk}</td>"
            f"<td class='club'>{logo_html}<span class='club-name'>{html_escape(r['team_name'])}</span></td>"
            f"<td class='lg'>{html_escape(r.get('league_id',''))}</td>"
            f"<td>{int(r.get('P',0))}</td>"
            f"<td>{int(r.get('W',0))}</td>"
            f"<td>{int(r.get('D',0))}</td>"
            f"<td>{int(r.get('L',0))}</td>"
            f"<td class='formcell'>{form_html}</td>"
            f"<td class='elo'>{float(r.get('global_rating',0.0)):.1f}</td>"
            f"</tr>"
        )

    css = """
    :root{ --accent:#00E1F1; }
    body{
      font-family: Arial, Helvetica, sans-serif;
      margin:24px;
      color:#111;
    }
    header{
      display:flex;
      align-items:baseline;
      justify-content:space-between;
      gap:16px;
      margin-bottom:14px;
    }
    .brand{
      font-weight:900;
      font-size:28px;
      letter-spacing:.2px;
    }
    .stamp{ color:#666; font-size:13px; }

    .nav{
      margin: 6px 0 18px;
      color:#444;
      font-size:14px;
    }
    .nav a{ color:#111; font-weight:800; text-decoration:none; }
    .nav a:hover{ text-decoration:underline; }
    .nav .sep{ color:#999; padding:0 10px; }

    /* NRL-ish ladder */
    table.ladder{
      width:100%;
      border-collapse:collapse;
      font-size:14px;
    }
    table.ladder thead{
      background:#111;
      color:#fff;
    }
    table.ladder th{
      padding:9px 6px;
      text-transform:uppercase;
      font-size:12px;
      letter-spacing:.4px;
      text-align:center;
      white-space:nowrap;
    }
    table.ladder td{
      padding:9px 6px;
      border-bottom:1px solid #e5e7eb;
      text-align:center;
      vertical-align:middle;
    }
    table.ladder td.rank{ font-weight:900; width:44px; }
    table.ladder td.club{
      text-align:left;
      font-weight:900;
      display:flex;
      align-items:center;
      gap:10px;
    }
    .club-logo{
      width:26px;
      height:26px;
      object-fit:contain;
      border-radius:4px;
      flex:0 0 auto;
    }
    .club-name{ display:inline-block; }

    table.ladder td.lg{
      text-align:left;
      color:#333;
      font-weight:700;
      max-width:260px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }
    table.ladder td.formcell{ min-width:120px; }

    table.ladder td.elo{
      text-align:right;
      font-variant-numeric: tabular-nums;
      font-weight:900;
      width:84px;
    }

    /* Highlight Top 8 */
    table.ladder tbody tr.top8{
      background:#f5fbff;
      border-left:6px solid var(--accent);
    }
    table.ladder tbody tr.top8 td{ font-weight:900; }
    table.ladder tbody tr.rank1{ background:#e9fbff; }

    h2{ margin:22px 0 10px; font-size:18px; }
    ul{ padding-left:18px; }
    footer{ margin-top:18px; color:#666; font-size:13px; }
    """

    html_doc = f"""<!doctype html><html><meta charset="utf-8">
<title>XV Nation — Club Rugby Rankings</title>
<style>{css}</style>
<body>
  <header>
    <div class="brand">🏉 XV Nation — Club Rugby Rankings</div>
    <div class="stamp">Last updated: {html_escape(now_stamp())}</div>
  </header>

  <div class="nav">
    <a href="rankings.html">Global Rankings</a><span class="sep">•</span>
    <a href="top25.html">Top 20</a><span class="sep">•</span>
    <a href="top25_grid.html">Top 25 Grid</a>
  </div>

  <h2>Top 20 Ladder</h2>
  <table class="ladder">
    <thead>
      <tr>
        <th>Rk</th><th style="text-align:left">Club</th><th style="text-align:left">League</th>
        <th>P</th><th>W</th><th>D</th><th>L</th><th>Form</th><th>Elo</th>
      </tr>
    </thead>
    <tbody>
      {''.join(ladder_rows)}
    </tbody>
  </table>

  <h2>Leagues</h2>
  <ul>{''.join(league_links)}</ul>

  <footer>Tip: Top 8 highlighted like an NRL finals cut.</footer>
</body></html>"""

    with open(os.path.join(base_dir, OUT_INDEX), "w", encoding="utf-8") as f:
        f.write(html_doc)

# ----------------------- PIPELINE -----------------------
def run_pipeline(base_dir):
    matches = load_matches_any(base_dir)
    matches = _clean_team_columns(matches)

    teams_meta = load_teams_meta(base_dir)

    names = compute_team_names(matches, teams_meta)
    league_ratings = compute_league_elos_by_season(matches)

    league_with_names = add_team_fields(league_ratings, names, teams_meta)
    global_table      = build_global_table(league_with_names, base_dir)
    global_with_names = add_team_fields(global_table, names, teams_meta)

    stats_df = compute_latest_season_stats(matches)
    league_with_names = league_with_names.merge(stats_df, on="team_id", how="left")
    global_with_names = global_with_names.merge(stats_df, on="team_id", how="left")

    # Display competition is authoritative in teams_meta.csv; match league_id remains used
    # internally for Elo strength calculations only.
    for _df in (league_with_names, global_with_names):
        if "team_league_id" in _df.columns:
            _df["league_id"] = _df["team_league_id"].where(_df["team_league_id"].astype(str).str.strip().ne(""), _df["league_id"])
            _df.drop(columns=["team_league_id"], inplace=True)

    global_with_names = global_with_names.sort_values("global_rating", ascending=False)\
                                         .drop_duplicates(subset=["team_id"], keep="first")
    league_with_names = league_with_names.sort_values(["league_id","league_rating"], ascending=[True, False])\
                                         .drop_duplicates(subset=["league_id","team_id"], keep="first")

    global_with_names = global_with_names.sort_values("global_rating", ascending=False).reset_index(drop=True)
    global_with_names["rank"] = np.arange(1, len(global_with_names)+1)

    league_with_names.to_csv(os.path.join(base_dir, OUT_LEAGUE), index=False)
    global_with_names.to_csv(os.path.join(base_dir, OUT_GLOBAL), index=False)

    build_per_league_pages(base_dir, league_with_names)
    build_top20_html(base_dir, global_with_names)
    build_top25_grid_html(base_dir, global_with_names)
    build_html(base_dir, global_with_names)

    # ✅ NEW: homepage is the ladder
    build_index(base_dir, league_with_names, global_with_names)

    return os.path.join(base_dir, OUT_INDEX)

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    index_path = run_pipeline(here)
    try:
        webbrowser.open("file://" + index_path.replace("\\", "/"))
    except Exception:
        pass
    print(f"✅ Done. Opened: {index_path}")
