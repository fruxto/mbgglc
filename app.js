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
  const ix={date:find('date'),player:find('player'),type:find('badge / type','badge/type','badge','type','deck type'),deck:find('deck name','deck'),url:find('decklist url','decklist','deck url'),photo:find('deck photo url','decklist photo url','photo url')};
  return rows.slice(1).map(r=>({date:r[ix.date]?.trim(),player:r[ix.player]?.trim(),type:r[ix.type]?.trim(),deck:r[ix.deck]?.trim(),deckUrl:r[ix.url]?.trim(),photoUrl:r[ix.photo]?.trim()})).filter(r=>r.player&&r.type);
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
function safePhotoUrl(v){if(!v||v==='#')return '';try{const u=new URL(v,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
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
  document.querySelector('#resultCards').innerHTML=recent.length?recent.map(r=>`<article class="result-card"><div class="type-bar ${slug(r.type)}"></div><p class="date">${esc(prettyDate(r.date))}</p>${safePhotoUrl(r.photoUrl)?`<a class="deck-photo-link" href="${esc(safePhotoUrl(r.photoUrl))}" target="_blank" rel="noopener" aria-label="View deck photo for ${esc(r.player)}"><img class="deck-photo" src="${esc(safePhotoUrl(r.photoUrl))}" loading="lazy" alt="${esc(r.player)} winning ${esc(r.type)} deck photo"></a>`:""}<h3>${esc(r.player)}</h3><p><b>${esc(r.type)}</b>${r.deck?` · ${esc(r.deck)}`:''}</p>${safePhotoUrl(r.photoUrl)?`<a class="photo-text-link" href="${esc(safePhotoUrl(r.photoUrl))}" target="_blank" rel="noopener">VIEW DECK PHOTO →</a>`:""}</article>`).join(''):`<p class="empty">No results yet.</p>`;

  document.querySelectorAll('.player-name').forEach(btn=>btn.addEventListener('click',()=>{
    const p=playerMap.get(btn.dataset.player);if(!p)return;
    const wins=[...p.wins].sort((a,b)=>(parseDate(b.date)?.getTime()||0)-(parseDate(a.date)?.getTime()||0)||b._i-a._i);
    document.querySelector('#playerDialogContent').innerHTML=`<p class="eyebrow gold">TRAINER HISTORY</p><h2 id="playerDialogTitle">${esc(p.name)}</h2><p class="player-summary">${requiredCount(p)}/10 required badges</p><div class="player-wins">${wins.map(w=>`<div class="player-win"><span class="badge ${slug(w.type)} earned">◆</span><div><strong>${esc(w.type)} Badge</strong><small>${esc(prettyDate(w.date))}${w.deck?` · ${esc(w.deck)}`:''}</small></div><div class="win-links">${safePhotoUrl(w.photoUrl)?`<a href="${esc(safePhotoUrl(w.photoUrl))}" target="_blank" rel="noopener">DECK PHOTO →</a>`:''}</div></div>`).join('')}</div>`;
    document.querySelector('#playerDialog').showModal();
  }));
  document.querySelector('#playerRecords').innerHTML=players.length?players.map((p,i)=>`<div class="record"><b>${i+1}</b><span><strong>${esc(p.name)}</strong></span><em>${requiredCount(p)}/10</em></div>`).join(''):`<p class="empty">No badge winners yet.</p>`;

  const requiredTypes=TYPES.filter(t=>t!=="Fairy");
  const champions=players.map(p=>{
    const firstWins=new Map();
    [...p.wins].sort((a,b)=>(parseDate(a.date)?.getTime()||0)-(parseDate(b.date)?.getTime()||0)||a._i-b._i).forEach(w=>{
      if(requiredTypes.includes(w.type)&&!firstWins.has(w.type)) firstWins.set(w.type,w);
    });
    if(firstWins.size!==requiredTypes.length) return null;
    const requiredWins=[...firstWins.values()].sort((a,b)=>(parseDate(a.date)?.getTime()||0)-(parseDate(b.date)?.getTime()||0)||a._i-b._i);
    const completed=requiredWins[requiredWins.length-1];
    return {...p,requiredWins,completedAt:parseDate(completed.date)?.getTime()||0,completedIndex:completed._i};
  }).filter(Boolean).sort((a,b)=>a.completedAt-b.completedAt||a.completedIndex-b.completedIndex);
  const championsSection=document.querySelector('#champions');
  if(championsSection){championsSection.hidden=!champions.length;document.querySelector('#championRecords').innerHTML=champions.map((p,i)=>`<div class="champion-record"><b>${i+1}${i===0?'st':i===1?'nd':i===2?'rd':'th'}</b><strong>${esc(p.name)}</strong><span>${p.requiredWins.map(w=>esc(w.type)).join(' → ')}</span></div>`).join('');}
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

function getGLCDates(count=4){
  const seasonStart=new Date(2026,10,14,12), seasonEnd=new Date(2027,11,31,12);
  const today=new Date(); today.setHours(0,0,0,0);
  const from=today>seasonStart?today:seasonStart, dates=[];
  for(let y=from.getFullYear();y<=seasonEnd.getFullYear()&&dates.length<count;y++){
    const firstMonth=y===from.getFullYear()?from.getMonth():0;
    const lastMonth=y===seasonEnd.getFullYear()?seasonEnd.getMonth():11;
    for(let m=firstMonth;m<=lastMonth&&dates.length<count;m++){
      const first=new Date(y,m,1,12);
      const firstSat=1+((6-first.getDay()+7)%7);
      for(const day of [firstSat+7,firstSat+21]){
        const d=new Date(y,m,day,12);
        if(d>=from&&d>=seasonStart&&d<=seasonEnd) dates.push(d);
      }
    }
  }
  return dates;
}
const eventCards=document.querySelector('#eventCards');
if(eventCards){
  const dates=getGLCDates();
  eventCards.innerHTML=dates.length?dates.map((d,i)=>`<article class="event-card"><p class="eyebrow gold">${i===0?'NEXT EVENT':'UPCOMING'}</p><div class="event-date"><strong>${d.toLocaleDateString('en-US',{day:'numeric'})}</strong><span>${d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()}<small>${d.getFullYear()}</small></span></div><p>Saturday · 4:00 PM*</p></article>`).join(''):`<p class="empty">Season 1 has concluded.</p>`;
}


function renderAttendance(rows){
  const host=document.querySelector('#weeklyAttendance');
  const clean=rows.map(r=>({...r,type:String(r.type).toLowerCase()==='electric'?'Lightning':r.type}));
  const weeks=[...new Set(clean.map(r=>r.date))].sort((a,b)=>parseDate(b)-parseDate(a));
  if(!weeks.length){host.innerHTML='<p class="empty">No weekly attendance recorded yet.</p>';return;}
  host.innerHTML='<label for="attendanceWeek">Event date</label> <select id="attendanceWeek">'+weeks.map(d=>'<option value="'+esc(d)+'">'+esc(prettyDate(d))+'</option>').join('')+'</select><div id="weeklyPlayers"></div><div id="popularTypes"></div>';
  const update=()=>{
    const selected=clean.filter(r=>r.date===document.querySelector('#attendanceWeek').value);
    const unique=[...new Map(selected.map(r=>[r.player.toLowerCase(),r])).values()];
    document.querySelector('#weeklyPlayers').innerHTML='<p>'+unique.length+' players</p><div class="record-list">'+unique.map(r=>'<div class="record"><span></span><strong>'+esc(r.player)+'</strong><em>'+esc(r.type)+'</em></div>').join('')+'</div>';
    const counts=[...new Set(unique.map(r=>r.type))].map(type=>({type,count:unique.filter(r=>r.type===type).length})).sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type));
    document.querySelector('#popularTypes').innerHTML='<h3>Most-played deck types</h3>'+counts.map(r=>'<div class="meta-row"><span>'+esc(r.type)+'</span><meter min="0" max="'+unique.length+'" value="'+r.count+'">'+r.count+'</meter><strong>'+r.count+' · '+Math.round(r.count/unique.length*100)+'%</strong></div>').join('');
  };
  document.querySelector('#attendanceWeek').addEventListener('change',update); update();
}
async function loadAttendance(){
  try{
    const response=await fetch(PLAYERS_CSV_URL,{cache:'no-store'});
    if(!response.ok)throw new Error('Attendance unavailable');
    renderAttendance(parseCSV(await response.text()));
  }catch(error){document.querySelector('#weeklyAttendance').innerHTML='<p class="empty">Weekly attendance is temporarily unavailable.</p>';console.error(error);}
}
loadAttendance();
