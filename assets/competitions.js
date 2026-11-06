const esc=s=>XVN.escape(s);
XVN.load('').then(data=>{
 const host=document.querySelector('.grid');if(!host)return;
 host.innerHTML=data.competitions.slice().sort((a,b)=>a.competition_name.localeCompare(b.competition_name)).map(c=>{
  const members=data.teamCompetitions.filter(m=>Number(m.season)===data.currentSeason&&m.competition_id===c.competition_id);
  const ranked=data.teams.filter(t=>t.competition_id===c.competition_id).sort((a,b)=>a.rank-b.rank);
  const leading=ranked[0]?.name||'No ranked club yet';
  const location=[c.location,c.state,c.country].filter(Boolean).join(' · ');
  return '<a class="card competition-card" href="leagues/'+encodeURIComponent(c.competition_id)+'.html"><div class="eyebrow">'+members.length+' clubs · '+data.currentSeason+'</div><h3>'+esc(c.competition_name)+'</h3><p>'+esc(location)+'</p><p class="competition-union">'+esc(c.union||'Union details to be added')+'</p><p>Leading club: '+esc(leading)+'</p></a>';
 }).join('');
}).catch(e=>{const host=document.querySelector('.grid');if(host)host.innerHTML='<p class="empty">'+esc(e.message)+'</p>';});