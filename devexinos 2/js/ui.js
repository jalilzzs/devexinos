/* =====================================================================
   DEVEXINOS / js/ui.js
   Screens, subtitles, toast, fades, log/inventory rendering, settings binding
   ===================================================================== */
let current='splash',started=false,paused=false,locked=false,running=false;
const OVERLAYS=['story','inv','doc','keypad','fuse','phone','pause'];
/* ---------- screens / toast / subtitles ---------- */
function show(id){$$('.screen').forEach(s=>s.classList.remove('on'));if(id)el(id).classList.add('on');current=id}
function toast(msg){const e=el('toast');e.textContent=msg;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
let subTimer;
function sub(text,ms=4200){const s=el('sub');s.textContent=text;s.classList.add('on');clearTimeout(subTimer);subTimer=setTimeout(()=>s.classList.remove('on'),ms)}
const say=(k,ms)=>sub(t(k),ms);
function fade(to,ms=800,blur=false){const f=el('fade');f.style.transition='opacity '+ms+'ms ease';f.style.opacity=to;f.classList.toggle('blur',blur);return wait(ms)}

/* ---------- log / inventory rendering ---------- */
const ICON={passport:'🛂',id_card:'🪪',key1:'🗝️',key2:'🗝️',fuse1:'🔌',fuse2:'🔌',music_box:'🎵',head:'🧸',arms:'🧸',torso:'🧸',legs:'🧸'};
const PARTS=['head','arms','torso','legs'];
function renderLog(){
  const box=el('logList');box.innerHTML='';const src=started?state:(SAVE||newState());
  if(!src.logs.length){box.innerHTML='<p class="empty">'+t('logEmpty')+'</p>';return}
  src.logs.forEach(id=>{
    const d=document.createElement('div');d.className='log-entry';
    const isDoc=!!T.en['x_'+id];const b=document.createElement('b');b.textContent=isDoc?t('i_'+id):'Fred';
    const p=document.createElement('p');p.textContent=isDoc?t('x_'+id):t('l_'+id);d.append(b,p);box.appendChild(d)});
}
function renderInv(){
  const box=el('invList');box.innerHTML='';
  const n=PARTS.filter(p=>state.taken[p]).length;
  const hd=document.createElement('p');hd.className='parts';hd.textContent=t('parts')+': '+PARTS.map(p=>state.taken[p]?'◆':'◇').join(' ')+'  '+n+'/4';box.appendChild(hd);
  if(!state.inv.length){const p=document.createElement('p');p.className='empty';p.textContent=t('invEmpty');box.appendChild(p);return}
  state.inv.forEach(id=>{const p=document.createElement('p');p.textContent=(ICON[id]||'•')+'  '+t('i_'+id);box.appendChild(p)});
}
function refreshContinue(){el('mCont').disabled=!SAVE}
function refreshAcct(){el('acct').textContent=ACCT?t('signed')+' '+ACCT:''}
function renderAssetList(){const b=el('assetList');if(!b)return;b.textContent=Assets.names.length?Assets.names.join(', '):'—'}

/* ---------- settings -> UI ---------- */
function applyLang(){
  const L=S.lang;document.documentElement.lang=L;document.body.dir=(L==='ar')?'rtl':'ltr';
  $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  el('keys').textContent=t('keysPC');el('sub').dir=(L==='ar')?'rtl':'ltr';
  refreshAcct();renderLog();renderInv();renderAssetList();
}
function applyUI(){
  document.body.classList.toggle('touch',useTouch());
  $$('#hud .ui').forEach(n=>{const p=S.pos[n.dataset.id];
    if(p){n.style.left=p.x+'%';n.style.top=p.y+'%';n.style.right='auto';n.style.bottom='auto'}else{['left','top','right','bottom'].forEach(k=>n.style[k]='')}
    n.style.transform='scale('+S.size+')'});
}
function applyGfx(){
  if(!renderer)return;
  renderer.setPixelRatio(S.gfx==='high'?Math.min(devicePixelRatio||1,2):1);
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.shadowMap.enabled=S.shadows;
  if(flash){flash.castShadow=S.shadows;const m=S.gfx==='high'?1024:512;flash.shadow.mapSize.set(m,m);if(flash.shadow.map){flash.shadow.map.dispose();flash.shadow.map=null}}
  if(scene)scene.traverse(o=>{if(o.material)o.material.needsUpdate=true});
}
function applyVol(){if(!AC)return;master.gain.value=S.master;sfxG.gain.value=S.sfx;bgmG.gain.value=S.bgm*.5}
function applyAll(){applyLang();applyUI();applyGfx();applyVol()}
$$('[data-k]').forEach(inp=>{const k=inp.dataset.k;
  inp.addEventListener('input',()=>{let v=inp.type==='checkbox'?inp.checked:inp.value;if(inp.type==='range'||inp.dataset.num)v=parseFloat(v);
    S[k]=v;saveSettings();
    if(k==='lang')applyLang();if(k==='size'||k==='forceTouch')applyUI();if(k==='gfx'||k==='shadows')applyGfx();if(['master','sfx','bgm'].includes(k))applyVol()})});
function syncControls(){$$('[data-k]').forEach(i=>{const v=S[i.dataset.k];if(i.type==='checkbox')i.checked=!!v;else i.value=v})}


/* ---------- overlays (inventory, story, phone, pause...) ---------- */
function openOverlay(id){if(!started||locked)return;if(camMode)exitCam();paused=true;document.exitPointerLock?.();if(id==='inv')renderInv();if(id==='story')renderLog();show(id)}
function openPause(){if(!started||paused||locked)return;openOverlay('pause')}
function resume(){paused=false;show(null);el('hud').classList.add('on');
  if(docAfter){const f=docAfter;docAfter=null;setTimeout(f,350)}
  if(!useTouch()&&!locked)el('c').requestPointerLock?.()}
function quitToMenu(){saveGame();started=false;paused=false;locked=false;running=false;noSave=false;exitCam();document.exitPointerLock?.();el('hud').classList.remove('on');
  ['sun','ring'].forEach(i=>el(i).style.opacity=0);el('fade').style.opacity=0;show('menu');refreshContinue()}
