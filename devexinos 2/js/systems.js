/* =====================================================================
   SYSTEMS: danger meter, heartbeat, ambience, dynamic lights,
   animations and the in-game clock (shown on the phone)
   ===================================================================== */
let danger=.1,boostV=0,boostT=0,shake=0,whT=25,lastLamp=0,pendingApp=false,appT=0;
const boost=(v,s)=>{boostV=v;boostT=s};
function updateAnims(dt){for(let i=ANIMS.length-1;i>=0;i--){const a=ANIMS[i];a.t+=dt*1000;const p=Math.min(a.t/a.d,1);a.fn(p);if(p>=1){ANIMS.splice(i,1);a.done&&a.done()}}}
function updateLights(dt,now){
  lastLamp-=dt;
  if(lastLamp<=0){lastLamp=.25;const spots=SPOTS[P.lv].slice().sort((a,b)=>Math.hypot(a[0]-P.x,a[2]-P.z)-Math.hypot(b[0]-P.x,b[2]-P.z)),n=S.gfx==='high'?3:2;
    lamps.forEach((l,i)=>{const s=spots[i];if(s){l.position.set(s[0],s[1],s[2]);l.userData.tgt=(i<n&&!(P.lv==='base'&&!state.f.power))?1.1:0;l.color.set(P.lv==='base'?0xb8d8c8:0xffc27a)}else l.userData.tgt=0})}
  lamps.forEach(l=>{const tg=(l.userData.tgt||0)*(.85+Math.random()*.15*(1+danger));l.intensity+=(tg-l.intensity)*.15});
  if(W.fireG.visible){fireLight.intensity=1.6+Math.random()*.9;W.fireG.children.forEach(c=>c.scale.y=.8+Math.random()*.6)}
  else if(fireLight.userData.hatch)fireLight.intensity=1.6+Math.sin(now*.004)*.5;else fireLight.intensity=Math.max(0,fireLight.intensity-dt*.5);
}
function updateDanger(dt){
  boostT=Math.max(0,boostT-dt);
  let d=.08;if(P.lv==='base'&&!state.f.power)d=.3;
  if(ent.on&&P.lv==='house'){const dist=Math.hypot(P.x-ent.x,P.z-ent.z);if(ent.state==='chase')d=1;else if(inGallery(P.x,P.z))d=Math.max(d,.25+clamp(1-dist/10,0,1)*.6+ent.aw*.3)}
  if(boostT>0)d=Math.max(d,boostV);danger+=(clamp(d,0,1)-danger)*Math.min(1,dt*3);
  el('vig').style.setProperty('--d',(danger*.75).toFixed(2));el('hideov').classList.toggle('on',P.hidden);
}
function updateAmbience(dt){
  if(P.lv==='house'&&!locked){whT-=dt;if(whT<=0){whT=22+Math.random()*30;sfx('whisper');sub(t('w'+(1+(Math.random()*4|0))),2400)}}
  if(inGallery(P.x,P.z)&&!state.f.seenGallery){state.f.seenGallery=1;say('m_gallery',4500)}
  if(pendingApp&&P.lv==='house'&&Math.abs(P.x)<1.8){appT+=dt;if(appT>1.2){pendingApp=false;appT=0;apparition()}}
}
function updateSystems(dt,now){
  state.clock=(state.clock||0)+dt/8;                       // 8 real seconds = 1 minute on the phone clock
  updateAnims(dt);ENTMIX.forEach(x=>x.update(dt));
  for(const id in ITEMG){const g=ITEMG[id];if(g.visible)g.rotation.y+=dt*.8}
  if(dust)dust.rotation.y+=dt*.01;
  updateLights(dt,now);updateDanger(dt);updateAmbience(dt);
}

/* ---------- heartbeat (audio + visual) ---------- */
let heartT;
function startHeart(){
  clearTimeout(heartT);
  const beat=()=>{
    if(!started)return;
    if(!paused&&!locked){const hv=el('heart');hv.style.transform='scale(1.45)';hv.style.opacity=.5+danger*.5;hv.style.filter=`drop-shadow(0 0 ${4+danger*10}px #c0394d)`;setTimeout(()=>hv.style.transform='scale(1)',130);
      if(custom.buf.sfx_heartbeat)sfx('heartbeat');else{SFX.thump(.1+danger*.5);setTimeout(()=>SFX.thump(.07+danger*.35),170)}}
    heartT=setTimeout(beat,60000/(55+danger*95));
  };beat();
}

