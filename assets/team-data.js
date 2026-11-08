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
  const aliases = {'two blues_prem':'two_blues_prem','ardmoremarist_prem':'ardmore_marist_prem','queanbeyan_prem':'queanbeyan_prem'};
  const key = id => { const k=String(id ?? '').trim().toLowerCase(); return aliases[k] || k; };
  async function get(url) { const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(`Could not load ${url} (${r.status})`); return r; }
  async function load(root='') {
    const [teamRes, metaRes, matchRes, compRes, membershipRes] = await Promise.all([
      get(`${root}data/teams.json`), get(`${root}teams_meta.csv`), get(`${root}data/matches.json`),
      get(`${root}competitions_meta.csv`), get(`${root}team_competitions.csv`)
    ]);
    const [baseTeams,csv,matches,compCsv,membershipCsv] = await Promise.all([teamRes.json(),metaRes.text(),matchRes.json(),compRes.text(),membershipRes.text()]);
    const metaRows=parseCSV(csv), competitions=parseCSV(compCsv), teamCompetitions=parseCSV(membershipCsv);
    const meta=new Map();
    for(const row of metaRows){ const k=key(row.team_id); if(!k) continue; if(meta.has(k)) throw new Error(`Duplicate team_id in teams_meta.csv: ${row.team_id}`); meta.set(k,row); }
    const competitionsById=new Map(competitions.map(c=>[c.competition_id,c]));
    const currentSeason=Math.max(0,...teamCompetitions.map(m=>Number(m.season)||0));
    const currentMembershipByTeam=new Map();
    for(const membership of teamCompetitions.filter(m=>Number(m.season)===currentSeason)) currentMembershipByTeam.set(key(membership.team_id),membership);
    const teams=baseTeams.map(base=>{
      const m=meta.get(key(base.team_id));
      if(!m) throw new Error(`No teams_meta.csv row for team_id ${base.team_id}`);
      const membership=currentMembershipByTeam.get(key(base.team_id));
      const competition=competitionsById.get(membership?.competition_id);
      return {...base,
        name:m.team_name || base.name, league:competition?.display_name || competition?.competition_name || m.league_id,
        competition_name:competition?.competition_name || '', conference_name:competition?.conference_name || '', display_name:competition?.display_name || competition?.competition_name || '',
        competition_id:membership?.competition_id || '', division:membership?.division ? `Division ${String(membership.division).replace(/^D/i,'')}` : '', division_code:membership?.division || '',
        logo:m.logo, city:m.city, state:m.state, country:m.country, stadium:m.stadium,
        website:m.website, instagram:m.instagram, facebook:m.facebook, x:m.x, youtube:m.youtube,
        team_id:base.team_id
      };
    });
    const byId=new Map(teams.map(t=>[key(t.team_id),t]));
    const metaById=new Map(metaRows.map(row=>[key(row.team_id),row]));
    return {teams,byId,metaById,matches,metaRows,competitions,competitionsById,teamCompetitions,currentSeason,currentMembershipByTeam};
  }
  function teamName(data,id){ return data.byId.get(key(id))?.name || data.metaById.get(key(id))?.team_name || String(id||'Unknown club'); }
  function matchesForTeam(data, teamId){
    return data.matches.filter(m=>key(m.home_team_id)===key(teamId)||key(m.away_team_id)===key(teamId))
      .slice().sort((a,b)=>String(b.date_utc||'').localeCompare(String(a.date_utc||''))).map(m=>{
        const isHome=key(m.home_team_id)===key(teamId), opponentId=isHome?m.away_team_id:m.home_team_id;
        const own=Number(isHome?m.home_score:m.away_score), opp=Number(isHome?m.away_score:m.home_score);
        return {date:m.date_utc, opponent:teamName(data,opponentId), score:`${own}–${opp}`, result:own===opp?'D':own>opp?'W':'L'};
      });
  }
  function currentTeamsForCompetition(data,competitionId){return data.teams.filter(t=>t.competition_id===competitionId).sort((a,b)=>Number(a.rank)-Number(b.rank));}
  function membershipsForCompetition(data,competitionId){return data.teamCompetitions.filter(m=>m.competition_id===competitionId).map(m=>({...m,team_name:data.metaById.get(key(m.team_id))?.team_name || m.team_id}));}
  window.XVN={load,teamName,matchesForTeam,currentTeamsForCompetition,membershipsForCompetition,escape:esc,key};
})();