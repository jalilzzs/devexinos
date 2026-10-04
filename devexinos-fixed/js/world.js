/* =====================================================================
   DEVEXINOS / js/world.js
   Procedural mansion + basement: textures, walls, props, items, interactables, custom model routing
   ===================================================================== */
let renderer,scene,camera,flash;
/* =====================================================================
   WORLD: procedural mansion (replaceable with your own GLB files)
   Coordinates: x east, z south, y up. Hall = x[-2,2]. West rooms x[-9,-2],
   east rooms x[2,9]. Basement lives far away at x 50..70 (separate level).
   ===================================================================== */
const COL=[],IN=[],PROPS={},ROOM={},ANIMS=[],ITEMG={},MAPS={},ENTV=[],ENTMIX=[],LOCKERS=[];
let TEX={},MC={},worldReady=false,curRoom='hall',HMAT,hemi,lamps=[],fireLight,bodyG,dust,rcast;
const DOCS=['j1','j2','j3','letter','note'];
const W={}; // named world objects (doors, panels...) for puzzles/animation
const SPOTS={
  house:[[-5.5,2.5,6],[-5.5,2.5,-2],[-5.5,2.5,-10],[0,2.8,5],[0,2.8,-3],[0,2.8,-11],[5.5,2.5,6],[5.5,2.5,-2],[5.5,2.5,-10]],
  base:[[55,2.5,-4],[59,2.5,3],[63,2.5,-3],[68,2.3,0]]};
const ROOMC={bedroom:[-5.5,6],study:[-5.5,-2],kitchen:[-5.5,-10],hall:[0,-2],amira:[5.5,6],gallery:[5.5,-2],chapel:[5.5,-10],basement:[58,0]};

/* ---------- collision & line of sight ---------- */
function blocked(x,z,r){for(const c of COL){if(c.on&&x+r>c.x1&&x-r<c.x2&&z+r>c.z1&&z-r<c.z2)return true}return false}
function slide(o,dx,dz,r){if(!blocked(o.x+dx,o.z,r))o.x+=dx;if(!blocked(o.x,o.z+dz,r))o.z+=dz}
function clearLine(ax,az,ay,bx,bz,by,skip=0){
  const dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz),n=Math.ceil(d/.2);
  for(let i=1;i<n;i++){const f=i/n;if(d*(1-f)<skip)break;const x=ax+dx*f,z=az+dz*f,y=ay+(by-ay)*f;
    for(const c of COL){if(c.on&&c.h>y&&x>c.x1&&x<c.x2&&z>c.z1&&z<c.z2)return false}}return true}
function col(x1,z1,x2,z2,h=1){const c={x1,z1,x2,z2,h,on:true};COL.push(c);return c}

/* ---------- procedural textures ---------- */
function ctex(fn,size=256){const c=document.createElement('canvas');c.width=c.height=size;fn(c.getContext('2d'),size);const x=new THREE.CanvasTexture(c);x.wrapS=x.wrapT=THREE.RepeatWrapping;if(renderer)x.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return x}
function makeTextures(){
  const R=Math.random,sp=(g,s,n,a)=>{for(let i=0;i<n;i++){g.fillStyle=R()<.5?`rgba(0,0,0,${a})`:`rgba(255,255,255,${a*.6})`;g.fillRect(R()*s,R()*s,1+R()*2,1+R()*2)}};
  TEX.wall=ctex((g,s)=>{g.fillStyle='#a39488';g.fillRect(0,0,s,s);for(let x=0;x<s;x+=32){g.fillStyle='rgba(0,0,0,.09)';g.fillRect(x,0,16,s)}sp(g,s,1600,.08);
    for(let i=0;i<4;i++){const x=R()*s,y=R()*s,gr=g.createRadialGradient(x,y,2,x,y,55);gr.addColorStop(0,'rgba(20,10,5,.28)');gr.addColorStop(1,'rgba(20,10,5,0)');g.fillStyle=gr;g.fillRect(0,0,s,s)}});
  TEX.wood=ctex((g,s)=>{g.fillStyle='#8f7455';g.fillRect(0,0,s,s);for(let y=0;y<s;y+=32){const sh=R()*40-20;g.fillStyle=sh>0?`rgba(255,255,255,${sh/180})`:`rgba(0,0,0,${-sh/120})`;g.fillRect(0,y,s,32);
    g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,y,s,2);g.fillRect(R()*s,y,2,32);for(let k=0;k<5;k++){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(R()*s,y+4+R()*24,40+R()*80,1)}}});
  TEX.stone=ctex((g,s)=>{g.fillStyle='#7d7d78';g.fillRect(0,0,s,s);for(let r=0;r<s/64;r++)for(let c=0;c<=s/64;c++){const x=c*64+(r%2?32:0),y=r*64,sh=R()*50-25;g.fillStyle=sh>0?`rgba(255,255,255,${sh/200})`:`rgba(0,0,0,${-sh/130})`;g.fillRect(x,y,64,64);g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=2;g.strokeRect(x,y,64,64)}sp(g,s,1500,.08)});
  TEX.tile=ctex((g,s)=>{for(let i=0;i<s/64;i++)for(let j=0;j<s/64;j++){g.fillStyle=(i+j)%2?'#d8d2c4':'#6e6a60';g.fillRect(i*64,j*64,64,64)}sp(g,s,1800,.1)});
  TEX.rough=ctex((g,s)=>{g.fillStyle='#8a7866';g.fillRect(0,0,s,s);sp(g,s,3500,.14)});
  TEX.concrete=ctex((g,s)=>{g.fillStyle='#7d7d7a';g.fillRect(0,0,s,s);sp(g,s,2500,.1);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;for(let i=0;i<6;i++){g.beginPath();let x=R()*s,y=R()*s;g.moveTo(x,y);for(let k=0;k<6;k++){x+=R()*40-20;y+=R()*40-10;g.lineTo(x,y)}g.stroke()}});
  TEX.portrait=[0,1,2].map(n=>ctex((g,s)=>{g.fillStyle='#1d1610';g.fillRect(0,0,s,s);g.fillStyle='#2e2018';g.beginPath();g.ellipse(s/2,s*.95,s*.34,s*.3,0,0,7);g.fill();
    g.fillStyle='#b9a58c';g.beginPath();g.ellipse(s/2,s*.42,s*.15,s*.2,0,0,7);g.fill();g.fillStyle='#000';[-1,1].forEach(d=>{g.beginPath();g.ellipse(s/2+d*s*.06,s*.4,s*.025,s*.04+(n===1&&d>0?s*.05:0),0,0,7);g.fill()});
    if(n===2){g.fillStyle='rgba(120,10,20,.7)';g.fillRect(s*.3,s*.55,s*.4,s*.04)}sp(g,s,500,.15)},128));
}
function mat(color,o={}){const k=color+JSON.stringify(o);return MC[k]||(MC[k]=new THREE.MeshStandardMaterial(Object.assign({color,roughness:.9,metalness:0},o)))}
function tmat(kind,color){const k='t'+kind+color;return MC[k]||(MC[k]=new THREE.MeshStandardMaterial({map:TEX[kind],color,roughness:.95}))}
function bg(w,h,d,s=2.5){const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv,D=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*D[f][0]/s,uv.getY(k)*D[f][1]/s)}return g}
function plane(x1,z1,x2,z2,y,m,up=true){const w=x2-x1,d=z2-z1,g=new THREE.PlaneGeometry(w,d),uv=g.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/2.5,uv.getY(i)*d/2.5);
  const p=new THREE.Mesh(g,m);p.rotation.x=up?-Math.PI/2:Math.PI/2;p.position.set((x1+x2)/2,y,(z1+z2)/2);p.receiveShadow=true;scene.add(p);return p}

/* ---------- builders ---------- */
function setRoom(n){curRoom=n;if(!ROOM[n]){ROOM[n]=new THREE.Group();scene.add(ROOM[n])}}
function G(x,y,z,ry=0,id=null,room=curRoom){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;(ROOM[room]||scene).add(g);if(id)PROPS[id]=g;return g}
function B(g,w,h,d,px,py,pz,m,cast=true){const b=new THREE.Mesh(bg(w,h,d),m);b.position.set(px,py+h/2,pz);b.castShadow=cast;b.receiveShadow=true;g.add(b);return b}
function Cy(g,r,h,px,py,pz,m,seg=10){const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);c.position.set(px,py+h/2,pz);c.castShadow=true;g.add(c);return c}
function seg(x1,z1,x2,z2,y0,h,m,collide=true){const b=new THREE.Mesh(bg(x2-x1,h,z2-z1),m);b.position.set((x1+x2)/2,y0+h/2,(z1+z2)/2);b.castShadow=b.receiveShadow=true;scene.add(b);if(collide)col(x1,z1,x2,z2,y0+h);return b}
function wallZ(x,za,zb,gaps=[],m=W.wall,h=3.2){let a=za;for(const [g1,g2] of gaps){if(g1>a)seg(x-.15,a,x+.15,g1,0,h,m);seg(x-.15,g1,x+.15,g2,2.4,h-2.4,m,false);a=g2}if(zb>a)seg(x-.15,a,x+.15,zb,0,h,m)}
function wallX(z,xa,xb,gaps=[],m=W.wall,h=3.2){let a=xa;for(const [g1,g2] of gaps){if(g1>a)seg(a,z-.15,g1,z+.15,0,h,m);seg(g1,z-.15,g2,z+.15,2.4,h-2.4,m,false);a=g2}if(xb>a)seg(a,z-.15,xb,z+.15,0,h,m)}
function candle(g,x,y,z){Cy(g,.03,.14,x,y,z,mat(0xd8cdb4));const f=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),new THREE.MeshBasicMaterial({color:0xffb85a}));f.position.set(x,y+.17,z);g.add(f)}
function frame(x,y,z,ry,n){const g=G(x,y,z,ry);const b=B(g,.8,1.1,.06,0,0,0,mat(0x3a2412));const p=new THREE.Mesh(new THREE.PlaneGeometry(.64,.94),new THREE.MeshStandardMaterial({map:TEX.portrait[n%3],roughness:1}));p.position.set(0,.55,.035);g.add(p)}
function bulb(x,y,z){const m=new THREE.Mesh(new THREE.SphereGeometry(.07,8,8),new THREE.MeshBasicMaterial({color:0xffd99a}));m.position.set(x,y,z);scene.add(m);return m}
function addIn(o){o.lv=o.lv||'house';o.when=o.when||(()=>true);const m=new THREE.Mesh(new THREE.BoxGeometry(o.w||.7,o.h||.7,o.d||.7),HMAT);m.position.set(o.x,o.y,o.z);m.visible=false;m.userData.in=o;scene.add(m);o.hit=m;IN.push(o);return o}
function anim(dur,fn,done){ANIMS.push({t:0,d:dur,fn,done})}
const ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
function vis(g,v){if(!g)return;g.visible=v&&!g.userData.custom;if(g.userData.custom)g.userData.custom.visible=v}

/* ---------- item visuals ---------- */
function paper(stain,big){const g=new THREE.Group();B(g,.2,.012,.28,0,0,0,mat(0xd8cdb4,{emissive:0x2e2820}));if(stain)B(g,big?.12:.05,.014,big?.12:.05,.03,0,.03,mat(0x6a0a14,{emissive:0x200004}));return g}
function keyMesh(){const g=new THREE.Group(),m=mat(0x7a3d1d,{roughness:1,metalness:.4,emissive:0x2a1204});const s=Cy(g,.012,.2,0,0,0,m,6);s.rotation.z=Math.PI/2;s.position.set(0,.03,0);const r=new THREE.Mesh(new THREE.TorusGeometry(.04,.012,6,10),m);r.position.set(-.12,.03,0);g.add(r);B(g,.02,.04,.012,.07,0,0,m);return g}
function fuseMesh(){const g=new THREE.Group();Cy(g,.03,.1,0,0,0,mat(0xbfd6d0,{emissive:0x142420,transparent:true,opacity:.8}));Cy(g,.032,.02,0,0,0,mat(0x999999,{metalness:.6}));Cy(g,.032,.02,0,.1,0,mat(0x999999,{metalness:.6}));return g}
const POR=()=>mat(0xe8dccc,{roughness:.5,emissive:0x2a2418});
const MK={
  passport:()=>{const g=new THREE.Group();B(g,.22,.03,.16,0,0,0,mat(0x7a1f2b,{emissive:0x2a0508}));B(g,.07,.032,.07,0,0,0,mat(0xcdb27a,{emissive:0x332a10}));return g},
  id_card:()=>{const g=new THREE.Group();B(g,.17,.01,.11,0,0,0,mat(0x9ec3d6,{emissive:0x142028}));return g},
  key1:keyMesh,key2:keyMesh,fuse1:fuseMesh,fuse2:fuseMesh,
  music_box:()=>{const g=new THREE.Group();B(g,.24,.1,.16,0,0,0,mat(0x5b3a22,{emissive:0x1a0f08}));B(g,.25,.03,.17,0,.1,0,mat(0xcdb27a,{metalness:.5,emissive:0x2a2008}));return g},
  head:()=>{const g=new THREE.Group();const h=new THREE.Mesh(new THREE.SphereGeometry(.12,14,12),POR());h.position.y=.12;g.add(h);[-1,1].forEach(d=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.018,6,6),new THREE.MeshBasicMaterial({color:0x111111}));e.position.set(d*.045,.14,.105);g.add(e)});return g},
  arms:()=>{const g=new THREE.Group();[-1,1].forEach(d=>{const c=Cy(g,.035,.34,0,0,0,POR(),8);c.rotation.z=Math.PI/2;c.position.set(0,.04,d*.07)});return g},
  torso:()=>{const g=new THREE.Group();Cy(g,.1,.3,0,0,0,POR(),10);const s=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),POR());s.position.y=.3;g.add(s);return g},
  legs:()=>{const g=new THREE.Group();[-1,1].forEach(d=>{const c=Cy(g,.045,.4,0,0,0,POR(),8);c.rotation.z=Math.PI/2;c.position.set(0,.05,d*.09)});return g},
  j1:()=>paper(0),j2:()=>paper(0),j3:()=>paper(0),note:()=>paper(0),letter:()=>paper(1,1)
};
function addItem(id,x,y,z,lv,when){
  const g=MK[id]();g.position.set(x,y,z);scene.add(g);PROPS['item_'+id]=g;ITEMG[id]=g;g.userData.when=when||(()=>true);
  addIn({x,y:y+.12,z,w:.7,h:.6,d:.7,lv,label:()=>t(DOCS.includes(id)?'a_read':'a_take')+' · '+t('i_'+id),when:()=>!state.taken[id]&&g.userData.when(),act:()=>take(id)});
}

/* ---------- custom model routing (drag & drop / manifest) ---------- */
function replaceProp(key,gltf){
  const g=PROPS[key];if(!g)return false;
  if(g.userData.custom){scene.remove(g.userData.custom);g.userData.custom=null}
  g.visible=true;g.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(g),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const obj=gltf.scene.clone(true),ms=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  obj.scale.setScalar(Math.min(size.x/(ms.x||1),size.y/(ms.y||1),size.z/(ms.z||1)));
  const mb=new THREE.Box3().setFromObject(obj),mc=mb.getCenter(new THREE.Vector3());
  obj.position.add(new THREE.Vector3(c.x-mc.x,box.min.y-mb.min.y,c.z-mc.z));
  obj.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true}});
  scene.add(obj);g.userData.custom=obj;g.visible=false;return true}
function setMap(name,gltf){
  if(!ROOM[name])return false;ROOM[name].visible=false;if(MAPS[name])scene.remove(MAPS[name]);
  const obj=gltf.scene.clone(true),c=ROOMC[name];obj.position.set(c[0],0,c[1]);obj.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true}});scene.add(obj);MAPS[name]=obj;return true}
function setBody(gltf){
  if(bodyG)scene.remove(bodyG);bodyG=new THREE.Group();const o=gltf.scene.clone(true),b=new THREE.Box3().setFromObject(o);
  o.scale.setScalar(1.75/Math.max(.01,b.max.y-b.min.y));const b2=new THREE.Box3().setFromObject(o);o.position.y-=b2.min.y;bodyG.add(o);scene.add(bodyG)}
function applyModel(base){
  if(!worldReady)return;const m=Assets.models[base];if(!m)return;
  let ok=true;
  if(base==='entity_devexinos')skinEntity(m);
  else if(base==='protagonist')setBody(m);
  else if(base.startsWith('map_'))ok=setMap(base.slice(4),m);
  else ok=replaceProp(base.startsWith('furniture_')?base.slice(10):base,m);
  if(!ok)toast(t('assetBad')+': '+base);
}
function applyAllModels(){Object.keys(Assets.models).forEach(applyModel)}

/* =====================================================================
   buildWorld(): everything is created once, then synced with save state
   ===================================================================== */
function buildWorld(){
  makeTextures();HMAT=new THREE.MeshBasicMaterial({visible:false});
  W.wall=tmat('wall',0x8a7a72);
  const wood=tmat('wood',0xb9a58b),dwood=tmat('wood',0x7a6552),stone=tmat('stone',0x9a9a9a),tile=tmat('tile',0xcfc8b8),conc=tmat('concrete',0x8c8c8c),plaster=tmat('wall',0x5e544e),dk=tmat('rough',0x4a3a30);
  const wd=mat(0x4a3526),wd2=mat(0x2b1f18),cloth=mat(0x6a5f58),metal=mat(0x6d7378,{metalness:.5,roughness:.6}),white=mat(0xcfc9be);

  /* floors, ceiling */
  plane(-9,2,-2,10,0,wood);plane(-9,-6,-2,2,0,dwood);plane(-9,-14,-2,-6,0,tile);plane(2,2,9,10,0,wood);plane(2,-6,9,2,0,dwood);plane(2,-14,9,-6,0,stone);plane(-2,-14,2,10,0,dwood);
  const carpet=new THREE.Mesh(new THREE.PlaneGeometry(1.3,22),mat(0x4a1218,{roughness:1}));carpet.rotation.x=-Math.PI/2;carpet.position.set(0,.012,-2);carpet.receiveShadow=true;scene.add(carpet);
  plane(-9,-14,9,10,3.2,plaster,false);

  /* walls */
  wallZ(-9,-14,10);wallZ(9,-14,10);wallX(10,-9,9);wallX(-14,-9,-2);wallX(-14,-2,2,[[-1,1]]);wallX(-14,2,9);
  wallZ(-2,-14,10,[[-11,-9],[-3,-1],[5,7]]);wallZ(2,-14,10,[[-11,-9],[-3,-1],[5,7]]);
  wallX(2,-9,-2);wallX(2,2,9);wallX(-6,-9,-2);wallX(-6,2,9);

  /* ---------------- HALL ---------------- */
  setRoom('hall');
  frame(-1.84,1.5,-6,Math.PI/2,0);frame(1.84,1.5,-6,-Math.PI/2,1);frame(-1.84,1.5,1,Math.PI/2,2);frame(1.84,1.5,2.5,-Math.PI/2,0);
  const fd=G(0,0,-13.9,0,'door_front');B(fd,1.9,2.4,.1,0,0,0,wd2);B(fd,1.7,.1,.14,0,1.1,0,mat(0x3a2f28,{metalness:.5}));B(fd,.05,.2,.16,.7,1.0,0,mat(0xcdb27a,{metalness:.6}));
  B(fd,1.9,.02,.05,0,0,.07,new THREE.MeshBasicMaterial({color:0xffe9b0}));W.frontDoor=fd;W.frontCol=col(-1,-14.1,1,-13.8,2.4);
  W.sun=new THREE.Mesh(new THREE.PlaneGeometry(14,8),new THREE.MeshBasicMaterial({color:0xfff2c8}));W.sun.position.set(0,2,-17);W.sun.visible=false;scene.add(W.sun);
  addIn({x:0,y:1.2,z:-13.4,w:2,h:2.4,d:.8,label:()=>t('a_door'),act:()=>frontDoorAct()});
  W.hallWall=seg(-2,7.9,2,8.2,0,3.2,W.wall,false);W.hallWall.position.y=3.4;W.hallCol=col(-2,7.9,2,8.2,3.2);W.hallCol.on=false;

  /* ---------------- BEDROOM ---------------- */
  setRoom('bedroom');
  let g=G(-7.4,0,8.3,0,'bed_bedroom');B(g,1.9,.4,2.6,0,0,0,wd);B(g,1.8,.18,2.5,0,.4,0,mat(0x7d6e68));B(g,1.2,.12,.5,0,.58,-1.0,mat(0xb5aaa0));B(g,1.9,1.0,.1,0,0,1.3,wd);col(-8.4,7.0,-6.4,9.6,.6);
  g=G(-8.55,0,6,0,'nightstand_bedroom');B(g,.6,.6,.6,0,0,0,wd);col(-8.85,5.7,-8.25,6.3,.6);
  g=G(-4,0,9.55,0,'dresser_bedroom');B(g,1.4,.9,.5,0,0,0,wd);col(-4.7,9.3,-3.3,9.8,.9);
  g=G(-8.45,0,3.2,0,'wardrobe_bedroom');B(g,.7,2.1,1.1,0,0,0,wd2);col(-8.85,2.65,-8.1,3.75,2.1);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.4),new THREE.MeshBasicMaterial({color:0x1d2a4a}));win.position.set(-8.84,1.8,6.5);win.rotation.y=Math.PI/2;ROOM.bedroom.add(win);
  g=G(-4,0,3.2);B(g,.8,.5,.8,0,0,0,cloth);col(-4.4,2.8,-3.6,3.6,.5);

  /* ---------------- STUDY ---------------- */
  setRoom('study');
  g=G(-7.5,0,-3.5,0,'desk_study');B(g,.8,.8,1.7,0,0,0,wd);col(-7.9,-4.35,-7.1,-2.65,.8);
  g=G(-6.5,0,-3.5);B(g,.5,.5,.5,0,0,0,wd2);col(-6.75,-3.75,-6.25,-3.25,.5);
  g=G(-8.5,0,-0.4,0,'bookshelf_study');B(g,.4,2.2,2.2,0,0,0,wd2);for(let i=0;i<6;i++)B(g,.3,.3,1.9,.05,.2+i*.35,0,mat(i%2?0x5a2a24:0x2a3a2c));col(-8.85,-1.5,-8.15,.7,2.2);
  g=G(-5.5,0,-5.72,0,'safe_study');B(g,.8,.8,.25,0,.95,0,metal);W.safeDoor=new THREE.Group();W.safeDoor.position.set(-.3,1.35,.15);g.add(W.safeDoor);B(W.safeDoor,.6,.6,.05,.3,-.3,0,mat(0x555b60,{metalness:.7,roughness:.4}));
  const dial=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.04,12),mat(0xcdb27a,{metalness:.6}));dial.rotation.x=Math.PI/2;dial.position.set(.3,0,.04);W.safeDoor.add(dial);
  addIn({x:-5.5,y:1.35,z:-5.5,w:1,h:1,d:.7,label:()=>t('a_safe'),when:()=>!state.f.safe,act:()=>openKeypad()});
  /* shifting bookcase panel that blocks the study doorway until the first journal is read */
  W.shiftWall=seg(-2.12,-3,-1.88,-1,0,3.2,dk,false);W.shiftCol=col(-2.2,-3,-1.8,-1,3.2);

  /* ---------------- KITCHEN (+ storeroom) ---------------- */
  setRoom('kitchen');
  g=G(-5,0,-9.5,0,'table_kitchen');B(g,1.6,.8,.9,0,0,0,wd);col(-5.8,-9.95,-4.2,-9.05,.8);
  g=G(-8.4,0,-8,0,'counter_kitchen');B(g,.7,.9,2.6,0,0,0,mat(0x5d5a54));col(-8.85,-9.3,-8.05,-6.7,.9);
  g=G(-4.2,0,-6.6,0,'stove_kitchen');B(g,.9,1.0,.7,0,0,0,mat(0x1e1e20,{metalness:.4}));col(-4.65,-6.95,-3.75,-6.25,1);
  wallX(-11.5,-9,-6,[[-8.2,-7.2]]);wallZ(-6,-14,-11.5);
  W.storeDoor=seg(-8.2,-11.65,-7.2,-11.35,0,2.4,wd2,false);W.storeCol=col(-8.2,-11.65,-7.2,-11.35,2.4);
  g=G(-8,0,-13,0,'table_store');B(g,1.1,.8,.6,0,0,0,wd);col(-8.55,-13.3,-7.45,-12.7,.8);
  const bd=G(-4,0,-13.85,0,'door_basement');B(bd,1,2.2,.12,0,0,0,mat(0x2a1a12));B(bd,1,.1,.14,0,.7,0,mat(0x3a3a3a,{metalness:.7}));B(bd,1,.1,.14,0,1.6,0,mat(0x3a3a3a,{metalness:.7}));
  addIn({x:-4,y:1.1,z:-13.4,w:1.4,h:2.2,d:.8,label:()=>t('a_down'),act:()=>goLevel('base',53.6,5,-Math.PI/2)});
  addIn({x:-7.7,y:1.1,z:-11.1,w:1.4,h:2.2,d:.9,label:()=>t('a_store'),when:()=>!state.f.store,act:()=>storeAct()});

  /* ---------------- AMIRA'S ROOM ---------------- */
  setRoom('amira');
  g=G(7.5,0,8.3,0,'bed_amira');B(g,1.9,.4,2.6,0,0,0,wd);B(g,1.8,.18,2.5,0,.4,0,mat(0xc9c2b8));B(g,1.2,.12,.5,0,.58,-1.0,mat(0xe0dad0));B(g,1.9,1.1,.1,0,0,1.3,wd);B(g,.9,.04,1.3,-.1,.58,.4,mat(0xf0ece2,{emissive:0x1a1814}));col(6.5,7.0,8.5,9.6,.6);
  g=G(8.55,0,5,0,'dresser_amira');B(g,.5,.9,1.4,0,0,0,wd);col(8.3,4.3,8.85,5.7,.9);
  g=G(4.5,0,9.55,0,'vanity_amira');B(g,1.2,.8,.5,0,0,0,wd);B(g,.8,.9,.04,0,.8,.2,mat(0x9fb0b8,{metalness:.8,roughness:.2}));col(3.9,9.3,5.1,9.8,.8);
  g=G(6,0,8.6);candle(g,0,0,0);
  const win2=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.4),new THREE.MeshBasicMaterial({color:0x1d2a4a}));win2.position.set(8.84,1.8,6.5);win2.rotation.y=-Math.PI/2;ROOM.amira.add(win2);

  /* ---------------- GALLERY (stealth zone) ---------------- */
  setRoom('gallery');
  const part=(x,za,zb)=>{const m=seg(x-.15,za,x+.15,zb,0,2.4,dk);m.castShadow=true};
  part(3.8,-3.5,2);part(5.6,-6,-0.5);part(7.4,-3.5,2);
  for(let i=0;i<4;i++)frame(3.65,1.4,-2.8+i*1.3,-Math.PI/2,i);
  frame(5.45,1.4,-4,-Math.PI/2,1);frame(5.75,1.4,-3,Math.PI/2,2);frame(7.25,1.4,-1,-Math.PI/2,0);frame(8.84,1.5,-3,-Math.PI/2,1);frame(2.16,1.5,0.6,Math.PI/2,2);
  g=G(6.5,0,1.3,0,'table_gallery');B(g,.6,.6,.6,0,0,0,wd);col(6.2,1,6.8,1.6,.6);
  [[2.8,1.5,0,2.8,.6,1.2,2.8,-.9,.6],[8.1,-5.5,Math.PI,8.1,-4.5,-5.2,8.1,-4.5,-4.5]].forEach((L,i)=>{
    const lg=G(L[0],0,L[1],L[2],'locker_gallery'+(i+1));B(lg,.8,2,.6,0,0,0,metal);B(lg,.6,.5,.02,0,1.3,i?.3:-.3,mat(0x222426));col(L[0]-.4,L[1]-.3,L[0]+.4,L[1]+.3,2);
    LOCKERS.push({x:L[0],z:L[1],yaw:L[2],ox:L[3],oz:L[4]});
    addIn({x:L[0],y:1.1,z:L[1]+(i?.55:-.55),w:1,h:2,d:.9,label:()=>t(P.hidden?'a_unhide':'a_hide'),act:()=>toggleHide(i)})});

  /* ---------------- CHAPEL ---------------- */
  setRoom('chapel');
  for(let r=0;r<3;r++)[[4.1],[7.2]].forEach(([x])=>{const pg=G(x,0,-8.2-r*1.4,0,r===0&&x===4.1?'pews_chapel':null);B(pg,2.2,.5,.5,0,0,0,wd);B(pg,2.2,.9,.1,0,0,.25,wd);col(x-1.1,-8.45-r*1.4,x+1.1,-7.95-r*1.4,.9)});
  g=G(5.5,0,-13.1,0,'altar_chapel');B(g,2.4,1.0,1.0,0,0,0,tmat('stone',0x8a8a86));col(4.3,-13.6,6.7,-12.6,1);
  W.slab=B(g,2.4,.14,1.0,0,1.0,0,tmat('stone',0x6a6a68));W.slabG=g;
  const rec=B(g,.34,.04,.26,-.7,1.0,.52,mat(0xcdb27a,{emissive:0x4a3a10,metalness:.5}));
  [-1,1].forEach(d=>{candle(g,d*1.0,1.14,-.3);candle(g,d*1.0,0,.9)});
  addIn({x:5.5,y:1.1,z:-12.6,w:2.6,h:1.3,d:1.1,label:()=>t('a_altar'),when:()=>!state.f.altar,act:()=>altarAct()});

  /* ---------------- BASEMENT ---------------- */
  setRoom('basement');
  plane(50,-8,66,8,0,conc);plane(66,-2,70,2,0,conc);plane(50,-8,70,8,2.8,tmat('concrete',0x555555),false);
  const bw=tmat('concrete',0x777777);
  wallZ(50,-8,8,[],bw,2.8);wallX(-8,50,66,[],bw,2.8);wallX(8,50,66,[],bw,2.8);wallZ(66,-8,8,[[-2,2]],bw,2.8);
  wallX(-2,66,70,[],bw,2.8);wallX(2,66,70,[],bw,2.8);wallZ(70,-2,2,[],bw,2.8);
  for(let i=0;i<8;i++)B(G(0,0,0),.3,.3*(i+1),1.6,52.25-.3*i,0,5,bw);col(50,4.2,52.4,5.8,2.4);
  addIn({x:52.9,y:1.2,z:5,w:1,h:2.4,d:1.8,lv:'base',label:()=>t('a_up'),act:()=>goLevel('house',-4,-12.4,Math.PI)});
  g=G(50.2,0,-3.5,0,'fusebox');B(g,.2,.95,.8,0,.7,0,mat(0x4c5a52,{metalness:.4}));W.fuseLeds=[0,1,2,3].map(i=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),new THREE.MeshBasicMaterial({color:0x330000}));l.position.set(.12,1.4,-.25+i*.17);g.add(l);return l});
  addIn({x:50.5,y:1.3,z:-3.5,w:.8,h:1.2,d:1.2,lv:'base',label:()=>t('a_fuse'),act:()=>openFuse()});
  g=G(58,0,-3,0,'table_ritual');B(g,2.6,.9,1.2,0,0,0,tmat('stone',0x8c8c88));col(56.7,-3.6,59.3,-2.4,.9);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.9,2.1,40),new THREE.MeshBasicMaterial({color:0x7a1018,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(58,.02,-3);scene.add(ring);
  W.fireG=new THREE.Group();W.fireG.position.set(58,.9,-3);W.fireG.visible=false;scene.add(W.fireG);
  [[0,.3],[.25,.2],[-.25,.22],[.1,.18]].forEach(([x,h])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(.12,h*2,6),new THREE.MeshBasicMaterial({color:x?0xff8a2a:0xffc24a}));c.position.set(x,h,0);W.fireG.add(c)});
  W.doll=new THREE.Group();W.doll.position.set(58,.92,-3);W.doll.visible=false;scene.add(W.doll);
  ['head','arms','torso','legs'].forEach((p,i)=>{const m=MK[p]();m.position.set(0,[.65,.45,.3,.05][i],0);if(p==='arms'||p==='legs')m.rotation.y=Math.PI/2;W.doll.add(m)});
  W.doll.rotation.z=Math.PI/2;W.doll.scale.setScalar(2.2);
  addIn({x:58,y:1.1,z:-3,w:2.8,h:1.4,d:1.6,lv:'base',label:()=>t(state.f.doll?'a_ritual':(PARTS.every(p=>state.inv.includes(p))?'a_fusedoll':'a_table')),when:()=>!state.f.burned,act:()=>tableAct()});
  W.torsoDoor=seg(65.85,-2,66.15,2,0,2.6,tmat('concrete',0x666666),false);W.torsoCol=col(65.8,-2,66.2,2,2.6);
  B(G(0,0,0),.1,2.4,.1,65.7,0,-1.9,mat(0xd8b020));
  g=G(68.6,0,0,0,'pedestal_torso');B(g,.6,.9,.6,0,0,0,tmat('stone',0x7a7a76));
  g=G(60,0,5.5);W.rug=B(g,3,.03,2,0,0,0,mat(0x5a1a20,{roughness:1}));W.hatch=new THREE.Group();W.hatch.position.set(60,0,5.5);W.hatch.visible=false;scene.add(W.hatch);
  const hd=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.05,16),mat(0x3b3f44,{metalness:.7,roughness:.5}));hd.position.y=.03;W.hatch.add(hd);const hr=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,12),mat(0x8a8d90,{metalness:.8}));hr.rotation.x=Math.PI/2;hr.position.y=.08;W.hatch.add(hr);
  for(let i=0;i<5;i++)B(G(0,0,0),.8,.8,.8,52+i*2.4,0,-7.2+(i%2)*.3,mat(0x4a3c2e));
  col(51.6,-7.6,52.4,-6.8,.8);col(54,-7.6,54.8,-6.8,.8);col(56.4,-7.6,57.2,-6.8,.8);col(58.8,-7.6,59.6,-6.8,.8);col(61.2,-7.6,62,-6.8,.8);
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,16,8),metal);pipe.rotation.z=Math.PI/2;pipe.position.set(58,2.5,7.6);scene.add(pipe);

  /* ---------------- ITEMS ---------------- */
  addItem('passport',-8.55,.6,5.85,'house');addItem('id_card',-4,.9,9.55,'house');addItem('j1',-8.55,.6,6.15,'house');
  addItem('j3',-7.5,.81,-3.5,'house');addItem('j2',4.5,.81,9.55,'house');addItem('letter',8.55,.9,4.6,'house');
  addItem('music_box',8.55,.9,5,'house');addItem('fuse2',6,.02,8.6,'house');addItem('fuse1',-8.4,.9,-8,'house');addItem('note',-5,.81,-9.5,'house');
  addItem('key1',6.5,.6,1.3,'house');addItem('key2',8.1,.02,1,'house');
  addItem('head',-5.5,1.15,-5.55,'house',()=>state.f.safe);addItem('arms',-8,.82,-13,'house',()=>state.f.store);
  addItem('torso',68.6,.9,0,'base',()=>state.f.torsoDoor);addItem('legs',5.5,1.02,-13.1,'house',()=>state.f.altar);

  /* ---------------- LIGHTING / ENV ---------------- */
  hemi=new THREE.HemisphereLight(0x303050,0x181010,.5);scene.add(hemi);
  flash=new THREE.SpotLight(0xfff0c8,1.8,16,.5,.55,1.2);flash.position.set(0,0,0);flash.target.position.set(0,0,-1);camera.add(flash,flash.target);
  for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffc27a,0,9,2);scene.add(l);lamps.push(l)}
  fireLight=new THREE.PointLight(0xff7a22,0,10,2);scene.add(fireLight);
  SPOTS.house.forEach(s=>bulb(s[0],s[1],s[2]));
  const N=240,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=-9+Math.random()*18;pos[i*3+1]=Math.random()*3;pos[i*3+2]=-14+Math.random()*24}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(pos,3));dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xaa9988,size:.025,transparent:true,opacity:.5}));scene.add(dust);

  /* ---------------- ENTITIES ---------------- */
  [0,1].forEach(()=>{const v=new THREE.Group();v.add(makeEntityModel());v.visible=false;scene.add(v);ENTV.push(v)});
  W.dollS=2.2;
  ['nightstand_bedroom','dresser_bedroom','desk_study','table_kitchen','counter_kitchen','table_store','dresser_amira','vanity_amira','table_gallery','safe_study','altar_chapel','fusebox','table_ritual','pedestal_torso','door_basement','door_front','locker_gallery1','locker_gallery2'].forEach(id=>{if(PROPS[id])PROPS[id].userData.host=true});
  buildNav();worldReady=true;applyAllModels();
}


function setEnv(lv){
  if(!scene)return;const base=lv==='base';
  scene.background=new THREE.Color(base?0x010102:0x050306);scene.fog=new THREE.FogExp2(base?0x010102:0x050306,base?.17:.13);
  hemi.intensity=base?(state.f.power?.4:0):.5;
}

function refreshWorld(){for(const id in ITEMG)vis(ITEMG[id],!state.taken[id]&&ITEMG[id].userData.when());syncDoors();ledSync();if(typeof phoneCheckNew==='function')phoneCheckNew()}
function syncDoors(){
  const f=state.f;
  W.shiftWall.position.z=-2+(f.shifted?2.1:0);W.shiftCol.on=!f.shifted;
  W.hallWall.position.y=f.hallShut?1.6:5;W.hallCol.on=!!f.hallShut;
  W.storeDoor.position.x=-7.7-(f.store?1:0);W.storeCol.on=!f.store;
  W.safeDoor.rotation.y=f.safe?-1.9:0;W.slab.position.x=f.altar?2:0;
  W.torsoDoor.position.y=1.3+(f.torsoDoor?2.8:0);W.torsoCol.on=!f.torsoDoor;
  W.doll.visible=!!f.doll&&!f.burned;W.doll.position.y=.92+(f.doll?.35:0);W.doll.scale.setScalar(W.dollS||2.2);
  W.fireG.visible=false;W.frontDoor.position.x=0;W.frontCol.on=true;W.sun.visible=false;W.rug.visible=true;W.hatch.visible=false;
  ent.on=!f.burned;
}


/* ---------- three.js scene bootstrap ---------- */
function initScene(){
  if(renderer||!hasThree)return;
  renderer=new THREE.WebGLRenderer({canvas:el('c'),antialias:S.gfx==='high',powerPreference:'high-performance'});
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,40);camera.rotation.order='YXZ';scene.add(camera);
  rcast=new THREE.Raycaster();rcast.far=3;
  buildWorld();setEnv('house');applyGfx();refreshWorld();loadDressing();
}



/* =====================================================================
   MODEL DRESSING: your GLB rooms (assets/models/*.glb)
   ---------------------------------------------------------------------
   The procedural mansion stays as the game's skeleton (walls, collisions,
   doors, puzzles). Each model below DRESSES one room: its floor and props are
   shown, its own walls/ceiling are hidden (the mansion's walls are used), and
   the procedural furniture is hidden, except "host" pieces that carry items or
   puzzles (nightstand, desk, safe, altar, fuse box...).
   Tuning knobs per entry:  scale (metres per model unit), align ('east' =
   toward the hall for west rooms, 'west' for east rooms), rotate ('auto'),
   hideNames (regex of node names to hide), hideShell (auto-hide walls and
   ceiling), gain (brightness boost), heavy (skipped on Medium graphics).
   Live tweak from the browser console:  DVX.apply('bedroom',{scale:0.012})
   ===================================================================== */
const MODEL_DIR='assets/models/';
const ROOMRECT={bedroom:[-8.85,2.15,-2.15,9.85],study:[-8.85,-5.85,-2.15,1.85],kitchen:[-8.85,-13.85,-2.15,-6.15],amira:[2.15,2.15,8.85,9.85],hall:[-1.85,-13.85,1.85,9.85]};
const MODEL_PLAN=[
  /* long loop corridor -> the hall. Straight 109-unit section (model x 27.7..136.7, z -209.6..-197.9) is rotated onto the hall's N-S axis and clipped to the hall.
     Its modular wall pieces are named "duvar*" (Turkish for wall): hidden, the mansion's wallpaper walls are used. 1 model unit = 0.316 m here. */
  {id:'hall',file:'house_corridor_interior.glb',kind:'strip',room:'hall',strip:{x1:27.7,z1:-209.6,x2:136.7,z2:-197.9},floorY:4.8,width:3.7,hideNames:/duvar/i,keepDecor:true,gain:1.7},
  /* old_room: units are centimetres -> 0.01 */
  {id:'bedroom',file:'old_room.glb',kind:'room',room:'bedroom',scale:0.01,align:'east',hideShell:true,gain:1.8},
  /* old_living_room: ceiling ~154 units ~ 3.1 m -> 0.02 */
  {id:'study',file:'old_living_room.glb',kind:'room',room:'study',scale:0.02,align:'east',hideShell:true,gain:1.8,heavy:true},
  /* an_old_cheap_room_in_chinatown: already in metres; rotated to fit if that helps */
  {id:'amira',file:'an_old_cheap_room_in_chinatown.glb',kind:'room',room:'amira',scale:1,align:'west',rotate:'auto',hideShell:true,gain:1.6,heavy:true},
  /* horror_scene: a low-poly house shell + TV, table, hanging light, gas tank, crates (~0.003 m per unit). The "house" shell is hidden. */
  {id:'kitchen',file:'horror_scene.glb',kind:'room',room:'kitchen',scale:0.003,align:'east',hideNames:/house/i,gain:1.8},
  /* nameless_doll: replaces the four floating doll parts on the ritual table */
  {id:'doll',file:'nameless_doll.glb',kind:'doll',length:1.1,gain:1.6}
];
const DRESS={status:{},gltf:{},roots:{},busy:false,t:0};
const V3=()=>new THREE.Vector3();
function loadDressing(){
  if(!worldReady||!hasThree||!THREE.GLTFLoader)return;
  const loader=new THREE.GLTFLoader();
  MODEL_PLAN.forEach(plan=>{
    const st=DRESS.status[plan.id];if(st==='ok'||st==='loading')return;
    if(plan.heavy&&S.gfx!=='high'){DRESS.status[plan.id]='skipped (Medium graphics)';return}
    DRESS.status[plan.id]='loading';
    loader.load(MODEL_DIR+plan.file,g=>{
      DRESS.gltf[plan.id]=g;
      try{dressApply(plan,g);DRESS.status[plan.id]='ok'}catch(e){DRESS.status[plan.id]='error: '+e.message;console.error('[DVX] dressing '+plan.id,e)}
      dressReport();
    },null,err=>{
      DRESS.status[plan.id]='failed to load '+MODEL_DIR+plan.file+(location.protocol==='file:'?' (open the game through http://, not file://)':' (check the path and upper/lower case)');
      console.error('[DVX] '+plan.file,err);dressReport();
    });
  });
}
function dressReport(){
  const ids=MODEL_PLAN.map(p=>p.id),ok=ids.filter(i=>DRESS.status[i]==='ok').length,pending=ids.filter(i=>DRESS.status[i]==='loading').length,bad=ids.filter(i=>/^(failed|error)/.test(DRESS.status[i]||''));
  console.log('[DVX] models',DRESS.status);
  if(!pending)toast('Models: '+ok+'/'+ids.length+' loaded'+(bad.length?' · see console (F12)':''));
}
function nameMatch(obj,re){for(let o=obj;o;o=o.parent){if(o.name&&re.test(o.name))return true}return false}
function measure(root){
  root.updateMatrixWorld(true);
  const meshes=[];root.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m)});
  const U=new THREE.Box3();meshes.forEach(m=>U.expandByObject(m));
  const us=U.getSize(V3());let floor=null,fa=0;
  meshes.forEach(m=>{const b=new THREE.Box3().setFromObject(m),sz=b.getSize(V3());
    if(sz.y<=Math.max(.08,us.y*.04)&&b.min.y<=U.min.y+us.y*.15){const a=sz.x*sz.z;if(a>fa){fa=a;floor=b}}});
  return {meshes,U,us,F:floor||U};
}
function dressMaterials(root,o,planes){
  const gain=o.gain||1.7;
  root.traverse(m=>{
    if(!m.isMesh)return;m.castShadow=false;m.receiveShadow=true;
    (Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{
      if(!mt)return;
      mt.side=THREE.DoubleSide;if(mt.metalness>.5)mt.metalness=.25;               // no env-map in this scene: metal would render black
      const col=mt.color||(mt.uniforms&&mt.uniforms.diffuse&&mt.uniforms.diffuse.value);
      if(col&&!mt.userData.gained){col.multiplyScalar(gain);mt.userData.gained=1}  // sRGB textures + linear output + dim lights: lift them
      if(planes){mt.clippingPlanes=planes;mt.clipShadows=true}
      mt.needsUpdate=true;
    });
  });
}
function hideDecor(room,keep){
  if(keep||!ROOM[room])return;
  ROOM[room].children.forEach(g=>{if(!g.userData.host)g.visible=false});
}
function dressApply(plan,gltf,over){
  const o=Object.assign({},plan,over||{}),root=gltf.scene;
  if(DRESS.roots[o.id]&&DRESS.roots[o.id]!==root)scene.remove(DRESS.roots[o.id]);
  root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);
  root.traverse(m=>{if(m.isMesh)m.visible=true});
  if(o.kind==='strip')dressStrip(o,root);else if(o.kind==='doll')dressDoll(o,root);else dressRoom(o,root);
  DRESS.roots[o.id]=root;
}
function dressRoom(o,root){
  const rect=ROOMRECT[o.room],rw=rect[2]-rect[0]-.1,rd=rect[3]-rect[1]-.1;
  root.scale.setScalar(o.scale||1);
  root.traverse(m=>{if(m.isMesh&&o.hideNames&&nameMatch(m,o.hideNames))m.visible=false});
  let M=measure(root);
  if(o.rotate==='auto'){const sx=M.F.getSize(V3()),f0=Math.min(rw/sx.x,rd/sx.z),f90=Math.min(rw/sx.z,rd/sx.x);if(f90>f0){root.rotation.y=Math.PI/2;M=measure(root)}}
  const fs=M.F.getSize(V3()),fit=Math.min(rw/fs.x,rd/fs.z);
  if(fit<1){root.scale.multiplyScalar(fit*.98);M=measure(root)}                    // never bigger than the room
  const fc=M.F.getCenter(V3()),fz=M.F.getSize(V3()),cx=(rect[0]+rect[2])/2,cz=(rect[1]+rect[3])/2;
  let tx=cx;if(o.align==='east')tx=rect[2]-.05-fz.x/2;else if(o.align==='west')tx=rect[0]+.05+fz.x/2;
  root.position.set(tx-fc.x,.03-M.F.min.y,cz-fc.z);
  M=measure(root);
  if(o.hideShell){                                                                  // hide the model's own walls and ceiling
    M.meshes.forEach(m=>{const b=new THREE.Box3().setFromObject(m),sz=b.getSize(V3()),us=M.us;
      const wall=sz.y>=us.y*.5&&((sz.x<=us.x*.06&&sz.z>=us.z*.35)||(sz.z<=us.z*.06&&sz.x>=us.x*.35));
      const ceil=sz.y<=us.y*.05&&b.min.y>=M.U.min.y+us.y*.75&&sz.x>=us.x*.35&&sz.z>=us.z*.35;
      if(wall||ceil)m.visible=false})}
  dressMaterials(root,o,null);
  scene.add(root);root.userData.center=[M.F.getCenter(V3()).x,M.F.getCenter(V3()).z];root.userData.room=o.room;
  hideDecor(o.room,o.keepDecor);
  console.log('[DVX] '+o.id+': scale',root.scale.x.toFixed(4),'floor',M.F.getSize(V3()).toArray().map(v=>+v.toFixed(2)),'at',root.position.toArray().map(v=>+v.toFixed(2)));
}
function dressStrip(o,root){
  const st=o.strip,s=o.width/(st.z2-st.z1),cx=(st.x1+st.x2)/2,cz=(st.z1+st.z2)/2;
  root.scale.setScalar(s);root.rotation.y=-Math.PI/2;                                // model +x -> hall +z (south)
  root.position.set(cz*s,.03-o.floorY*s,-2-cx*s);
  root.traverse(m=>{if(m.isMesh&&o.hideNames&&nameMatch(m,o.hideNames))m.visible=false});
  const planes=[new THREE.Plane(new THREE.Vector3(1,0,0),1.95),new THREE.Plane(new THREE.Vector3(-1,0,0),1.95),new THREE.Plane(new THREE.Vector3(0,0,1),13.9),new THREE.Plane(new THREE.Vector3(0,0,-1),9.9)];
  dressMaterials(root,o,planes);
  scene.add(root);root.userData.center=[0,-2];root.userData.room='hall';root.userData.always=true;
  hideDecor('hall',o.keepDecor);
  console.log('[DVX] hall strip: scale',s.toFixed(4));
}
function dressDoll(o,root){
  root.updateMatrixWorld(true);
  const sz=new THREE.Box3().setFromObject(root).getSize(V3()),L=Math.max(sz.x,sz.y,sz.z)||1;
  if(sz.z>=sz.x&&sz.z>=sz.y)root.rotation.y=Math.PI/2;else if(sz.y>=sz.x&&sz.y>=sz.z)root.rotation.z=-Math.PI/2;   // longest axis along the table
  root.scale.setScalar((o.length||1.1)/L);root.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(root),c=b.getCenter(V3());
  root.position.set(-c.x,-b.min.y,-c.z);
  W.doll.children.slice().forEach(ch=>W.doll.remove(ch));                           // remove the 4 procedural parts
  W.doll.scale.setScalar(1);W.doll.rotation.set(0,0,0);W.dollS=1;
  dressMaterials(root,o,null);W.doll.add(root);root.userData.always=true;
  W.doll.position.y=.92+(state.f&&state.f.doll?.35:0);
}
/* keep draw calls low: only render a dressed room while the player is near it */
function updateDressing(dt){
  DRESS.t-=dt;if(DRESS.t>0)return;DRESS.t=.4;
  for(const id in DRESS.roots){const r=DRESS.roots[id];if(!r||r.userData.always||!r.userData.center)continue;
    r.visible=P.lv==='house'&&Math.hypot(P.x-r.userData.center[0],P.z-r.userData.center[1])<16}
  if(DRESS.roots.hall)DRESS.roots.hall.visible=P.lv==='house';
}
window.DVX={models:DRESS,plan:MODEL_PLAN,report:dressReport,apply:(id,over)=>{const p=MODEL_PLAN.find(x=>x.id===id),g=DRESS.gltf[id];if(!p||!g)return console.warn('model not loaded',id);dressApply(p,g,over);refreshWorld()}};
