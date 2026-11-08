const esc = s => XVN.escape(s);
const initials = s => String(s||'XV').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const badge = t => `<span class="badge">${t.logo ? `<img src="${esc(t.logo)}" alt="${esc(t.name)} badge" onerror="this.remove();this.parentElement.textContent='${initials(t.name)}'">` : initials(t.name)}</span>`;
const profile = t => `clubs/${encodeURIComponent(t.slug)}.html`;
const formDots = value => `<span class="form" role="img" aria-label="Recent form: ${esc(value || 'not available')}">${[...(value || '')].map(v=>`<i class="${v}" title="${v==='W'?'Win':v==='L'?'Loss':'Draw'}"></i>`).join('')}</span>`;
XVN.load('').then(({teams})=>{
 const $=id=>document.getElementById(id), league=$('league');
 [...new Set(teams.map(t=>t.league).filter(Boolean))].sort().forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;league.append(o)});
 function draw(){let q=$('q').value.toLowerCase(),c=$('country').value,l=league.value,s=$('sort').value;
 let a=teams.filter(t=>(!q||[t.name,t.city,t.state,t.country,t.league,t.conference_name].join(' ').toLowerCase().includes(q))&&(!c||t.country===c)&&(!l||t.league===l));
 a.sort((x,y)=>s==='rating'?y.global_rating-x.global_rating:s==='wins'?y.won-x.won:s==='played'?y.played-x.played:x.rank-y.rank);
 $('rankingRows').innerHTML=a.map(t=>`<tr><td class="rank">${t.rank}</td><td><a class="teamcell" href="${profile(t)}">${badge(t)}${esc(t.name)}</a></td><td>${esc(t.league)}</td><td>${esc([t.city,t.state].filter(Boolean).join(', '))}</td><td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${formDots(t.form)}</td><td><strong>${Number(t.global_rating).toFixed(1)}</strong></td></tr>`).join('');
 $('count').textContent=`Showing ${a.length} of ${teams.length} ranked clubs.`;}
 ['q','country','league','sort'].forEach(id=>$(id).addEventListener('input',draw));draw();
}).catch(e=>{document.getElementById('count').textContent=e.message});