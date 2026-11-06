const esc=s=>XVN.escape(s);
const initials=s=>String(s||'XV').split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const safeUrl=v=>{const s=String(v||'').trim();if(!s)return '';try{const u=new URL(/^https?:\\/\\//i.test(s)?s:'https://'+s);return ['http:','https:'].includes(u.protocol)?u.href:'';}catch{return '';}};
XVN.load('../').then(data=>{
 const body=document.getElementById('leagueRows'),id=body?.dataset.competition;if(!body||!id)return;
 const comp=data.competitionsById.get(id);if(!comp)throw Error('Competition not found in competitions_meta.csv');
 document.title=comp.competition_name+' | XV Nation';
 const heading=document.getElementById('competitionName');if(heading)heading.textContent=comp.competition_name;
 const description=document.getElementById('competitionDescription');if(description)description.textContent=comp.description||'Competition information will be added soon.';
 const fields=[['Union',comp.union],['Location',comp.location],['Region',comp.region],['State',comp.state],['Country',comp.country],['Format',comp.format],['Official website',safeUrl(comp.website)?`<a href="${esc(safeUrl(comp.website))}" target="_blank" rel="noopener noreferrer">Visit website ↗</a>`: '']];
 const facts=document.getElementById('competitionFacts');if(facts)facts.innerHTML=fields.filter(([,v])=>String(v||'').trim()).map(([k,v])=>`<div class="competition-fact"><span>${esc(k)}</span><strong>${k==='Official website'?v:esc(v)}</strong></div>`).join('');
 const seasons=[...new Set(data.teamCompetitions.filter(m=>m.competition_id===id).map(m=>String(m.season)))].sort((a,b)=>Number(b)-Number(a));
 const select=document.getElementById('competitionSeason');if(select){select.innerHTML=seasons.map(s=>`<option value="${esc(s)}">${esc(s)} season</option>`).join('');select.value=String(data.currentSeason);}
 const history=document.getElementById('competitionHistory');
 if(history){history.innerHTML=seasons.map(s=>{const rows=data.teamCompetitions.filter(m=>m.competition_id===id&&String(m.season)===s);const divisions=[...new Set(rows.map(m=>m.division).filter(Boolean))].sort();return `<div class="competition-history-item"><strong>${esc(s)}</strong> · ${rows.length} clubs · ${esc(divisions.join(', ')||'Division not set')}</div>`;}).join('');}
 function draw(season){const rows=data.teamCompetitions.filter(m=>m.competition_id===id&&String(m.season)===String(season)).sort((a,b)=>String(a.division).localeCompare(String(b.division))||String(data.metaById.get(XVN.key(a.team_id))?.team_name||a.team_id).localeCompare(String(data.metaById.get(XVN.key(b.team_id))?.team_name||b.team_id)));
  body.innerHTML=rows.map(m=>{const t=data.byId.get(XVN.key(m.team_id)),meta=data.metaById.get(XVN.key(m.team_id))||{},name=meta.team_name||m.team_id,rank=t? t.rank:'—',logo=meta.logo?('../'+String(meta.logo).replace(/^\\.\\//,'').replace(/^\\//,'')):'';const club=t?`<a class="teamcell" href="../clubs/${encodeURIComponent(t.slug)}.html"><span class="badge">${logo?`<img src="${esc(logo)}" alt="" onerror="this.remove();this.parentElement.textContent='${initials(name)}'">`:initials(name)}</span>${esc(name)}</a>`:`<span class="teamcell"><span class="badge">${initials(name)}</span>${esc(name)}</span>`;return `<tr><td>${rank}</td><td>${club}</td><td>${esc(m.division||'—')}</td><td>${esc(m.movement||'—')}</td><td>${t?Number(t.global_rating).toFixed(1):'—'}</td></tr>`;}).join('')||'<tr><td colspan="5" class="empty">No club membership recorded for this season.</td></tr>';
  const note=document.getElementById('seasonNote');if(note)note.textContent=`Showing ${rows.length} club memberships for the ${season} season. Historical membership is based on recorded fixtures and supplied promotion/relegation information.`;
 }
 select?.addEventListener('change',()=>draw(select.value));draw(select?.value||data.currentSeason);
}).catch(e=>{const b=document.getElementById('leagueRows');if(b)b.innerHTML=`<tr><td colspan="5" class="empty">${esc(e.message)}</td></tr>`;});