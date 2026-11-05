// XV Nation club directory: rankings remain sourced from data/teams.json;
// editable club details (especially team_name) are overlaid from teams_meta.csv.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = s => String(s||'XV').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
function parseCSV(text){
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(cell);cell='';}
    else if(c==='\n'){row.push(cell);rows.push(row);row=[];cell='';}
    else if(c!=='\r')cell+=c;
  }
  if(cell.length||row.length){row.push(cell);rows.push(row);}
  const [headers,...body]=rows;
  return body.filter(r=>r.length).map(r=>Object.fromEntries(headers.map((h,i)=>[String(h||'').trim(),String(r[i]||'').trim()])));
}
function assetUrl(path){const p=String(path||'').trim();if(!p)return '';return p.replace(/^\.\//,'').replace(/^\//,'');}
const badge = t => `<span class="badge">${t.logo ? `<img src="${esc(assetUrl(t.logo))}" alt="${esc(t.name)} badge" onerror="this.remove();this.parentElement.textContent='${esc(initials(t.name))}'">` : esc(initials(t.name))}</span>`;
const profile = t => `clubs/${encodeURIComponent(t.slug)}.html`;

Promise.all([
  fetch('data/teams.json').then(r=>{if(!r.ok)throw new Error('Could not load data/teams.json');return r.json();}),
  fetch('teams_meta.csv').then(r=>{if(!r.ok)throw new Error('Could not load teams_meta.csv');return r.text();})
]).then(([teams,csv])=>{
  const metadata=new Map(parseCSV(csv).map(m=>[m.team_id,m]));
  const merged=teams.map(t=>{
    const m=metadata.get(t.team_id)||{};
    return {...t,
      name:m.team_name||t.name,
      league:m.league_id||t.league,
      logo:m.logo||t.logo,
      city:m.city||t.city,
      country:m.country||t.country,
      stadium:m.stadium||t.stadium
    };
  });
  const grid=document.getElementById('clubGrid'),search=document.getElementById('clubSearch');
  function draw(){
    const q=search.value.trim().toLowerCase();
    const a=merged.filter(t=>[t.name,t.city,t.country,t.league].join(' ').toLowerCase().includes(q)).sort((x,y)=>x.name.localeCompare(y.name));
    grid.innerHTML=a.map(t=>`<a class="card" href="${profile(t)}"><div style="display:flex;align-items:center;gap:12px">${badge(t)}<div><h3>${esc(t.name)}</h3><p>${esc(t.city)}, ${esc(t.country)}</p></div></div><p style="margin-top:12px">${esc(t.league)}</p><div class="eyebrow" style="margin-top:10px">#${t.rank} · ${Number(t.global_rating).toFixed(1)} Elo</div></a>`).join('');
  }
  search.addEventListener('input',draw);draw();
}).catch(err=>{
  console.error('XV Nation directory:',err);
  document.getElementById('clubGrid').innerHTML='<p class="empty">Club directory could not load. Check that teams_meta.csv and data/teams.json are published at the website root.</p>';
});
