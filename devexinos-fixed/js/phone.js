/* =====================================================================
   PHONE  (press P, or tap the 📱 button)
   Apps: Messages (wife / sons / mother / friend / unknown), Camera,
   Gallery, Notes (current goal), Flashlight, Save, Settings.
   Chats are story content: new messages arrive as you recover doll parts.
   ===================================================================== */
let camMode=false,PHOTOS=[];
const PH={app:null,thread:null,photo:null};

/* message = [direction, text key, optional time-label key, optional requirement]
   requirement = a save flag (state.f.x) or a collected item (state.taken.x) */
const CHATS=[
  {id:'amira',icon:'❤️',name:'ph_n_amira',m:[['in','c_a1','ph_2y'],['out','c_a2'],['in','c_a3'],['out','c_a4'],['in','c_a5'],['in','c_a6'],['in','c_a7','ph_now','doll'],['in','c_a8','ph_now','burned']]},
  {id:'boys',icon:'💙',name:'ph_n_boys',m:[['in','c_b1','ph_1y'],['in','c_b2'],['out','c_b3'],['in','c_b4','ph_1w'],['in','c_b5','ph_3d'],['in','c_b6','ph_now','burned']]},
  {id:'mama',icon:'👩',name:'ph_n_mama',m:[['in','c_m1','ph_1m'],['in','c_m2'],['out','c_m3'],['in','c_m4']]},
  {id:'karim',icon:'🧔',name:'ph_n_karim',m:[['in','c_k1','ph_2w'],['out','c_k2'],['in','c_k3'],['out','c_k4'],['in','c_k5']]},
  {id:'unk',icon:'❓',name:'ph_n_unknown',m:[['in','c_u1','ph_now','head'],['in','c_u2',null,'arms'],['in','c_u3',null,'torso'],['in','c_u4',null,'legs'],['in','c_u5',null,'doll'],['in','c_u6',null,'burned']]}
];
const mkEl=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const reqOk=r=>!r||!!(state.f[r]||state.taken[r]);
const visMsgs=c=>c.m.filter(x=>reqOk(x[3]));
function unreadOf(c){const seen=(state.read&&state.read[c.id])||0;return visMsgs(c).slice(seen).filter(x=>x[0]==='in').length}
const totalUnread=()=>CHATS.reduce((n,c)=>n+unreadOf(c),0);
function phoneTime(){const tot=167+Math.floor(state.clock||0);return Math.floor(tot/60)%24+':'+String(tot%60).padStart(2,'0')} // starts at 2:47 am
function roomAt(x,z,lv){if(lv==='base')return 'basement';if(x>-2&&x<2)return 'hall';if(x<-2)return z>0?'bedroom':z>-5.9?'study':'kitchen';return z>.2?'amira':z>-7.6?'gallery':'chapel'}

/* ---------- photos are stored separately from the save (size) ---------- */
function savePhotos(){for(let i=0;i<8;i++){try{localStorage.setItem('dvx_photos',JSON.stringify(PHOTOS));return}catch(e){PHOTOS.shift()}}}
function phoneLoad(fresh){PHOTOS=fresh?[]:store.get('dvx_photos',[]);if(fresh)savePhotos()}

/* ---------- new-message notifications ---------- */
function phoneCheckNew(){
  if(!started)return;
  if(!state.notified)state.notified={};
  let fresh=false;
  CHATS.forEach(c=>{const n=visMsgs(c).length,old=state.notified[c.id];
    if(old===undefined){state.notified[c.id]=n;return}
    if(n>old){state.notified[c.id]=n;fresh=true}});
  if(fresh){sfx('beep',1300);setTimeout(()=>sfx('beep',1700),150);toast('📱 '+t('ph_newmsg'));try{navigator.vibrate&&navigator.vibrate([80,60,80])}catch(e){}}
  const b=el('bPhone');if(b)b.classList.toggle('lit',totalUnread()>0);
}

/* ---------- open / close ---------- */
function phoneOpen(){
  if(!started||locked)return;
  if(camMode)exitCam();
  PH.app=null;renderPhone();openOverlay('phone');sfx('click');
  if(!state.f.phoneSeen){state.f.phoneSeen=1;toast(t('ph_first'))}
}
function phoneToggle(){if(current==='phone')resume();else if(current===null)phoneOpen()}
function phGo(app,extra){PH.app=app;if(app==='thread')PH.thread=extra;if(app==='photo')PH.photo=extra;sfx('click');renderPhone()}
function phBack(){const m={thread:'messages',photo:'gallery'};PH.app=m[PH.app]||null;renderPhone()}

/* ---------- screens ---------- */
function renderPhone(){
  const s=el('phScreen');s.innerHTML='';
  el('phTime').textContent=phoneTime();el('phSig').textContent=t('ph_nosig');
  el('phBat').textContent='🔋 '+Math.max(5,41-Math.floor((state.clock||0)/12))+'%';
  const R={home:rHome,messages:rMessages,thread:rThread,gallery:rGallery,photo:rPhoto,notes:rNotes,save:rSave,settings:rSettings};
  (R[PH.app||'home']||rHome)(s);
  el('phBack').style.visibility=PH.app?'visible':'hidden';
}
function rHome(s){
  s.appendChild(mkEl('div','ph-clock',phoneTime()));s.appendChild(mkEl('div','ph-date',t('ph_nosig')));
  const g=mkEl('div','ph-grid');
  [['messages','💬','ph_messages'],['camera','📷','ph_camera'],['gallery','🖼️','ph_gallery'],['notes','📝','ph_notes'],['flash','🔦','ph_flash'],['save','💾','ph_save'],['settings','⚙️','ph_settings']].forEach(([id,ic,k])=>{
    const b=mkEl('button','ph-app'),i=mkEl('div','ph-ico',ic);b.appendChild(i);b.appendChild(mkEl('span','',t(k)));
    if(id==='messages'&&totalUnread())b.appendChild(mkEl('span','ph-badge',String(totalUnread())));
    if(id==='flash'&&flashOn)i.classList.add('on');
    b.onclick=()=>{if(id==='camera')camEnter();else if(id==='flash'){toggleFlash();renderPhone()}else phGo(id)};
    g.appendChild(b)});
  s.appendChild(g);
}
function rMessages(s){
  s.appendChild(mkEl('div','ph-h',t('ph_messages')));
  const list=CHATS.filter(c=>visMsgs(c).length);
  if(!list.length){s.appendChild(mkEl('p','empty',t('ph_noMsgs')));return}
  list.forEach(c=>{
    const row=mkEl('div','ph-row'),av=mkEl('div','ph-av',c.icon),mid=mkEl('div','ph-mid'),vm=visMsgs(c),last=vm[vm.length-1];
    mid.appendChild(mkEl('div','ph-nm',t(c.name)));mid.appendChild(mkEl('div','ph-pv',(last[0]==='out'?'↩ ':'')+t(last[1])));
    row.append(av,mid);if(unreadOf(c))row.appendChild(mkEl('div','ph-unread'));
    row.onclick=()=>phGo('thread',c.id);s.appendChild(row)});
}
function rThread(s){
  const c=CHATS.find(x=>x.id===PH.thread);if(!c){phBack();return}
  const head=mkEl('div','ph-h');head.appendChild(mkEl('span','ph-av',c.icon));head.appendChild(mkEl('span','',t(c.name)));
  const call=mkEl('button','rbtn',t('ph_call')+' 📞');call.style.marginInlineStart='auto';call.onclick=()=>{sfx('buzz');toast(t('ph_nocall'))};head.appendChild(call);s.appendChild(head);
  const chat=mkEl('div','chat');
  visMsgs(c).forEach(m=>{if(m[2])chat.appendChild(mkEl('div','stamp',t(m[2])));chat.appendChild(mkEl('div','bub '+m[0],t(m[1])))});
  s.appendChild(chat);
  if(!state.read)state.read={};state.read[c.id]=visMsgs(c).length;
  const b=el('bPhone');if(b)b.classList.toggle('lit',totalUnread()>0);
  setTimeout(()=>{s.scrollTop=s.scrollHeight},0);
}
function rGallery(s){
  s.appendChild(mkEl('div','ph-h',t('ph_gallery')+' ('+PHOTOS.length+')'));
  if(!PHOTOS.length){s.appendChild(mkEl('p','empty',t('ph_noPhotos')));return}
  const g=mkEl('div','ph-photos');
  PHOTOS.forEach((p,i)=>{const im=mkEl('img');im.src=p.d;im.alt='';im.onclick=()=>phGo('photo',i);g.appendChild(im)});
  s.appendChild(g);
}
function rPhoto(s){
  const p=PHOTOS[PH.photo];if(!p){phBack();return}
  const im=mkEl('img');im.src=p.d;im.style.cssText='width:100%;border-radius:6px';s.appendChild(im);
  s.appendChild(mkEl('p','ph-pv',(p.ghost?'⚠ ':'')+t('r_'+p.room)+' · '+p.t));
  const row=mkEl('div','actions');
  const dl=mkEl('button','rbtn',t('ph_download'));dl.onclick=()=>{const a=document.createElement('a');a.href=p.d;a.download='devexinos_'+(PH.photo+1)+'.jpg';document.body.appendChild(a);a.click();a.remove()};
  const del=mkEl('button','rbtn',t('ph_delete'));del.onclick=()=>{PHOTOS.splice(PH.photo,1);savePhotos();phBack()};
  row.appendChild(dl);row.appendChild(del);s.appendChild(row);
}
function rNotes(s){
  s.appendChild(mkEl('div','ph-h',t('ph_notes')));
  s.appendChild(mkEl('div','ph-pv',t('ph_goal')));s.appendChild(mkEl('p','ph-goal',t(currentGoal())));
  const n=PARTS.filter(p=>state.taken[p]).length;
  s.appendChild(mkEl('p','parts',t('parts')+': '+PARTS.map(p=>state.taken[p]?'◆':'◇').join(' ')+'  '+n+'/4'));
  s.appendChild(mkEl('p','ph-pv',t('ph_photos')+': '+PHOTOS.length));
}
function rSave(s){
  s.appendChild(mkEl('div','ph-h',t('ph_save')));
  s.appendChild(mkEl('p','ph-pv',t('ph_lastSave')+': '+(state.lastSave?new Date(state.lastSave).toLocaleTimeString():t('ph_never'))));
  const b=mkEl('button','rbtn main',t('ph_saveNow')+' 💾');b.onclick=()=>{saveGame();sfx('pickup');toast(t('ph_saved'));renderPhone()};s.appendChild(b);
  s.appendChild(mkEl('p','note',t('ph_auto')));
}
function rSettings(s){
  s.appendChild(mkEl('div','ph-h',t('ph_settings')));
  s.appendChild(mkEl('p','ph-pv',t('ph_lang')));
  const row=mkEl('div','actions');
  [['ar','العربية'],['en','English'],['fr','Français'],['zh','中文']].forEach(([k,n])=>{const b=mkEl('button','rbtn'+(S.lang===k?' main':''),n);b.onclick=()=>{S.lang=k;saveSettings();syncControls();applyLang();renderPhone()};row.appendChild(b)});
  s.appendChild(row);
  s.appendChild(mkEl('p','ph-pv',t('ph_vol')));
  const r=mkEl('input');r.type='range';r.min=0;r.max=1;r.step=.01;r.value=S.master;r.style.width='100%';r.oninput=()=>{S.master=parseFloat(r.value);saveSettings();applyVol()};s.appendChild(r);
  const a=mkEl('div','actions');
  const all=mkEl('button','rbtn',t('ph_allset'));all.onclick=()=>{syncControls();show('settings')};
  const mm=mkEl('button','rbtn',t('ph_menu'));mm.onclick=()=>quitToMenu();
  a.appendChild(all);a.appendChild(mm);s.appendChild(a);
}

/* ---------- camera ---------- */
function camEnter(){resume();camMode=true;document.body.classList.add('cam');el('camCount').textContent=PHOTOS.length+' 📷';toast(t('ph_camHint'))}
function exitCam(){camMode=false;document.body.classList.remove('cam')}
function shoot(){
  if(!camMode||locked||paused||!renderer)return;
  cameraFlash();sfx('beep',1500);const fx=el('shutterfx');fx.classList.remove('go');void fx.offsetWidth;fx.classList.add('go');
  const prev=flash.intensity;flash.intensity=5;renderer.render(scene,camera);       // render once with the flash lit
  const src=renderer.domElement,w=480,hh=Math.max(1,Math.round(w*src.height/src.width)),cv=document.createElement('canvas');cv.width=w;cv.height=hh;
  const g=cv.getContext('2d');g.drawImage(src,0,0,w,hh);
  const room=roomAt(P.x,P.z,P.lv),stamp=phoneTime()+'  '+t('r_'+room);
  g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,hh-22,w,22);g.fillStyle='#e8dccc';g.font='12px monospace';g.fillText(stamp,8,hh-7);
  flash.intensity=prev;
  let ghost=false;                                                                   // is Devexinos in the frame?
  if(ent.on&&P.lv==='house'){const dx=ent.x-P.x,dz=ent.z-P.z,d=Math.hypot(dx,dz);
    if(d<14&&Math.abs(wrapA(Math.atan2(dx,dz)-Math.atan2(-Math.sin(P.yaw),-Math.cos(P.yaw))))<.5&&clearLine(P.x,P.z,1.5,ent.x,ent.z,1.5,0,true))ghost=true}
  PHOTOS.push({d:cv.toDataURL('image/jpeg',.62),room,t:phoneTime(),ghost});if(PHOTOS.length>24)PHOTOS.shift();savePhotos();
  el('camCount').textContent=PHOTOS.length+' 📷';
  if(ent.on&&inGallery(P.x,P.z)&&!P.hidden)ent.aw=Math.min(1.2,ent.aw+.6);          // the flash attracts it
  if(ghost){sfx('scare');boost(.8,3);say('ph_ghost',3500)}else toast(t('ph_photoTaken'));
}

/* ---------- wiring ---------- */
el('phBack').onclick=phBack;el('phHome').onclick=()=>{PH.app=null;renderPhone()};el('phClose').onclick=()=>resume();
el('camShutter').addEventListener('pointerup',()=>shoot());el('camClose').addEventListener('pointerup',()=>exitCam());
setInterval(()=>{if(current==='phone'&&!PH.app)renderPhone()},5000);
