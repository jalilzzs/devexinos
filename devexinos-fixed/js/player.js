/* =====================================================================
   DEVEXINOS / js/player.js
   Player state, keyboard / mouse / touch input, movement, camera, interaction, hiding
   ===================================================================== */
const P={x:-6,z:6.3,yaw:-Math.PI/2,pitch:0,lv:'house',crouch:false,run:false,hidden:false,moving:false,eye:1.6};
const keys={},joy={x:0,y:0};

/* =====================================================================
   INPUT: keyboard, mouse look + pointer lock, touch look, joystick, buttons
   ===================================================================== */
addEventListener('keydown',e=>{
  if(current!==null&&current!=='splash'&&!started)return;
  if(e.code==='Escape'){if(camMode){exitCam()}else if(started&&current&&OVERLAYS.includes(current)){resume()}else if(started&&current===null&&!locked)openPause();return}
  if(e.code==='KeyP'&&started&&!locked&&(current===null||current==='phone')){phoneToggle();return}
  if(!started||paused||locked)return;keys[e.code]=true;
  if(camMode&&e.code==='Space'){shoot();e.preventDefault();return}
  if(e.code==='KeyE')doInteract();if(e.code==='KeyF')toggleFlash();if(e.code==='KeyC')toggleCrouch();
  if(e.code==='KeyI')openOverlay('inv');if(e.code==='KeyL')openOverlay('story');
});
addEventListener('keyup',e=>keys[e.code]=false);
function lookBy(dx,dy){if(locked||paused)return;P.yaw-=dx*.0022*S.sens;P.pitch=clamp(P.pitch-dy*.0022*S.sens,-1.3,1.3)}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===el('c')&&started)lookBy(e.movementX,e.movementY)});
el('c').addEventListener('click',()=>{if(started&&!paused&&!useTouch()){if(camMode&&document.pointerLockElement){shoot();return}el('c').requestPointerLock?.()}});
document.addEventListener('pointerlockchange',()=>{if(started&&!paused&&!locked&&!document.pointerLockElement&&current===null&&!useTouch()){if(camMode)exitCam();else openPause()}});
const looks=new Map();
el('c').addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&started)looks.set(e.pointerId,{x:e.clientX,y:e.clientY})});
addEventListener('pointermove',e=>{const l=looks.get(e.pointerId);if(l){lookBy((e.clientX-l.x)*1.6,(e.clientY-l.y)*1.6);l.x=e.clientX;l.y=e.clientY}});
['pointerup','pointercancel'].forEach(ev=>addEventListener(ev,e=>looks.delete(e.pointerId)));
(function(){const base=el('joy'),knob=base.querySelector('i');let id=null;
  const upd=e=>{const r=base.getBoundingClientRect(),R=r.width/2;let dx=(e.clientX-r.left-R)/R,dy=(e.clientY-r.top-R)/R;const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}joy.x=dx;joy.y=dy;knob.style.transform=`translate(${dx*R*.6}px,${dy*R*.6}px)`};
  base.addEventListener('pointerdown',e=>{if(document.body.classList.contains('editing'))return;id=e.pointerId;base.setPointerCapture(id);upd(e);e.stopPropagation()});
  base.addEventListener('pointermove',e=>{if(e.pointerId===id)upd(e)});
  const end=e=>{if(e.pointerId===id){id=null;joy.x=joy.y=0;knob.style.transform=''}};base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end)})();
const drag={el:null,moved:false,ox:0,oy:0};
const tap=(id,fn)=>el(id).addEventListener('pointerup',()=>{if(document.body.classList.contains('editing')||drag.moved)return;fn()});
function toggleCrouch(){if(P.hidden)return;P.crouch=!P.crouch;el('bCrouch').classList.toggle('lit',P.crouch)}
tap('bFlash',()=>toggleFlash());tap('bInv',()=>openOverlay('inv'));tap('bLog',()=>openOverlay('story'));tap('bAct',()=>doInteract());tap('bMenu',()=>openPause());tap('bPhone',()=>phoneToggle());
tap('bCrouch',toggleCrouch);tap('bRun',()=>{P.run=!P.run;el('bRun').classList.toggle('lit',P.run)});
/* layout editor: drag any HUD button, positions saved in % of the screen */
$$('#hud .ui').forEach(node=>{
  node.addEventListener('pointerdown',e=>{if(!document.body.classList.contains('editing'))return;drag.el=node;drag.moved=false;const r=node.getBoundingClientRect();drag.ox=e.clientX-(r.left+r.width/2);drag.oy=e.clientY-(r.top+r.height/2);node.setPointerCapture(e.pointerId);e.preventDefault();e.stopPropagation()});
  node.addEventListener('pointermove',e=>{if(drag.el!==node)return;drag.moved=true;const w=node.offsetWidth,h=node.offsetHeight;
    const x=clamp(e.clientX-drag.ox-w/2,0,innerWidth-w),y=clamp(e.clientY-drag.oy-h/2,0,innerHeight-h);
    S.pos[node.dataset.id]={x:+(x/innerWidth*100).toFixed(2),y:+(y/innerHeight*100).toFixed(2)};applyUI()});
  const end=()=>{if(drag.el===node){drag.el=null;saveSettings();setTimeout(()=>drag.moved=false,60)}};node.addEventListener('pointerup',end);node.addEventListener('pointercancel',end)});
addEventListener('resize',()=>{if(!renderer)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

/* ---------- per-frame player update: movement, camera, body ---------- */
let stepT=0,bobT=0,aimIn=null;
function updatePlayer(dt){
  let m=0;
  if(!locked&&!P.hidden){
    let fx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.x,fz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+joy.y;
    const len=Math.hypot(fx,fz);m=Math.min(1,len);if(len>.05){fx/=len;fz/=len}
    const run=(keys.ShiftLeft||keys.ShiftRight||P.run)&&!P.crouch,sp=(P.crouch?1.1:run?3.8:2.2)*dt*m,s=Math.sin(P.yaw),c=Math.cos(P.yaw);
    if(m>.05){slide(P,(fx*c+fz*s)*sp,(-fx*s+fz*c)*sp,.25)}
    P.moving=m>.1;P.runNow=run&&P.moving;
    if(P.moving){stepT-=dt;if(stepT<=0){stepT=P.crouch?.75:run?.32:.5;sfx('step',P.crouch?.4:run?1.3:1)}}
  }else P.moving=false;
  const eyeT=P.hidden?1.5:P.crouch?1.0:1.6;P.eye+=(eyeT-P.eye)*Math.min(1,dt*8);
  bobT+=dt*(P.moving?(P.runNow?11:7):0);shake=Math.max(0,shake-dt*.8);
  camera.position.set(P.x+(Math.random()-.5)*shake*.04,P.eye+Math.sin(bobT)*.025*(P.moving?1:0)+(Math.random()-.5)*shake*.04,P.z);
  camera.rotation.set(P.pitch,P.yaw,Math.sin(bobT*.5)*.006*(P.moving?1:0)+(Math.random()-.5)*shake*.01);
  camera.fov+=((camMode?55:P.runNow?76:70)-camera.fov)*.1;camera.updateProjectionMatrix();
  if(bodyG){bodyG.position.set(P.x,0,P.z);bodyG.rotation.y=P.yaw+Math.PI;bodyG.visible=!P.hidden}
}

/* ---------- what is the crosshair pointing at? ---------- */
function updateAim(){
  aimIn=null;
  if(!locked&&!camMode){
    const list=P.hidden?[]:IN.filter(o=>o.lv===P.lv&&o.when()).map(o=>o.hit);
    if(list.length){rcast.setFromCamera({x:0,y:0},camera);const h=rcast.intersectObjects(list,false)[0];
      if(h&&h.distance<2.8&&clearLine(P.x,P.z,P.eye,h.point.x,h.point.z,h.point.y,.4))aimIn=h.object.userData.in}
    if(P.hidden)aimIn={label:()=>t('a_unhide'),act:()=>toggleHide(P.hideIdx)};
  }
  el('cross').classList.toggle('hot',!!aimIn);const hint=el('hint');hint.classList.toggle('on',!!aimIn);
  if(aimIn)hint.textContent=(useTouch()?'':'[E] ')+aimIn.label();
}
function doInteract(){if(locked||paused||camMode)return;if(P.hidden){toggleHide(P.hideIdx);return}if(aimIn)aimIn.act()}

/* ---------- hiding in lockers ---------- */
function toggleHide(i){
  const L=LOCKERS[i];if(!L)return;
  if(!P.hidden){P.hidden=true;P.hideIdx=i;P.x=L.x;P.z=L.z;P.yaw=L.yaw;P.pitch=0;P.crouch=false;say('m_hide',2500);sfx('door');
    if(ent.state==='chase'&&Math.hypot(ent.x-L.x,ent.z-L.z)<2.5){ent.lost=3.5}}
  else{P.hidden=false;P.x=L.ox;P.z=L.oz;sfx('door')}
}

