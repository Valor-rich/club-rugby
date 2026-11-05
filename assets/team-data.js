(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function parseCSV(text) {
    const rows=[]; let row=[], cell='', quoted=false;
    for(let i=0;i<text.length;i++) { const c=text[i];
      if(quoted) { if(c==='"' && text[i+1]==='"'){cell+='"';i++;} else if(c==='"') quoted=false; else cell+=c; }
      else if(c==='"') quoted=true; else if(c===','){row.push(cell);cell='';}
      else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';} else if(c!=='\r') cell+=c;
    }
    if(cell.length || row.length){row.push(cell);rows.push(row);}
    if(!rows.length) return [];
    const headers=rows.shift().map(h=>h.trim().replace(/^\uFEFF/,''));
    return rows.filter(r=>r.some(v=>String(v||'').trim()!=='')).map(r=>Object.fromEntries(headers.map((h,i)=>[h,String(r[i]??'').trim()])));
  }
  const aliases = {'two blues_prem':'two_blues_prem','ardmoremarist_prem':'ardmore_marist_prem'};
  const key = id => { const k=String(id ?? '').trim().toLowerCase(); return aliases[k] || k; };
  async function get(url) { const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`Could not load ${url} (${r.status})`); return r; }
  async function load(root='') {
    const [teamRes, metaRes, matchRes] = await Promise.all([
      get(`${root}data/teams.json`), get(`${root}teams_meta.csv`), get(`${root}data/matches.json`)
    ]);
    const [baseTeams, csv, matches] = await Promise.all([teamRes.json(),metaRes.text(),matchRes.json()]);
    const metaRows=parseCSV(csv), meta=new Map();
    for(const row of metaRows){ const k=key(row.team_id); if(!k) continue; if(meta.has(k)) throw new Error(`Duplicate team_id in teams_meta.csv: ${row.team_id}`); meta.set(k,row); }
    const teams=baseTeams.map(base=>{
      const m=meta.get(key(base.team_id));
      if(!m) throw new Error(`No teams_meta.csv row for team_id ${base.team_id}`);
      // These fields are authoritative. Empty metadata remains empty; it never falls back to match labels.
      return {...base,
        name:m.team_name, league:m.league_id, logo:m.logo, city:m.city, country:m.country, stadium:m.stadium,
        website:m.website, instagram:m.instagram, facebook:m.facebook, x:m.x, youtube:m.youtube,
        team_id:base.team_id
      };
    });
    const byId=new Map(teams.map(t=>[key(t.team_id),t]));
    const metaById=new Map(metaRows.map(row=>[key(row.team_id),row]));
    return {teams,byId,metaById,matches,metaRows};
  }
  function teamName(data,id){ return data.byId.get(key(id))?.name || data.metaById.get(key(id))?.team_name || String(id||'Unknown club'); }
  function matchResultFor(match, teamId){
    const isHome=key(match.home_team_id)===key(teamId);
    const own=Number(isHome?match.home_score:match.away_score), opp=Number(isHome?match.away_score:match.home_score);
    return own===opp?'D':own>opp?'W':'L';
  }
  function matchesForTeam(data, teamId){
    return data.matches.filter(m=>key(m.home_team_id)===key(teamId)||key(m.away_team_id)===key(teamId))
      .slice().sort((a,b)=>String(b.date_utc||'').localeCompare(String(a.date_utc||''))).map(m=>{
        const isHome=key(m.home_team_id)===key(teamId), opponentId=isHome?m.away_team_id:m.home_team_id;
        const own=Number(isHome?m.home_score:m.away_score), opp=Number(isHome?m.away_score:m.home_score);
        return {date:m.date_utc, opponent:teamName(data,opponentId), score:`${own}–${opp}`, result:own===opp?'D':own>opp?'W':'L'};
      });
  }
  window.XVN={load,teamName,matchesForTeam,escape:esc,key};
})();
