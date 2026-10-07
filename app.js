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

function prettyDate(v){
  if(!v) return '';
  const d=new Date(v+'T12:00:00');
  return isNaN(d)?v:d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}).toUpperCase();
}

function render(results,isDemo=false){
  const normalized=results.map((r,i)=>({...r,_i:i,type:TYPES.find(t=>t.toLowerCase()===String(r.type).toLowerCase())||r.type}));
  const playerMap=new Map();
  normalized.forEach(r=>{
    if(!playerMap.has(r.player)) playerMap.set(r.player,{name:r.player,badges:new Map()});
    const p=playerMap.get(r.player);
    if(TYPES.includes(r.type) && !p.badges.has(r.type)) p.badges.set(r.type,r);
  });
  const requiredCount=p=>[...p.badges.keys()].filter(t=>t!=="Fairy").length;
  const players=[...playerMap.values()].sort((a,b)=>requiredCount(b)-requiredCount(a)||a.name.localeCompare(b.name));
  document.querySelector('#badgeRows').innerHTML=players.length?players.map(p=>`<tr><td><strong>${esc(p.name)}</strong><small>${requiredCount(p)} of 10 required badges${p.badges.has("Fairy")?" + Fairy":""}</small></td>${TYPES.map(t=>{const win=p.badges.get(t); const inner=`<span class="badge ${slug(t)} ${win?'earned':''}" title="${esc(t)}">${win?'◆':'◇'}</span>`; return `<td>${win&&win.deckUrl&&win.deckUrl!=='#'?`<a class="badge-link" href="${esc(win.deckUrl)}" target="_blank" rel="noopener">${inner}</a>`:inner}</td>`}).join('')}<td class="total">${requiredCount(p)}/10</td></tr>`).join(''):`<tr><td colspan="13" class="empty">No badge winners yet — Season 1 starts November 14!</td></tr>`;

  const recent=[...normalized].reverse().slice(0,8);
  document.querySelector('#resultCards').innerHTML=recent.length?recent.map(r=>`<article class="result-card"><div class="type-bar ${slug(r.type)}"></div><p class="date">${esc(prettyDate(r.date))}</p><h3>${esc(r.player)}</h3><p><b>${esc(r.type)}</b>${r.deck?` · ${esc(r.deck)}`:''}</p>${r.deckUrl&&r.deckUrl!=='#'?`<a href="${esc(r.deckUrl)}" target="_blank" rel="noopener">VIEW DECKLIST →</a>`:''}</article>`).join(''):`<p class="empty">No results yet.</p>`;

  document.querySelector('#playerRecords').innerHTML=players.length?players.map((p,i)=>`<div class="record"><b>${i+1}</b><span><strong>${esc(p.name)}</strong><small>${requiredCount(p)===10?'GLC COMPLETE!':`${10-requiredCount(p)} badges remaining`}</small></span><em>${requiredCount(p)}/10</em></div>`).join(''):`<p class="empty">No badge winners yet.</p>`;

  const counts=TYPES.map(type=>({type,count:normalized.filter(r=>r.type===type).length})).filter(x=>x.count).sort((a,b)=>b.count-a.count||TYPES.indexOf(a.type)-TYPES.indexOf(b.type));
  document.querySelector('#typeRecords').innerHTML=counts.length?counts.map((r,i)=>`<div class="record"><b>${i+1}</b><span><strong>${esc(r.type)}</strong><small>winning deck${r.count===1?'':'s'}</small></span><em>${r.count}</em></div>`).join(''):`<p class="empty">No winning types yet.</p>`;

  const note=document.querySelector('#dataStatus');
  note.textContent=isDemo?'Preview data — connect the Google Sheet to go live.':'Live from the MBG GLC results sheet.';
}

async function start(){
  if(!SHEET_CSV_URL){render(DEMO_RESULTS,true); return;}
  try{
    const res=await fetch(SHEET_CSV_URL,{cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    render(parseCSV(await res.text()),false);
  }catch(e){
    console.error(e); render(DEMO_RESULTS,true);
    document.querySelector('#dataStatus').textContent='Could not load the live sheet — showing preview data.';
  }
}
start();
