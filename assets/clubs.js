const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = s => String(s||'XV').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const badge = t => `<span class="badge">${t.logo ? `<img src="${esc(t.logo)}" alt="${esc(t.name)} badge" onerror="this.remove();this.parentElement.textContent='${initials(t.name)}'">` : initials(t.name)}</span>`;
const profile = t => `clubs/${encodeURIComponent(t.slug)}.html`;

fetch('data/teams.json').then(r=>r.json()).then(teams=>{
 const grid=document.getElementById('clubGrid'),search=document.getElementById('clubSearch');
 function draw(){const q=search.value.toLowerCase();const a=teams.filter(t=>[t.name,t.city,t.country,t.league].join(' ').toLowerCase().includes(q)).sort((x,y)=>x.name.localeCompare(y.name));
 grid.innerHTML=a.map(t=>`<a class="card" href="${profile(t)}"><div style="display:flex;align-items:center;gap:12px">${badge(t)}<div><h3>${esc(t.name)}</h3><p>${esc(t.city)}, ${esc(t.country)}</p></div></div><p style="margin-top:12px">${esc(t.league)}</p><div class="eyebrow" style="margin-top:10px">#${t.rank} · ${Number(t.global_rating).toFixed(1)} Elo</div></a>`).join('');
 }
 search.addEventListener('input',draw);draw();
}).catch(()=>{document.getElementById('clubGrid').innerHTML='<p class="empty">Club data could not be loaded.</p>'});
