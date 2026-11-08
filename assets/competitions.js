const esc=s=>XVN.escape(s);
XVN.load('').then(data=>{
 const host=document.getElementById('competitionGrid');if(!host)return;
 const competitions=data.competitions.slice().sort((a,b)=>String(a.city||'').localeCompare(String(b.city||'')));
 const clubCount=new Set(data.teamCompetitions.filter(m=>Number(m.season)===data.currentSeason).map(m=>m.team_id)).size;
 const countries=new Set(competitions.map(c=>c.country).filter(Boolean)).size;
 const summary=document.getElementById('competitionSummary');
 if(summary)summary.innerHTML='<strong>'+competitions.length+'</strong> competitions <span>·</span> <strong>'+clubCount+'</strong> clubs <span>·</span> <strong>'+countries+'</strong> countries';
 host.innerHTML=competitions.map((c,i)=>{
  const members=data.teamCompetitions.filter(m=>Number(m.season)===data.currentSeason&&m.competition_id===c.competition_id);
  const ranked=data.teams.filter(t=>t.competition_id===c.competition_id).sort((a,b)=>a.rank-b.rank);
  const leading=ranked[0]?.name||'No ranked club yet';
  const place=[c.city,c.state,c.country].filter(Boolean).join(', ');
  return '<a class="card competition-feature-card" href="leagues/'+encodeURIComponent(c.competition_id)+'.html"><div class="competition-card-top"><span class="competition-number">'+String(i+1).padStart(2,'0')+'</span><span class="competition-country">'+esc(c.country||'International')+'</span></div><div class="competition-card-main"><div class="competition-card-city">'+esc(place)+'</div><h3>'+esc(c.competition_name)+'</h3><div class="competition-card-rule"></div><div class="competition-card-stats"><span><strong>'+members.length+'</strong> clubs</span><span><strong>'+data.currentSeason+'</strong> season</span></div></div><div class="competition-card-bottom"><div><span class="competition-leading-label">CURRENT RANKING LEADER</span><strong>'+esc(leading)+'</strong></div><span class="competition-card-arrow" aria-hidden="true">↗</span></div></a>';
 }).join('');
}).catch(e=>{const host=document.getElementById('competitionGrid');if(host)host.innerHTML='<p class="empty">'+esc(e.message)+'</p>';});
