/* =====================================================================
   MAIN: game loop, start / continue, menu wiring, boot
   Script load order (see index.html):
   i18n > persistence > audio > ui > world > weapons > player > npc >
   missions > cutscenes > phone > systems > main
   ===================================================================== */
let last=0,frames=0,fpsT=0;
function loop(now){
  requestAnimationFrame(loop);
  if(!running||paused||!renderer)return;
  const cap=S.fps;if(cap>0&&now-last<1000/cap-1.5)return;
  const dt=Math.min((now-last)/1000,.1);last=now;
  updatePlayer(dt);updateFlashlight(dt);updEntity(dt,now);updateSystems(dt,now);updateAim();
  renderer.render(scene,camera);
  frames++;if(now-fpsT>500){el('fps').textContent=Math.round(frames*1000/(now-fpsT))+' FPS';frames=0;fpsT=now}
}
requestAnimationFrame(loop);

async function startGame(fresh){
  initAudio();if(!hasThree){toast('Three.js failed to load (internet needed for the CDN)');return}
  initScene();
  if(!useTouch())el('c').requestPointerLock?.();
  state=fresh?newState():JSON.parse(JSON.stringify(SAVE));state.br=state.br||[0,0,0,0];state.read=state.read||{};
  Object.assign(P,{lv:'house',x:-6,z:6.3,yaw:-Math.PI/2,pitch:0,crouch:false,run:false,hidden:false,moving:false,eye:1.6});
  if(!fresh&&state.pos)Object.assign(P,{lv:state.pos.lv,x:state.pos.x,z:state.pos.z,yaw:state.pos.yaw});
  Object.assign(ent,{x:2.9,z:-4.8,state:'patrol',aw:0,path:[],wp:0,lost:0,wait:0,on:!state.f.burned});
  flashOn=true;exitCam();['bFlash'].forEach(i=>el(i).classList.add('lit'));el('bCrouch').classList.remove('lit');el('bRun').classList.remove('lit');
  noSave=false;ANIMS.length=0;locked=false;paused=false;started=true;running=true;
  phoneLoad(fresh);setEnv(P.lv);refreshWorld();show(null);el('hud').classList.add('on');renderInv();renderLog();startHeart();phoneCheckNew();
  if(fresh)await introCutscene();else say('saved',1800);
}

/* ---------- menu wiring ---------- */
/* ---------- menu wiring ---------- */
el('splash').addEventListener('pointerdown',()=>{initAudio();refreshBgm();sfx('click');show('menu');initScene();loadStoredAssets()},{once:true});
el('mStart').onclick=()=>startGame(true);
el('mCont').onclick=()=>{if(SAVE)startGame(false)};
el('mLogin').onclick=()=>show('loginBox');
el('mSet').onclick=()=>{syncControls();show('settings')};
el('mStory').onclick=()=>{renderLog();show('story')};
el('mTos').onclick=()=>show('tos');el('mSup').onclick=()=>show('support');
$$('[data-close]').forEach(b=>b.onclick=()=>{if(started&&['story','inv','doc','keypad','fuse'].includes(current))resume();else show(started?'pause':'menu')});
el('sBack').onclick=()=>show(started?'pause':'menu');
el('sTest').onclick=()=>{initAudio();SFX.thump(.6);setTimeout(()=>tone(440,.15,'triangle',.2),250)};
el('sResetSave').onclick=()=>{store.del(SAVE_KEY);SAVE=null;refreshContinue();toast(t('resetDone'))};
el('sClearAssets').onclick=async()=>{await idbClear();toast(t('resetDone'));setTimeout(()=>location.reload(),700)};
el('assetPick').addEventListener('change',e=>ingestFiles(e.target.files));
el('lgIn').onclick=()=>{ACCT='test.player@gmail.com';store.set('dvx_acct',ACCT);refreshAcct();toast(t('signed')+' '+ACCT);show('menu')};
el('lgOut').onclick=()=>{ACCT=null;store.del('dvx_acct');refreshAcct();show('menu')};
el('pResume').onclick=resume;el('pSet').onclick=()=>{syncControls();show('settings')};el('pQuit').onclick=quitToMenu;
el('docOk').onclick=resume;el('endBtn').onclick=()=>{quitToMenu()};
el('sEdit').onclick=()=>{show(null);document.body.classList.add('editing');el('hud').classList.add('on');el('hud').style.pointerEvents='auto';applyUI()};
el('edDone').onclick=()=>{document.body.classList.remove('editing');el('hud').style.pointerEvents='';if(!started)el('hud').classList.remove('on');show('settings')};
el('edReset').onclick=()=>{S.pos={};saveSettings();applyUI()};
['1','2','3','4','5','6','7','8','9','C','0','OK'].forEach(k=>{const b=document.createElement('button');b.className='kp';b.textContent=k;b.onclick=()=>kpPress(k);el('kpPad').appendChild(b)});
setInterval(()=>saveGame(),20000);

/* ---------- boot ---------- */
syncControls();applyAll();refreshContinue();
document.body.addEventListener('contextmenu',e=>e.preventDefault());
if(!hasThree)console.warn('Three.js CDN not reachable: menus work, the 3D world needs internet.');
