// Houses (buy / enter / furnish), shops (furniture, electro, decor) and their map pins. Interiors are procedural rooms built far away from the map.
import * as THREE from 'three';
import {t} from './i18n.js';
export const FURN={
 sofa:{ico:'🛋',cat:'living',price:45000,w:2,d:.95},armchair:{ico:'💺',cat:'living',price:22000,w:.9,d:.9},table:{ico:'🍽',cat:'living',price:30000,w:1.5,d:.9},chair:{ico:'🪑',cat:'living',price:6000,w:.5,d:.5},bookshelf:{ico:'📚',cat:'living',price:18000,w:1,d:.35},
 bed:{ico:'🛏',cat:'bed',price:55000,w:1.6,d:2.1},wardrobe:{ico:'🚪',cat:'bed',price:38000,w:1.3,d:.65},desk:{ico:'🖥',cat:'bed',price:26000,w:1.4,d:.7},
 fridge:{ico:'🧊',cat:'elec',price:60000,w:.75,d:.75},tv:{ico:'📺',cat:'elec',price:48000,w:1.3,d:.45},
 lamp:{ico:'💡',cat:'deco',price:7000,w:.4,d:.4},plant:{ico:'🪴',cat:'deco',price:5000,w:.5,d:.5},rug:{ico:'🟩',cat:'deco',price:12000,w:2.4,d:1.6,flat:1},painting:{ico:'🖼',cat:'deco',price:9000,w:1,d:.1,flat:1}};
export const SHOPS=[{id:'furn',ico:'🛋',col:0xffa94d,cats:['living','bed']},{id:'elec',ico:'📺',col:0x35b7ff,cats:['elec']},{id:'deco',ico:'🪴',col:0x7dffb0,cats:['deco']}];
export const HOUSES=[{id:'h1',ico:'🏠',price:400000,w:6,d:5},{id:'h2',ico:'🏡',price:1200000,w:9,d:7},{id:'h3',ico:'🏰',price:3500000,w:12,d:9}];
const IX=5000,IZ=5000,H=2.8,fmt=n=>Math.round(n).toLocaleString('fr-DZ')+' '+t('cur'),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const bx=(w,h,d,c,x,y,z,basic)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),basic?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));m.position.set(x,y,z);m.castShadow=true;return m};
export function mk(k){const g=new THREE.Group(),A=(...a)=>g.add(bx(...a)),legs=(w,d,h,c,x=0)=>[-1,1].forEach(i=>[-1,1].forEach(j=>A(.06,h,.06,c,x+i*w,h/2,j*d)));
 switch(k){
  case'sofa':A(2,.4,.95,0x8a5a3c,0,.25,0);A(2,.55,.22,0x7a4a2c,0,.6,-.36);A(.22,.55,.95,0x7a4a2c,-.9,.45,0);A(.22,.55,.95,0x7a4a2c,.9,.45,0);A(1.5,.18,.7,0xa8714b,0,.52,.06);break;
  case'armchair':A(.9,.35,.9,0x3c6a8a,0,.22,0);A(.9,.55,.2,0x34607e,0,.62,-.35);A(.2,.45,.9,0x34607e,-.35,.4,0);A(.2,.45,.9,0x34607e,.35,.4,0);break;
  case'table':A(1.5,.06,.9,0x9c6b3a,0,.74,0);legs(.68,.38,.72,0x7a5230);break;
  case'chair':A(.46,.05,.46,0xb07a44,0,.45,0);A(.46,.5,.05,0xb07a44,0,.72,-.2);legs(.2,.2,.44,0x7a5230);break;
  case'bookshelf':A(1,1.8,.35,0x7a5230,0,.9,0);[.3,.75,1.2,1.62].forEach((y,i)=>A(.9,.28,.25,[0xd21034,0x0a7b3e,0x35b7ff,0xffd84a][i],0,y,.04));break;
  case'bed':A(1.6,.35,2.1,0x6b4a2b,0,.2,0);A(1.5,.2,2,0xf2efe6,0,.45,0);A(.6,.12,.35,0xffffff,-.35,.58,-.8);A(.6,.12,.35,0xffffff,.35,.58,-.8);A(1.5,.08,1.2,0x0a7b3e,0,.57,.3);A(1.6,.8,.08,0x6b4a2b,0,.6,-1.04);break;
  case'wardrobe':A(1.3,2,.65,0xb08a5a,0,1,0);A(.02,1.9,.02,0x6b4a2b,0,1,.33);A(.04,.3,.04,0x333,-.08,1,.34);A(.04,.3,.04,0x333,.08,1,.34);break;
  case'desk':A(1.4,.05,.7,0xc59b66,0,.75,0);A(.05,.72,.65,0xa57b46,-.65,.36,0);A(.05,.72,.65,0xa57b46,.65,.36,0);A(.6,.38,.04,0x111111,0,1.05,-.2);A(.1,.3,.1,0x333333,0,.9,-.2);break;
  case'fridge':A(.75,1.8,.75,0xeaf0f2,0,.9,0);A(.04,.5,.04,0x999999,.3,1.25,.4);A(.7,.02,.02,0xaaaaaa,0,1.1,.38);break;
  case'tv':A(1.3,.45,.45,0x3a2a1c,0,.23,0);A(1.1,.65,.05,0x1b4b6b,0,.92,0,true);A(1.14,.69,.04,0x0b0f12,0,.92,-.02);break;
  case'lamp':A(.04,1.5,.04,0x333333,0,.75,0);A(.3,.3,.3,0xffe9a8,0,1.55,0,true);A(.3,.04,.3,0x333333,0,.02,0);break;
  case'plant':{const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.15,.3,10),new THREE.MeshLambertMaterial({color:0xb5532f}));p.position.y=.15;g.add(p);const l=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),new THREE.MeshLambertMaterial({color:0x2e8b3d}));l.position.y=.6;g.add(l);break}
  case'rug':A(2.4,.02,1.6,0x0a7b3e,0,.012,0);A(2.2,.022,1.4,0xf6f1e8,0,.013,0);A(1.9,.024,1.1,0xd21034,0,.014,0);break;
  case'painting':A(1,.7,.04,0x5a3b1f,0,1.5,0);A(.9,.6,.045,0x2a8f6a,0,1.5,.004);A(.4,.25,.05,0xffd84a,.12,1.45,.006);break}
 return g}
function buildRoom(g,h){const w=h.w,d=h.d,wall=0xefe7d6,A=(...a)=>g.add(bx(...a));A(w,.1,d,0xb58a5a,0,-.05,0);A(w,.1,d,0xf6f1e8,0,H+.05,0);
 A(w+.4,H,.2,wall,0,H/2,-d/2-.1);A(.2,H,d,wall,-w/2-.1,H/2,0);A(.2,H,d,wall,w/2+.1,H/2,0);
 const gw=1.2,sw=(w-gw)/2;A(sw,H,.2,wall,-(gw/2+sw/2),H/2,d/2+.1);A(sw,H,.2,wall,gw/2+sw/2,H/2,d/2+.1);A(gw,H-2.2,.2,wall,0,2.2+(H-2.2)/2,d/2+.1);
 A(gw-.1,2.15,.05,0x5a3b1f,0,1.08,d/2+.02);A(.06,.2,.06,0xffd84a,.4,1.05,d/2-.02);A(w,.12,.04,0xffffff,0,.06,-d/2+.02);
 for(let i=0;i<Math.max(1,Math.floor(w/4));i++){const x=-w/2+(i+.5)*w/Math.max(1,Math.floor(w/4));A(1.3,1.1,.04,0x9fd0ff,x,1.6,-d/2+.02,true);A(1.4,.06,.05,0xffffff,x,1.06,-d/2+.03)}}
function label(txt,col){const cv=document.createElement('canvas');cv.width=512;cv.height=160;const x=cv.getContext('2d');x.fillStyle='rgba(8,26,18,.88)';x.strokeStyle=col;x.lineWidth=8;x.beginPath();(x.roundRect||x.rect).call(x,8,8,496,144,28);x.fill();x.stroke();
 let fs=58;x.font='bold '+fs+'px system-ui,sans-serif';while(x.measureText(txt).width>470&&fs>26){fs-=4;x.font='bold '+fs+'px system-ui,sans-serif'}x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,256,84);
 const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false,fog:false}));s.scale.set(6,1.9,1);s.renderOrder=5;return s}
export const Home={IX,IZ,in:null,room:null,pins:[],edit:null,
 init(c){this.c=c;const S=c.Save.data;S.houses||={};S.furn||={};S.inv||={};S.pins||={};this.pg=new THREE.Group();c.scene.add(this.pg);this.rg=new THREE.Group();this.rg.position.set(IX,0,IZ);this.rg.visible=false;c.scene.add(this.rg);this.fg=new THREE.Group()},
 owned(id){return !!this.c.Save.data.houses[id]},
 houses(){return HOUSES.map(h=>({...h,owned:this.owned(h.id)}))},
 // pins: 3 houses for sale + 3 shops, stored per map so an owned house always stays where it is
 layout(mapId,from){const c=this.c,S=c.Save.data,G=c.Ground;this.pins.forEach(p=>this.pg.remove(p.g));this.pins=[];const saved=S.pins[mapId]||={};
  for(const d of[...HOUSES.map(h=>({...h,type:'house',min:150,max:650})),...SHOPS.map(s=>({...s,type:'shop',min:110,max:500}))]){let p=saved[d.id];
   if(!p||!G.open(p.x,p.z,p.y,'walk')){p=null;for(let i=0;i<10&&!p;i++){const r=G.walkTo(from,'walk',d.min,d.max);if(r&&this.pins.every(q=>Math.hypot(q.x-r.x,q.z-r.z)>40))p={x:r.x,y:r.y,z:r.z}}if(p)saved[d.id]=p}
   if(p)this.pins.push(this.mkPin(d,p))}c.Save.write()},
 pinText(p){return p.type==='house'?(this.owned(p.id)?p.ico+' ✓ '+t('hs_'+p.id):p.ico+' '+fmt(p.price)):p.ico+' '+t('sh_'+p.id)},
 mkPin(d,p){const col=d.type==='house'?0x35e08a:d.col,g=new THREE.Group(),A=(...a)=>g.add(bx(...a));g.position.set(p.x,p.y,p.z);
  A(.14,2.6,.14,col,-.8,1.3,0);A(.14,2.6,.14,col,.8,1.3,0);A(1.74,.16,.2,col,0,2.6,0);A(1.5,2.3,.05,0x10301f,0,1.2,-.1);
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,70,10,1,true),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.35,fog:false}));beam.position.y=35;g.add(beam);
  const pin={...d,x:p.x,y:p.y,z:p.z,g,col};pin.sp=label(this.pinText(pin),'#'+col.toString(16).padStart(6,'0'));pin.sp.position.y=4.3;g.add(pin.sp);this.pg.add(g);return pin},
 refresh(){for(const p of this.pins){p.g.remove(p.sp);p.sp=label(this.pinText(p),'#'+p.col.toString(16).padStart(6,'0'));p.sp.position.y=4.3;p.g.add(p.sp)}},
 near(x,z,y){return this.pins.find(p=>Math.hypot(p.x-x,p.z-z)<3.4&&Math.abs(p.y-y)<3)},
 go(id){const p=this.pins.find(q=>q.id===id);if(p)this.c.Quests.go({x:p.x,y:p.y,z:p.z},t(p.type==='house'?'hs_'+id:'sh_'+id))},
 buy(id){const S=this.c.Save.data,h=HOUSES.find(x=>x.id===id);if(!h||S.houses[id]||S.money<h.price)return false;S.money-=h.price;S.houses[id]=true;this.c.Save.write();this.refresh();return true},
 // ---- interior
 enter(id){const h=HOUSES.find(x=>x.id===id),g=this.rg;while(g.children.length)g.remove(g.children[0]);this.room=h;this.in=id;buildRoom(g,h);this.fg=new THREE.Group();g.add(this.fg);this.rebuild();g.visible=true;return h},
 exit(){this.in=null;this.rg.visible=false;this.edit=null;const e=document.getElementById('furn');if(e)e.style.display='none'},
 rebuild(skip=-1){while(this.fg.children.length)this.fg.remove(this.fg.children[0]);(this.c.Save.data.furn[this.in]||[]).forEach((f,i)=>{if(i===skip)return;const m=mk(f.k);m.position.set(f.x,0,f.z);m.rotation.y=f.r*Math.PI/2;this.fg.add(m)})},
 free(x,z){const R=this.room,lx=x-IX,lz=z-IZ;if(Math.abs(lx)>R.w/2-.3||lz<-R.d/2+.3||lz>R.d/2+.2)return false;
  for(const f of this.c.Save.data.furn[this.in]||[]){const F=FURN[f.k];if(F.flat)continue;const o=f.r%2,w=(o?F.d:F.w)/2+.22,d=(o?F.w:F.d)/2+.22;if(Math.abs(lx-f.x)<w&&Math.abs(lz-f.z)<d)return false}return true},
 // ---- furnishing panel
 furnUI(){const el=document.getElementById('furn');if(el.style.display==='block'){el.style.display='none';this.cancel();return}el.style.display='block';this.renderFurn()},
 start(k,idx,f){const c=this.c,cy=c.camYaw(),m=mk(k);this.edit={k,idx,x:f?f.x:Math.round((c.foot.x-IX+Math.sin(cy)*1.5)*4)/4,z:f?f.z:Math.round((c.foot.z-IZ+Math.cos(cy)*1.5)*4)/4,r:f?f.r:0,mesh:m};this.fg.add(m);this.sync();this.renderFurn()},
 sync(){const e=this.edit,F=FURN[e.k],o=e.r%2,hw=(o?F.d:F.w)/2,hd=(o?F.w:F.d)/2,R=this.room;e.x=clamp(e.x,-R.w/2+hw,R.w/2-hw);e.z=clamp(e.z,-R.d/2+hd,R.d/2-hd);e.mesh.position.set(e.x,0,e.z);e.mesh.rotation.y=e.r*Math.PI/2},
 mv(dir){const e=this.edit,cy=this.c.camYaw(),ax=(x,z)=>Math.abs(x)>Math.abs(z)?[Math.sign(x),0]:[0,Math.sign(z)],f=ax(Math.sin(cy),Math.cos(cy)),r=ax(-Math.cos(cy),Math.sin(cy)),v={U:f,D:[-f[0],-f[1]],R:r,L:[-r[0],-r[1]]}[dir];e.x+=v[0]*.25;e.z+=v[1]*.25;this.sync()},
 commit(){const S=this.c.Save.data,e=this.edit,a=S.furn[this.in]||=[];if(e.idx>=0)a[e.idx]={k:e.k,x:e.x,z:e.z,r:e.r};else{a.push({k:e.k,x:e.x,z:e.z,r:e.r});S.inv[e.k]--}this.edit=null;this.rebuild();this.c.Save.write();this.renderFurn()},
 cancel(){const S=this.c.Save.data,e=this.edit;if(!e)return;if(e.idx>=0&&e.store){(S.furn[this.in]||[]).splice(e.idx,1);S.inv[e.k]=(S.inv[e.k]||0)+1}this.edit=null;this.rebuild();this.c.Save.write();this.renderFurn()},
 renderFurn(){const el=document.getElementById('furn'),S=this.c.Save.data,arr=S.furn[this.in]||[],e=this.edit,have=Object.entries(S.inv).filter(([k,n])=>n>0);
  el.innerHTML=`<div class="fh"><b>🛋 ${t('furnish')}</b><button class="ib fx" id="fz">✕</button></div>`+(e?`<div class="fe"><b>${FURN[e.k].ico} ${t('f_'+e.k)}</b><div class="fg"><span></span><button data-m="U">▲</button><span></span><button data-m="L">◀</button><button data-m="T">⟳</button><button data-m="R">▶</button><span></span><button data-m="D">▼</button><span></span></div>
   <div class="fa"><button id="fok">✓ ${t('done')}</button><button class="alt" id="fst">${e.idx>=0?t('store'):t('cancel')}</button></div></div>`
   :`<h4>${t('inv')}</h4><div class="fl">${have.length?have.map(([k,n])=>`<button class="alt" data-p="${k}">${FURN[k].ico} ${t('f_'+k)} ×${n}</button>`).join(''):`<small>${t('buyfirst')}</small>`}</div><h4>${t('placed')}</h4><div class="fl">${arr.length?arr.map((f,i)=>`<button class="alt" data-e="${i}">${FURN[f.k].ico} ✎</button>`).join(''):'<small>—</small>'}</div>`);
  el.querySelector('#fz').onclick=()=>{this.cancel();el.style.display='none'};
  el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>this.start(b.dataset.p,-1));el.querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{const i=+b.dataset.e,f=arr[i];this.rebuild(i);this.start(f.k,i,f)});
  el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{if(b.dataset.m==='T'){this.edit.r=(this.edit.r+1)%4;this.sync()}else this.mv(b.dataset.m)});
  if(e){el.querySelector('#fok').onclick=()=>this.commit();el.querySelector('#fst').onclick=()=>{this.edit.store=true;this.cancel()}}},
 // ---- shop screen
 shopUI(id,list,title,stat){const s=SHOPS.find(x=>x.id===id),S=this.c.Save.data;title.textContent=s.ico+' '+t('sh_'+id);stat.textContent=fmt(S.money);list.innerHTML='';
  for(const[k,F]of Object.entries(FURN)){if(!s.cats.includes(F.cat))continue;const r=document.createElement('div');r.className='card';r.innerHTML=`<span style="font-size:30px">${F.ico}</span><div style="flex:1"><b>${t('f_'+k)}</b><br><small>${fmt(F.price)} · ${F.w}×${F.d} m${S.inv[k]?' · ×'+S.inv[k]:''}</small></div><button></button>`;
   const b=r.lastChild;b.textContent=t('buy');b.disabled=S.money<F.price;b.onclick=()=>{S.money-=F.price;S.inv[k]=(S.inv[k]||0)+1;this.c.Save.write();this.c.Snd.play('cash');this.shopUI(id,list,title,stat)};list.append(r)}}
};
