// 3D garage (CarX-style): the selected car sits on a rug in a wood-and-stone garage with a window, shelves, desk with monitors and neon.
// Left = filters + car list, right = car stats, bottom = class tabs / browse, bottom-right = tuning + buy/select.
import * as THREE from 'three';
import {t} from './i18n.js';
const GX=-5000,GZ=-5000,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),CL=['D','C','B','A','S'];
function tex(w,h,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const x=new THREE.CanvasTexture(c);x.colorSpace=THREE.SRGBColorSpace;x.wrapS=x.wrapT=THREE.RepeatWrapping;x.repeat.set(rx,ry);x.anisotropy=4;return x}
const rr=(g,x,y,w,h,r)=>{g.beginPath();(g.roundRect||g.rect).call(g,x,y,w,h,r);g.fill()};
const wood=()=>tex(512,512,(g,w,h)=>{g.fillStyle='#6a4326';g.fillRect(0,0,w,h);for(let i=0;i<8;i++){const x=i*64;g.fillStyle=`hsl(25,45%,${24+Math.random()*10}%)`;g.fillRect(x+2,0,60,h);for(let k=0;k<30;k++){g.fillStyle='rgba(0,0,0,.08)';g.fillRect(x+Math.random()*60,Math.random()*h,1+Math.random()*2,20+Math.random()*80)}g.fillStyle='rgba(0,0,0,.5)';g.fillRect(x,0,3,h)}},5,4);
const stone=()=>tex(512,512,(g,w,h)=>{g.fillStyle='#2e2823';g.fillRect(0,0,w,h);let y=0;while(y<h){const rh=50+Math.random()*30;let x=-Math.random()*60;while(x<w){const bw=70+Math.random()*60;g.fillStyle=`hsl(25,${8+Math.random()*10}%,${22+Math.random()*16}%)`;rr(g,x+3,y+3,bw-6,rh-6,10);x+=bw}y+=rh}},3,1.6);
const panel=()=>tex(256,256,(g,w,h)=>{g.fillStyle='#4a2a14';g.fillRect(0,0,w,h);for(let i=0;i<4;i++){g.fillStyle=`hsl(24,50%,${24+i*2}%)`;g.fillRect(i*64+3,0,58,h);g.fillStyle='rgba(255,255,255,.05)';g.fillRect(i*64+10,0,6,h)}},3,1.6);
const rug=()=>tex(512,320,(g,w,h)=>{g.fillStyle='#8a1f14';g.fillRect(0,0,w,h);g.strokeStyle='#e8c27a';g.lineWidth=10;g.strokeRect(14,14,w-28,h-28);g.strokeStyle='#2a1a3a';g.lineWidth=6;g.strokeRect(34,34,w-68,h-68);
 for(let i=0;i<13;i++){g.fillStyle=i%2?'#c9732a':'#e8c27a';g.fillRect(52+i*34,46,16,10);g.fillRect(52+i*34,h-56,16,10)}
 [[120,70,'#c9732a'],[90,48,'#2a1a3a'],[46,24,'#e8c27a']].forEach(([a,b,c])=>{g.fillStyle=c;g.beginPath();g.ellipse(w/2,h/2,a,b,0,0,6.28);g.fill()})});
function room(){const g=new THREE.Group(),L=c=>new THREE.MeshLambertMaterial({color:c}),B=c=>new THREE.MeshBasicMaterial({color:c}),T=m=>new THREE.MeshLambertMaterial({map:m()}),
  M=(w,h,d,mat,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);g.add(m);return m},W=14,D=13,H=4.6,bz=-D/2;
 M(W,.2,D,T(wood),0,-.1,0);M(W,.2,D,L(0x151824),0,H+.1,0);M(W,H,.3,L(0x20232e),0,H/2,D/2);
 M(W*.3,H,.3,T(panel),-W*.35,H/2,bz);M(W*.7,H,.3,T(stone),W*.15,H/2,bz);M(2.4,3.1,.14,L(0x4a2a14),5,1.55,bz+.2);M(.07,3.1,.16,L(0x2a160a),5,1.55,bz+.21);M(2.6,.12,.2,L(0x2a160a),5,3.15,bz+.22);
 M(.3,H,D,L(0x3a3f4d),-W/2,H/2,0);M(.12,2.8,6,B(0xd9ecff),-W/2+.2,2.4,-.6);for(let i=0;i<4;i++)M(.14,2.8,.1,L(0x1a1a1a),-W/2+.22,2.4,-3.6+i*2);M(.14,.1,6,L(0x1a1a1a),-W/2+.22,2.4,-.6);
 M(.3,H,D,T(panel),W/2,H/2,0);
 const rg=new THREE.Mesh(new THREE.PlaneGeometry(7.4,4.6),new THREE.MeshLambertMaterial({map:rug()}));rg.rotation.x=-Math.PI/2;rg.position.set(0,.01,-.5);g.add(rg);
 for(const y of[2.1,3.1]){M(3.4,.08,.45,L(0x2a1a10),1.4,y,bz+.4);for(let i=0;i<8;i++){const h=.2+Math.random()*.25;M(.18+Math.random()*.15,h,.2,L([0xd21034,0x2f8bff,0xffd166,0x1b1b1b,0xe8e8e8][i%5]),-.1+i*.42,y+.04+h/2,bz+.4)}}
 M(2.6,.06,1.1,L(0x2a2a30),-4.6,.78,bz+.9);[[-1.2,-.5],[1.2,-.5],[-1.2,.5],[1.2,.5]].forEach(([a,b])=>M(.06,.76,.06,L(0x111111),-4.6+a,.38,bz+.9+b));
 for(let i=0;i<3;i++){const m=M(.95,.56,.05,B(0x3a78c8),-5.4+i*.95,1.32,bz+.55);m.rotation.y=(1-i)*.25;M(.1,.3,.1,L(0x222222),-5.4+i*.95,.95,bz+.6)}
 M(.6,.05,.2,L(0x111111),-4.6,.82,bz+1.25);M(.62,.12,.62,L(0x111111),-4.2,.5,bz+2.2);M(.6,.95,.12,L(0xc8102e),-4.2,1.05,bz+1.9);M(.1,.5,.1,L(0x222222),-4.2,.25,bz+2.2);
 M(W,.07,.14,B(0x6a5cff),0,H-.15,bz+.4);M(.14,.07,D,B(0x2f8bff),-W/2+.5,H-.15,0);M(.14,.07,D,B(0x2f8bff),W/2-.5,H-.15,0);M(W,.07,.14,B(0xff3b5c),0,H-.15,D/2-.4);
 const l1=new THREE.PointLight(0xffe2b8,14,0,2),l2=new THREE.PointLight(0x6aa6ff,9,0,2),l3=new THREE.PointLight(0xffb36a,5,0,2);l1.position.set(2,3.9,2);l2.position.set(-4.5,3.6,-2);l3.position.set(1.5,2.6,bz+1.4);g.add(l1,l2,l3);return g}
export const Garage={on:false,tab:'all',sort:'def',own:false,yaw:.6,tok:0,id:null,
 init(c){this.c=c;this.id=c.Save.data.car},
 build(){this.g=room();this.g.position.set(GX,0,GZ);this.holder=new THREE.Group();this.holder.position.set(0,0,-.5);this.g.add(this.holder);this.c.scene.add(this.g)},
 lights(on){const c=this.c;if(on){this.o=[c.hemi.intensity,c.sun.intensity];c.hemi.intensity=.5;c.sun.intensity=.15}else if(this.o){c.hemi.intensity=this.o[0];c.sun.intensity=this.o[1]}},
 score(e){return e.hp*.45+e.top*.25+e.torque*.08+(1500-e.weight)*.015},
 cls(e){const s=this.score(e);return s<70?'D':s<90?'C':s<110?'B':s<130?'A':'S'},
 vis(){const c=this.c,S=c.Save.data;let a=c.CARS.map(x=>{const e=c.stats(x,S.tune[x.id]);return{x,e,own:S.owned.includes(x.id),cl:this.cls(e)}});
  if(this.tab!=='all')a=a.filter(o=>o.cl===this.tab);if(this.own)a=a.filter(o=>o.own);if(this.sort==='price')a.sort((p,q)=>p.x.price-q.x.price);else if(this.sort==='power')a.sort((p,q)=>q.e.hp-p.e.hp);return a},
 open(){const c=this.c;if(!this.g)this.build();this.g.visible=true;this.on=true;this.lights(true);this.id=this.id||c.Save.data.car;this.ui();c.show('gar');this.show3d();
  const el=document.getElementById('gar');el.onpointerdown=e=>{if(e.target!==el)return;this.drag=true;this.lx=e.clientX;el.setPointerCapture(e.pointerId)};el.onpointermove=e=>{if(this.drag){this.yaw+=(e.clientX-this.lx)*.012;this.lx=e.clientX}};el.onpointerup=el.onpointercancel=()=>this.drag=false},
 close(){this.on=false;if(this.g)this.g.visible=false;this.lights(false);if(this.car){this.holder.remove(this.car);this.car=null}this.tok++},
 async show3d(){const tk=++this.tok,c=this.c,x=c.CARS.find(q=>q.id===this.id),n=document.getElementById('gName');if(!x)return;if(n)n.textContent=x.name+' …';let m;try{m=await c.carModel(x,false,null,true)}catch{return}
  if(tk!==this.tok||!this.on)return;if(this.car)this.holder.remove(this.car);c.applyLook(m,x.id);this.car=m;this.holder.add(m);if(n)n.textContent=x.name},
 update(dt){if(!this.drag)this.yaw+=dt*.3;if(this.car)this.car.rotation.y=this.yaw;const cam=this.c.cam;cam.position.set(GX+2.4,1.35,GZ+5.6);cam.lookAt(GX,.75,GZ-.5);cam.fov=42;cam.updateProjectionMatrix()},
 ui(){const el=document.getElementById('gar'),$=s=>el.querySelector(s);
  el.innerHTML=`<button class="gback" id="gBack">‹ ${t('garage')}</button><div class="gchips"><div class="chip2" id="gMoney"></div><div class="lvl" id="gLvl"></div></div>
  <div class="gpanel gleft"><h4>☰ ${t('gfilters')}</h4><label class="gtog"><input type="checkbox" id="gOwn" ${this.own?'checked':''}> ${t('gowned')}</label><label class="gsel">${t('gsort')}<select id="gSort"><option value="def">${t('gdef')}</option><option value="price">${t('gprice')}</option><option value="power">${t('gpower')}</option></select></label><div id="gList"></div></div>
  <div class="gpanel gright"><div class="ghead"><span class="gcls" id="gCls"></span><b>${t('gstats')}</b></div><div id="gStats"></div></div><div class="gname" id="gName"></div>
  <div class="gbar"><div class="gtabs" id="gTabs"></div><button class="gnav" id="gPrev">‹</button><span id="gCount"></span><button class="gnav" id="gNext">›</button><button class="gsug" id="gSug">${t('gsuggest')}</button><button class="gnav" id="gFlip">⇄</button></div>
  <div class="gact"><button class="gtune" id="gTune">⚙ ${t('gtuning')}</button><button id="gMain" class="gmain"></button></div>`;
  $('#gSort').value=this.sort;$('#gBack').onclick=()=>{this.close();this.c.back()};$('#gOwn').onchange=e=>{this.own=e.target.checked;this.refresh()};$('#gSort').onchange=e=>{this.sort=e.target.value;this.refresh()};
  $('#gPrev').onclick=()=>this.step(-1);$('#gNext').onclick=()=>this.step(1);$('#gSug').onclick=()=>this.suggest();
  $('#gFlip').onclick=()=>{const S=this.c.Save.data,F=S.flip||={};F[this.id]=!F[this.id];this.c.Save.write();this.show3d();this.c.onFlip(this.c.CARS.find(q=>q.id===this.id))};
  $('#gTune').onclick=()=>{if(this.c.Save.data.owned.includes(this.id))this.c.openTune(this.id)};$('#gMain').onclick=()=>this.act();this.refresh()},
 step(d){const a=this.vis();if(!a.length)return;const i=a.findIndex(o=>o.x.id===this.id);this.id=a[(i+d+a.length)%a.length].x.id;this.refresh();this.show3d()},
 pick(id){this.id=id;this.refresh();this.show3d()},
 suggest(){const c=this.c,S=c.Save.data,a=c.CARS.filter(x=>!S.owned.includes(x.id)).sort((p,q)=>p.price-q.price),ok=a.find(x=>c.level()>=x.level&&S.money>=x.price)||a[0];if(ok){this.tab='all';this.own=false;this.pick(ok.id);const o=document.getElementById('gOwn');if(o)o.checked=false}},
 act(){const c=this.c,S=c.Save.data,x=c.CARS.find(q=>q.id===this.id),own=S.owned.includes(x.id);
  if(own){S.car=x.id;c.Save.write();c.onSelect(x)}else if(c.level()>=x.level&&S.money>=x.price){S.money-=x.price;S.owned.push(x.id);c.Save.write()}this.refresh()},
 refresh(){const el=document.getElementById('gar'),$=s=>el.querySelector(s),c=this.c,S=c.Save.data,a=this.vis();let cur=a.find(o=>o.x.id===this.id);if(!cur&&a.length){cur=a[0];this.id=cur.x.id;this.show3d()}
  $('#gMoney').textContent=c.fmt(S.money);$('#gLvl').innerHTML=`<small>${t('lvl')}</small><b>${c.level()}</b>`;
  $('#gList').innerHTML=a.map(o=>`<div class="gi${o.x.id===this.id?' on':''}" data-i="${o.x.id}"><i class="gc c${o.cl}">${o.cl}</i><span>${o.x.name}</span><small>${o.own?'✓':c.level()>=o.x.level?'':'🔒'}</small></div>`).join('')||'<small>—</small>';
  $('#gList').querySelectorAll('.gi').forEach(d=>d.onclick=()=>this.pick(d.dataset.i));
  $('#gTabs').innerHTML=['all',...CL].map(k=>`<button class="${this.tab===k?'on':''}" data-k="${k}">${k==='all'?'★':k}</button>`).join('');$('#gTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{this.tab=b.dataset.k;this.refresh()});
  $('#gCount').textContent=(a.indexOf(cur)+1)+'/'+a.length;if(!cur){$('#gStats').innerHTML='';return}
  const e=cur.e,x=cur.x,hand=Math.round(clamp(62+(e.grip-1)*90-(e.weight-900)/28,35,98)),br=Math.round(clamp(50+(e.brake-1)*55+(1500-e.weight)/40,30,99)),
   rows=[['gspeed',e.top/260,Math.round(e.top)+' km/h'],['gtorque',e.torque/400,Math.round(e.torque)+' Nm'],['gbrakes',br/100,br+'%'],['ghandling',hand/100,hand+'%']];
  $('#gCls').textContent=cur.cl+' '+Math.round(this.score(e)*5);$('#gCls').className='gcls c'+cur.cl;
  $('#gStats').innerHTML=rows.map(([k,v,s])=>`<div class="gr"><span>${t(k)}</span><b>${s}</b></div><div class="gb"><i style="width:${Math.round(clamp(v,.05,1)*100)}%"></i></div>`).join('')+`<small class="gsm">${Math.round(e.hp)} HP · ${Math.round(e.weight)} kg · 0-100 ${e.t100.toFixed(1)} s</small>`;
  const own=cur.own,ok=c.level()>=x.level,m=$('#gMain');m.textContent=own?(S.car===x.id?'✓ ':'')+t('use'):ok?t('buy')+' · '+c.fmt(x.price):'🔒 '+t('lvl')+' '+x.level;m.disabled=own?S.car===x.id:(!ok||S.money<x.price);$('#gTune').disabled=!own}
};
