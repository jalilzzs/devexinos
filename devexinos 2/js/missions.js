/* =====================================================================
   DEVEXINOS / js/missions.js
   Items, journals, the four puzzles (safe, keys, fuse box, altar), doll fusing and the burning ritual
   ===================================================================== */
/* ---------- items, logs, documents ---------- */
function addLog(id){if(!state.logs.includes(id)){state.logs.push(id);toast('📖 '+t('story'));renderLog()}}
function take(id){
  if(state.taken[id])return;state.taken[id]=1;if(!DOCS.includes(id))state.inv.push(id);sfx('pickup');
  const L={passport:'passport',id_card:'id_card',music_box:'music',head:'head',arms:'arms',torso:'torso',legs:'legs'};if(L[id])addLog(L[id]);
  if(id==='passport')say('m_pass');else if(id==='id_card')say('m_id');
  else if(DOCS.includes(id)){addLog(id);openDoc(id,id==='j1'?shiftStudy:null)}
  else if(PARTS.includes(id)){say('m_part');boost(.9,3);sfx('thump',.7);if(id==='head')setTimeout(hallShut,2600);if(id==='arms'||id==='legs'||id==='torso')pendingApp=true}
  else{sub(t('i_'+id),2500);if(id==='key2')pendingApp=true}
  refreshWorld();saveGame();
}
function openDoc(id,after){docAfter=after||null;el('docTitle').textContent=t('i_'+id);el('docText').textContent=t('x_'+id);openOverlay('doc')}
function shiftStudy(){if(state.f.shifted)return;state.f.shifted=1;sfx('grind');say('m_shift',4500);const z0=-2;
  anim(2400,p=>{W.shiftWall.position.z=z0+2.1*ease(p)},()=>{W.shiftCol.on=false});saveGame()}
function hallShut(){if(state.f.hallShut)return;state.f.hallShut=1;sfx('door');say('m_hallshut',4500);
  anim(600,p=>{W.hallWall.position.y=5-3.4*p},()=>{W.hallCol.on=true;shake=1});saveGame()}

/* ---------- puzzle 1: coded safe (head) ---------- */
function renderKp(){el('kpDisp').textContent=kp.padEnd(4,'_').split('').join(' ')}
function openKeypad(){kp='';renderKp();el('kpTitle').textContent=t('m_safe_title');el('kpHint').textContent=t('m_safe_hint');openOverlay('keypad')}
function kpPress(k){
  if(k==='C'){kp='';sfx('beep',400)}
  else if(k==='OK'){
    if(kp==='2807'){state.f.safe=1;sfx('door');resume();anim(1200,p=>{W.safeDoor.rotation.y=-1.9*ease(p)});say('m_safe_ok');refreshWorld();saveGame();return}
    sfx('buzz');el('kpHint').textContent=t('m_code_bad');kp='';
  }else if(kp.length<4){kp+=k;sfx('beep',600+kp.length*80)}
  renderKp();
}

/* ---------- puzzle 2: rusted keys (arms) ---------- */
function storeAct(){
  if(state.inv.includes('key1')&&state.inv.includes('key2')){
    state.inv=state.inv.filter(i=>i!=='key1'&&i!=='key2');state.f.store=1;sfx('door');say('m_keys_ok');
    anim(1600,p=>{W.storeDoor.position.x=-7.7-1.0*ease(p)},()=>{W.storeCol.on=false});refreshWorld();saveGame();
  }else{say('m_keys_need');sfx('buzz')}
}

/* ---------- puzzle 3: fuse box in the dark basement (torso) ---------- */
function ledSync(){if(!W.fuseLeds)return;W.fuseLeds.forEach((l,i)=>l.material.color.set(state.f.power?0x33ff66:(state.br[i]?0xffaa22:0x330000)))}
function renderFuse(){
  const f=state.f,b=el('fuseBody');b.innerHTML='';
  const n=f.fuses||0,row=document.createElement('div');row.className='row';
  const lab=document.createElement('label');lab.textContent='🔌 '+[0,1].map(i=>i<n?'◆':'◇').join(' ');row.appendChild(lab);
  const have=state.inv.filter(i=>i==='fuse1'||i==='fuse2');
  if(n<2){const bt=document.createElement('button');bt.className='rbtn';bt.textContent=t('i_fuse1')+' ('+have.length+')';
    bt.onclick=()=>{if(!have.length){say('m_fuse_need');el('fuseHint').textContent=t('m_fuse_need');sfx('buzz');return}
      state.inv=state.inv.filter(i=>i!=='fuse1'&&i!=='fuse2');f.fuses=n+have.length;sfx('spark');if(f.fuses>=2)el('fuseHint').textContent=t('m_fuse_in');else el('fuseHint').textContent=t('m_fuse_need');saveGame();renderFuse()};row.appendChild(bt)}
  b.appendChild(row);
  const sw=document.createElement('div');sw.className='switches';
  state.br.forEach((v,i)=>{const s=document.createElement('button');s.className='sw'+(v?' up':'');s.textContent=v?'▲':'▼';s.disabled=(f.fuses||0)<2||!!f.power;
    s.onclick=()=>{state.br[i]=v?0:1;sfx('click');ledSync();renderFuse()};sw.appendChild(s)});b.appendChild(sw);
  const go=document.createElement('button');go.className='rbtn main';go.textContent=t('m_restore');go.disabled=(f.fuses||0)<2||!!f.power;go.onclick=restorePower;b.appendChild(go);
}
function openFuse(){el('fuseTitle').textContent=t('m_panel_title');el('fuseHint').textContent=(state.f.fuses||0)<2?t('m_fuse_need'):t('m_panel_hint');renderFuse();openOverlay('fuse')}
function restorePower(){
  if(state.br.join('')==='1010'){ // odd breakers up, even breakers down
    state.f.power=1;state.f.torsoDoor=1;ledSync();sfx('hum');resume();say('m_power_on',4500);setEnv('base');
    setTimeout(()=>{sfx('grind');anim(3500,p=>{W.torsoDoor.position.y=1.3+2.8*ease(p)},()=>{W.torsoCol.on=false;say('m_torso',3000)})},1800);refreshWorld();saveGame();
  }else{sfx('spark');sfx('buzz');el('fuseHint').textContent=t('m_power_bad');shake=.8;boost(.7,2)}
}

/* ---------- puzzle 4: altar + wedding music box (legs) ---------- */
function altarAct(){
  if(!state.inv.includes('music_box')){say('m_altar_need');return}
  state.inv=state.inv.filter(i=>i!=='music_box');state.f.altar=1;locked=true;sfx('musicbox');say('m_altar_ok',5000);
  setTimeout(()=>{sfx('grind');anim(3000,p=>{W.slab.position.x=2.0*ease(p)},()=>{locked=false;refreshWorld();saveGame()})},4800);
}

/* ---------- fusing the doll + burning ritual (basement) ---------- */
function tableAct(){
  if(!state.f.doll){
    if(!PARTS.every(p=>state.inv.includes(p))){say('m_parts_need');return}
    fuseDoll();
  }else if(!state.f.burned)burnRitual();
}
async function fuseDoll(){
  locked=true;state.inv=state.inv.filter(i=>!PARTS.includes(i));state.f.doll=1;W.doll.visible=true;sfx('hum');boost(.8,5);
  anim(3000,p=>{W.doll.position.y=.92+.35*ease(p);W.doll.rotation.y=p*6},null);
  await wait(3200);addLog('doll');say('m_fused',4500);await wait(4500);locked=false;refreshWorld();saveGame();
}
async function burnRitual(){
  locked=true;say('m_burn1',3000);sfx('fire');W.fireG.visible=true;fireLight.color.set(0xff7a22);fireLight.position.set(58,1.6,-3);boost(.8,12);
  await wait(3200);shake=1.5;sfx('growl');say('m_burn2',4500);
  anim(5000,p=>{shake=1.2*(1-p);W.doll.scale.setScalar(2.2*(1-p))});await wait(5200);sfx('scare');
  W.doll.visible=false;ent.on=false;state.f.burned=1;addLog('burn');await wait(1200);say('m_after',5000);
  anim(4000,p=>{fireLight.userData.k=1-p*.6},null);locked=false;refreshWorld();saveGame();
}

/* ---------- objective shown in the phone's Notes app ---------- */
let docAfter=null,kp='';
function currentGoal(){
  const f=state.f,tk=state.taken;
  if(f.burned)return 'o_leave';if(f.doll)return 'o_burn';
  if(PARTS.every(p=>tk[p]))return 'o_table';
  if(!f.shifted&&!tk.head)return 'o_start';
  for(const p of PARTS)if(!tk[p])return 'o_'+p;
  return 'o_start';
}
