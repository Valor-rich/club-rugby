const esc = s => XVN.escape(s);
const initials = s => String(s||'XV').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const badge = t => `<span class="badge">${t.logo ? `<img src="${esc(t.logo)}" alt="${esc(t.name)} badge" onerror="this.remove();this.parentElement.textContent='${initials(t.name)}'">` : initials(t.name)}</span>`;
const profile = t => `clubs/${encodeURIComponent(t.slug)}.html`;
const formDots = value => `<span class="form" role="img" aria-label="Recent form: ${esc(value || 'not available')}">${[...(value || '')].map(v=>`<i class="${v}" title="${v==='W'?'Win':v==='L'?'Loss':v==='D'?'Draw':'Draw'}"></i>`).join('')}</span>`;

XVN.load('').then(data=>{
 const teams=data.teams;
 const cg=document.getElementById('homeCompetitionGrid');
 if(cg)cg.innerHTML=data.competitions.slice().sort((a,b)=>String(a.city||'').localeCompare(String(b.city||''))).map(c=>'<a class="card" href="leagues/'+encodeURIComponent(c.competition_id)+'.html"><div class="eyebrow">'+esc([c.city,c.country].filter(Boolean).join(', '))+'</div><h3>'+esc(c.competition_name)+'</h3><p>Competition rankings and club profiles</p></a>').join('');
 const body=document.getElementById('homeRankingRows');if(!body)return;
 body.innerHTML=[...teams].sort((a,b)=>a.rank-b.rank).slice(0,10).map(t=>`<tr><td class="rank">${String(t.rank).padStart(2,'0')}</td><td><a class="teamcell" href="${profile(t)}">${badge(t)}${esc(t.name)}</a></td><td>${esc(t.league)}</td><td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${formDots(t.form)}</td><td><strong>${Number(t.global_rating).toFixed(1)}</strong></td></tr>`).join('');
}).catch(()=>{});
