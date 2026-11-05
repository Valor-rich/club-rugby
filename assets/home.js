const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = s => String(s||'XV').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const badge = t => `<span class="badge">${t.logo ? `<img src="${esc(t.logo)}" alt="${esc(t.name)} badge" onerror="this.remove();this.parentElement.textContent='${initials(t.name)}'">` : initials(t.name)}</span>`;
const profile = t => `clubs/${encodeURIComponent(t.slug)}.html`;

fetch('data/teams.json').then(r=>r.json()).then(teams=>{
 const body=document.getElementById('homeRankingRows');if(!body)return;
 body.innerHTML=[...teams].sort((a,b)=>a.rank-b.rank).slice(0,10).map(t=>`<tr><td class="rank">${String(t.rank).padStart(2,'0')}</td><td><a class="teamcell" href="${profile(t)}">${badge(t)}${esc(t.name)}</a></td><td>${esc(t.league)}</td><td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td>${esc(t.form||'')}</td><td><strong>${Number(t.global_rating).toFixed(1)}</strong></td></tr>`).join('');
}).catch(()=>{});
