
fetch('data/teams.json').then(r=>r.json()).then(teams=>{
const $=id=>document.getElementById(id), league=$('league');
[...new Set(teams.map(t=>t.league))].sort().forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;league.append(o)});
function draw(){let q=$('q').value.toLowerCase(),c=$('country').value,l=league.value,s=$('sort').value;
let a=teams.filter(t=>(!q||[t.name,t.city,t.country,t.league].join(' ').toLowerCase().includes(q))&&(!c||t.country===c)&&(!l||t.league===l));
a.sort((x,y)=>s==='rating'?y.global_rating-x.global_rating:s==='wins'?y.won-x.won:s==='played'?y.played-x.played:x.rank-y.rank);
$('rankingRows').innerHTML=a.map(t=>`<tr><td class="rank">${t.rank}</td><td><a class="teamcell" href="clubs/${t.slug}.html"><span class="badge">${t.logo?`<img src="${t.logo}" alt="">`:t.name.slice(0,2).toUpperCase()}</span>${t.name}</a></td><td>${t.league}</td><td>${t.city}</td><td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td><td><span class="form">${t.form.slice(-5).split('').map(x=>`<i class="${x}"></i>`).join('')}</span></td><td><strong>${t.global_rating.toFixed(1)}</strong></td></tr>`).join('');
$('count').textContent=`Showing ${a.length} of ${teams.length} clubs`;
}
['q','country','league','sort'].forEach(id=>$(id).addEventListener(id==='q'?'input':'change',draw));draw();
});
