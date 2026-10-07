const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function parseCSV(text){
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"' && quoted && n==='"'){cell+='"'; i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===',' && !quoted){row.push(cell); cell='';}
    else if((c==='\n'||c==='\r') && !quoted){
      if(c==='\r'&&n==='\n') i++;
      row.push(cell); if(row.some(v=>v.trim())) rows.push(row); row=[]; cell='';
    } else cell+=c;
  }
  row.push(cell); if(row.some(v=>v.trim())) rows.push(row);
  if(rows.length<2) return [];
  const h=rows[0].map(x=>x.trim().toLowerCase());
  const find=(...names)=>names.map(n=>h.indexOf(n)).find(i=>i>=0) ?? -1;
  const ix={date:find('date'),player:find('player'),type:find('badge / type','badge/type','badge','type'),deck:find('deck name','deck'),url:find('decklist url','decklist','deck url')};
  return rows.slice(1).map(r=>({date:r[ix.date]?.trim(),player:r[ix.player]?.trim(),type:r[ix.type]?.trim(),deck:r[ix.deck]?.trim(),deckUrl:r[ix.url]?.trim()})).filter(r=>r.player&&r.type);
}

function parseDate(v){
  if(!v) return null;
  const s=String(v).trim();
  let m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return new Date(Number(m[3]),Number(m[1])-1,Number(m[2]),12);
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);
  const d=new Date(s);
  return isNaN(d)?null:d;
}
function prettyDate(v){
  const d=parseDate(v);
  return d?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase():String(v||'');
}

function render(results,isDemo=false){
  const normalized=results.map((r,i)=>({...r,_i:i,type:TYPES.find(t=>t.toLowerCase()===String(r.type).toLowerCase())||r.type}));
  const dated=normalized.filter(r=>r.date).map(r=>({raw:r.date,d:parseDate(r.date)})).filter(x=>x.d);
  const latest=dated.sort((a,b)=>b.d-a.d)[0];
  const lastUpdated=document.querySelector("#lastUpdated");
  if(lastUpdated) lastUpdated.textContent=latest?`Last updated ${latest.d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`:"";
  const playerMap=new Map();
  normalized.forEach(r=>{
    if(!playerMap.has(r.player)) playerMap.set(r.player,{name:r.player,badges:new Map(),wins:[]});
    const p=playerMap.get(r.player);
    p.wins.push(r);
    if(TYPES.includes(r.type) && !p.badges.has(r.type)) p.badges.set(r.type,r);
  });
  const requiredCount=p=>[...p.badges.keys()].filter(t=>t!=="Fairy").length;
  const players=[...playerMap.values()].sort((a,b)=>requiredCount(b)-requiredCount(a)||a.name.localeCompare(b.name));
  document.querySelector('#badgeRows').innerHTML=players.length?players.map(p=>`<tr><td><button class="player-name" type="button" data-player="${esc(p.name)}">${esc(p.name)}</button></td>${TYPES.map(t=>{const win=p.badges.get(t); const inner=`<span class="badge ${slug(t)} ${win?'earned':''}" title="${esc(t)}">${win?'◆':'◇'}</span>`; return `<td>${win&&win.deckUrl&&win.deckUrl!=='#'?`<a class="badge-link" href="${esc(win.deckUrl)}" target="_blank" rel="noopener">${inner}</a>`:inner}</td>`}).join('')}<td class="total">${requiredCount(p)}/10</td></tr>`).join(''):`<tr><td colspan="13" class="empty">No badge winners yet — Season 1 starts November 14!</td></tr>`;

  const recent=[...normalized].reverse().slice(0,4);
  document.querySelector('#resultCards').innerHTML=recent.length?recent.map(r=>`<article class="result-card"><div class="type-bar ${slug(r.type)}"></div><p class="date">${esc(prettyDate(r.date))}</p><h3>${esc(r.player)}</h3><p><b>${esc(r.type)}</b>${r.deck?` · ${esc(r.deck)}`:''}</p>${r.deckUrl&&r.deckUrl!=='#'?`<a href="${esc(r.deckUrl)}" target="_blank" rel="noopener">VIEW DECKLIST →</a>`:''}</article>`).join(''):`<p class="empty">No results yet.</p>`;

  document.querySelector('#playerRecords').innerHTML=players.length?players.map((p,i)=>`<div class="record"><b>${i+1}</b><span><strong>${esc(p.name)}</strong></span><em>${requiredCount(p)}/10</em></div>`).join(''):`<p class="empty">No badge winners yet.</p>`;

  const champions=players.filter(p=>requiredCount(p)===10).map(p=>{const requiredWins=[...p.badges.values()].filter(w=>w.type!=="Fairy").sort((a,b)=>(parseDate(a.date)?.getTime()||0)-(parseDate(b.date)?.getTime()||0)||a._i-b._i);const completed=requiredWins[requiredWins.length-1];return {...p,requiredWins,completedAt:parseDate(completed?.date)?.getTime()||0,completedIndex:completed?completed._i:0};}).sort((a,b)=>a.completedAt-b.completedAt||a.completedIndex-b.completedIndex);
  const championsSection=document.querySelector('#champions');
  if(championsSection){championsSection.hidden=!champions.length;document.querySelector('#championRecords').innerHTML=champions.map((p,i)=>`<div class="champion-record"><b>${i+1}${i===0?'st':i===1?'nd':i===2?'rd':'th'}</b><strong>${esc(p.name)}</strong><span>${p.requiredWins.map(w=>esc(w.deck||w.type)).join(' → ')}</span></div>`).join('');}

  document.querySelectorAll('.player-name').forEach(btn=>btn.addEventListener('click',()=>{
    const p=playerMap.get(btn.dataset.player);
    if(!p) return;
    const wins=[...p.wins].sort((a,b)=>(parseDate(b.date)?.getTime()||0)-(parseDate(a.date)?.getTime()||0));
    const dialog=document.querySelector('#playerDialog');
    document.querySelector('#playerDialogContent').innerHTML=`<p class="eyebrow gold">TRAINER HISTORY</p><h2 id="playerDialogTitle">${esc(p.name)}</h2><p class="player-summary">${requiredCount(p)} of 10 required badges${p.badges.has('Fairy')?' + Fairy':''}</p><div class="player-wins">${wins.map(w=>`<div class="player-win"><span class="badge ${slug(w.type)} earned">◆</span><div><strong>${esc(w.type)} Badge</strong><small>${esc(prettyDate(w.date))}${w.deck?` · ${esc(w.deck)}`:''}</small></div>${w.deckUrl&&w.deckUrl!=='#'?`<a href="${esc(w.deckUrl)}" target="_blank" rel="noopener">VIEW DECKLIST →</a>`:''}</div>`).join('')}</div>`;
    dialog.showModal();
  }));
  const counts=TYPES.map(type=>({type,count:normalized.filter(r=>r.type===type).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count||TYPES.indexOf(a.type)-TYPES.indexOf(b.type));
  document.querySelector('#typeRecords').innerHTML=counts.length?counts.map((r,i)=>`<div class="record"><b>${i+1}</b><span><strong>${esc(r.type)}</strong></span><em>${r.count}</em></div>`).join(''):`<p class="empty">No winning types yet.</p>`;

}

async function start(){
  if(!SHEET_CSV_URL){render(DEMO_RESULTS,true); return;}
  try{
    const res=await fetch(SHEET_CSV_URL,{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    render(parseCSV(await res.text()),false);
  }catch(e){
    console.error(e); render(DEMO_RESULTS,true);
  }
}
start();


document.querySelectorAll('.collapsible-title').forEach(title=>{const btn=title.querySelector('.collapse-toggle');const content=title.nextElementSibling;if(!btn||!content?.classList.contains('collapsible-content'))return;const toggle=()=>{const open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',String(!open));content.classList.toggle('collapsed',open);};btn.addEventListener('click',e=>{e.stopPropagation();toggle()});title.addEventListener('click',e=>{if(!e.target.closest('button'))toggle()});});

const playerDialog=document.querySelector('#playerDialog');
if(playerDialog){playerDialog.querySelector('.dialog-close').addEventListener('click',()=>playerDialog.close());playerDialog.addEventListener('click',e=>{if(e.target===playerDialog)playerDialog.close()});}
