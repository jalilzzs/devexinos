/* =====================================================================
   DEVEXINOS / js/cutscenes.js
   Level transitions, opening wake-up, and the ending (front door, Amira, the descent)
   ===================================================================== */
/* ---------- level transitions ---------- */
async function goLevel(lv,x,z,yaw){
  locked=true;await fade(1,450);P.lv=lv;P.x=x;P.z=z;P.yaw=yaw;P.pitch=0;setEnv(lv);sfx('door');
  if(lv==='base'&&!state.f.power)say('m_dark',4500);
  await wait(250);await fade(0,600);locked=false;saveGame();
}
/* ---------- ending: front door -> ring -> Amira's voice -> the descent ---------- */
async function frontDoorAct(){
  if(!state.f.burned){say('m_door_lock');sfx('whisper');return}
  locked=true;noSave=true;document.exitPointerLock?.();P.yaw=0;P.pitch=.05;sfx('door');W.sun.visible=true;W.frontCol.on=false;
  anim(2600,p=>{W.frontDoor.position.x=-1.9*ease(p)});el('sun').style.opacity=.85;
  say('e1',4200);await wait(4400);
  el('ring').style.opacity=1;sfx('hum');say('e2',3600);await wait(3800);
  sfx('amira');boost(.9,9);say('e3',4600);await wait(4800);
  say('e4',3300);const y0=P.yaw;anim(2800,p=>{P.yaw=y0+Math.PI*ease(p)});el('sun').style.opacity=0;await wait(2000);await fade(1,1200);
  // down into the basement, to the hatch under the rug
  P.lv='base';P.x=60;P.z=3.3;P.yaw=Math.PI;P.pitch=-.5;setEnv('base');W.sun.visible=false;W.rug.visible=false;W.hatch.visible=true;
  fireLight.color.set(0x4a7aff);fireLight.position.set(60,.6,5.5);fireLight.userData.k=1;fireLight.userData.hatch=1;el('ring').style.opacity=0;
  await fade(0,1600);say('e5',5600);await wait(5800);await fade(1,2200);
  el('hud').classList.remove('on');el('endTxt').textContent=t('endTitle');el('endBtn').textContent=t('menuBtn');show('endcard');
}


/* ---------- opening: Fred wakes up, eyes blurry ---------- */
async function introCutscene(){
  locked=true;const f=el('fade');f.style.transition='none';f.style.opacity=1;f.classList.add('blur');
  await wait(60);await fade(0,3400,true);addLog('wake');say('m_wake',3800);await wait(4200);say('m_wake2',4200);await wait(4300);
  toast(t('ph_hint'));locked=false;saveGame();
}
