const esc=s=>XVN.escape(s);
function logoPath(value){let p=String(value||'').trim();if(!p)return '';return p.replace(/^\.\//,'').replace(/^\//,'');}
XVN.load('').then(data=>{
 const host=document.querySelector('.grid');if(!host)return;
 host.innerHTML=data.competitions.slice().sort((a,b)=>String(a.conference_name||'').localeCompare(String(b.conference_name||''))).map(c=>{
  const members=data.teamCompetitions.filter(m=>Number(m.season)===data.currentSeason&&m.competition_id===c.competition_id);
  const ranked=data.teams.filter(t=>t.competition_id===c.competition_id).sort((a,b)=>a.rank-b.rank);
  const leading=ranked[0]?.name||'No ranked club yet';
  const location=[c.location,c.state,c.country].filter(Boolean).join(' · ');
  const logo=logoPath(c.logo),conference=c.conference_name||'Regional conference';
  return '<a class="card competition-card" href="leagues/'+encodeURIComponent(c.competition_id)+'.html">'+(logo?'<img class="competition-logo-card" src="'+esc(logo)+'" alt="'+esc(c.competition_name)+' logo" loading="lazy" onerror="this.style.display=\'none\'">':'')+'<div class="competition-card-copy"><div class="eyebrow">'+esc(conference)+'</div><h3>'+esc(c.competition_name)+'</h3><p>'+esc(location)+'</p><p class="competition-union">'+members.length+' clubs · '+data.currentSeason+' season</p><p>Leading club: '+esc(leading)+'</p></div></a>';
 }).join('');
}).catch(e=>{const host=document.querySelector('.grid');if(host)host.innerHTML='<p class="empty">'+esc(e.message)+'</p>';});