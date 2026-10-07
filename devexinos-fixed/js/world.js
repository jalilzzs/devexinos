/* =====================================================================
   DEVEXINOS / js/world.js
   The house is built around your baked GLB rooms (assets/models/*.glb, made by
   tools/build_world.py). This file loads them, builds collision from the baked
   grids (LAYOUT, js/layout.js) and adds the remaining procedural pieces:
   hall end caps + door frames, the chapel (no model yet), props, items, lights.
   Coordinates: x east, z south, y up.  Hall = x[-2,2], z[-14,10].
   West rooms (x<-2): kitchen, study, bedroom.  East rooms: chapel, gallery (long), Amira.
   Basement = far away at x ~ 40..70 (separate level).
   ===================================================================== */
let renderer,scene,camera,flash;
const COL=[],GRIDS=[],IN=[],PROPS={},ROOM={},ANIMS=[],ITEMG={},ENTV=[],ENTMIX=[],LOCKERS=[];
let TEX={},MC={},worldReady=false,curRoom='hall',HMAT,hemi,lamps=[],fireLight,bodyG=null,dust,rcast;
const DOCS=['j1','j2','j3','letter','note'];
const W={}; // named world objects (doors, panels...) for puzzles/animation
const SPOTS={
  house:[[-5,2.6,3.4],[-5,2.6,-3],[-5,2.6,-8],[0,2.8,5],[0,2.8,-3],[0,2.8,-11],[6,2.1,3.5],[5,2.2,-3.5],[10,2.2,-3.5],[14,2.2,-3.5],[5.5,2.6,-10.5]],
  base:[]};

/* ---------- collision & line of sight ---------- */
/* A point is blocked if a procedural box (COL) contains it, or if a baked grid marks it solid,
   or if it lies inside a baked grid's area but on no floor (the void around the models). */
function gridBlocked(px,pz){
  let inGrid=false,claimed=false;
  for(const g of GRIDS){
    const i=Math.floor((px-g.x0)/g.cs),j=Math.floor((pz-g.z0)/g.cs);
    if(i<0||j<0||i>=g.nx||j>=g.nz)continue;
    const k=j*g.nx+i;if(g.solid[k])return true;
    if(!g.solidOnly){inGrid=true;if(g.floor[k])claimed=true}
  }
  return inGrid&&!claimed;
}
const RING=[[1,0],[.707,.707],[0,1],[-.707,.707],[-1,0],[-.707,-.707],[0,-1],[.707,-.707]];
function blocked(x,z,r){
  for(const c of COL){if(c.on&&x+r>c.x1&&x-r<c.x2&&z+r>c.z1&&z-r<c.z2)return true}
  if(GRIDS.length){if(gridBlocked(x,z))return true;for(const d of RING)if(gridBlocked(x+d[0]*r,z+d[1]*r))return true}
  return false;
}
function slide(o,dx,dz,r){if(!blocked(o.x+dx,o.z,r))o.x+=dx;if(!blocked(o.x,o.z+dz,r))o.z+=dz}
function gridSolid(px,pz){for(const g of GRIDS){const i=Math.floor((px-g.x0)/g.cs),j=Math.floor((pz-g.z0)/g.cs);if(i>=0&&j>=0&&i<g.nx&&j<g.nz&&g.solid[j*g.nx+i])return true}return false}
function clearLine(ax,az,ay,bx,bz,by,skip=0,useGrid=false){
  const dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz),n=Math.ceil(d/.2);
  for(let i=1;i<n;i++){const f=i/n;if(d*(1-f)<skip)break;const x=ax+dx*f,z=az+dz*f,y=ay+(by-ay)*f;
    for(const c of COL){if(c.on&&c.h>y&&x>c.x1&&x<c.x2&&z>c.z1&&z<c.z2)return false}
    if(useGrid&&y>.25&&y<1.75&&gridSolid(x,z))return false}
  return true}
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


/* =====================================================================
   MODELS: baked GLBs (see tools/build_world.py). They are already in game
   coordinates, so they are simply added at the origin. Collision comes from
   LAYOUT.grids (baked from the same geometry).
   ===================================================================== */
const MODEL_DIR='assets/models/';
const MODEL_GAIN=1.7;                    // brighten textures: the game is deliberately dark and has no env-map
const DRESS={status:{},roots:{},t:0};
const ENT_SCALE=2.1/1.69,ENT_YAW=0;      // creature: 1.69 m tall in the file; faces +Z (verified from its "headfront" joint)
let ENT_ACT=null;
const V3=()=>new THREE.Vector3();
function dressMaterials(root,gain){
  root.traverse(m=>{
    if(!m.isMesh)return;m.castShadow=false;m.receiveShadow=false;m.frustumCulled=false;
    (Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{
      if(!mt)return;mt.side=THREE.DoubleSide;if(mt.metalness>.5)mt.metalness=.25;
      if(mt.color&&!mt.userData.gained){mt.color.multiplyScalar(gain);mt.userData.gained=1}
      mt.needsUpdate=true});
  });
}
function loadModels(){
  if(!worldReady||!hasThree||!THREE.GLTFLoader)return;
  const loader=new THREE.GLTFLoader();
  const jobs=Object.keys(LAYOUT.models).map(id=>({id,file:LAYOUT.models[id],kind:'room'}));
  jobs.push({id:'doll',file:'nameless_doll.glb',kind:'doll'},{id:'devexinos',file:'demonic_runner.glb',kind:'entity'});
  jobs.forEach(j=>{
    if(DRESS.status[j.id]==='ok'||DRESS.status[j.id]==='loading')return;
    DRESS.status[j.id]='loading';
    loader.load(MODEL_DIR+j.file,g=>{
      try{
        if(j.kind==='room'){dressMaterials(g.scene,MODEL_GAIN);scene.add(g.scene);DRESS.roots[j.id]=g.scene;const gr=GRIDS.find(q=>q.name===j.id);g.scene.userData.c=gr?[gr.x0+gr.nx*gr.cs/2,gr.z0+gr.nz*gr.cs/2]:null;g.scene.userData.lv=j.id==='basement'?'base':'house'}
        else if(j.kind==='doll')dressDoll(g);
        else skinEntity(g);
        DRESS.status[j.id]='ok';
      }catch(e){DRESS.status[j.id]='error: '+e.message;console.error('[DVX] '+j.id,e)}
      dressReport();
    },null,err=>{DRESS.status[j.id]='failed '+MODEL_DIR+j.file+(location.protocol==='file:'?' (use http://, not file://)':' (check path/case)');console.error('[DVX] '+j.file,err);dressReport()});
  });
}
function dressReport(){
  const ids=Object.keys(DRESS.status),ok=ids.filter(i=>DRESS.status[i]==='ok').length,pending=ids.filter(i=>DRESS.status[i]==='loading').length,bad=ids.filter(i=>/^(failed|error)/.test(DRESS.status[i]));
  console.log('[DVX] models',DRESS.status);if(!pending)toast('Models: '+ok+'/'+ids.length+(bad.length?' · see console (F12)':''));
}
function dressDoll(g){                                         // nameless_doll replaces the four floating parts on the ritual table
  const root=g.scene;root.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(root),sz=b.getSize(V3());
  if(sz.z>=sz.x&&sz.z>=sz.y)root.rotation.x=-Math.PI/2;else if(sz.x>=sz.y&&sz.x>=sz.z)root.rotation.z=Math.PI/2;   // longest axis -> local Y (the group lays it down)
  root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);sz=b.getSize(V3());
  root.scale.setScalar((1.1/(W.doll.scale.x||2.2))/Math.max(sz.y,.001));
  root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);const c=b.getCenter(V3());root.position.set(-c.x,-b.min.y,-c.z);
  W.doll.children.slice().forEach(ch=>W.doll.remove(ch));dressMaterials(root,1.6);W.doll.add(root);
}
/* only draw rooms near the player (keeps mobile fast); the hall is always drawn */
function updateDressing(dt){
  DRESS.t-=dt;if(DRESS.t>0)return;DRESS.t=.4;
  for(const id in DRESS.roots){const r=DRESS.roots[id],u=r.userData;
    if(P.lv!==u.lv){r.visible=false;continue}
    r.visible=id==='hall'||!u.c||P.lv==='base'||Math.hypot(P.x-u.c[0],P.z-u.c[1])<(id==='gallery'?22:15)}
}

/* =====================================================================
   buildWorld(): procedural pieces that remain (hall end caps, door frames, chapel,
   props, items, lights). Everything else is the baked models.
   ===================================================================== */
function decodeGrid(name,g){
  const bits=b64=>{const s=atob(b64),n=g.nx*g.nz,o=new Uint8Array(n);for(let k=0;k<n;k++)o[k]=(s.charCodeAt(k>>3)>>(7-(k&7)))&1;return o};
  GRIDS.push({name,x0:g.x0,z0:g.z0,cs:g.cs,nx:g.nx,nz:g.nz,solid:bits(g.solid),floor:bits(g.floor),solidOnly:LAYOUT.solidOnly.includes(name)});
}
function buildWorld(){
  makeTextures();HMAT=new THREE.MeshBasicMaterial({visible:false});
  W.wall=tmat('wall',0x8a7a72);
  Object.keys(LAYOUT.grids).forEach(n=>decodeGrid(n,LAYOUT.grids[n]));
  const wd=mat(0x4a3526),wd2=mat(0x2b1f18),metal=mat(0x6d7378,{metalness:.5,roughness:.6}),stone=tmat('stone',0x9a9a9a),dk=tmat('rough',0x4a3a30),L=LAYOUT;
  const faceRy=(f)=>Math.atan2(f[0],f[1]);                      // group rotation so local +z points along facing (fx,fz)

  /* ---------------- HALL: end caps, door frames ---------------- */
  setRoom('hall');
  seg(-2.1,9.85,2.1,10.15,0,3.8,W.wall);                          // south end
  seg(-2.1,-14.15,-1,-13.85,0,3.8,W.wall);seg(1,-14.15,2.1,-13.85,0,3.8,W.wall);seg(-1,-14.15,1,-13.85,2.4,1.4,W.wall,false);   // north end around the front door
  const fd=G(0,0,-13.9,0,'door_front');B(fd,1.9,2.4,.1,0,0,0,wd2);B(fd,1.7,.1,.14,0,1.1,0,mat(0x3a2f28,{metalness:.5}));B(fd,.05,.2,.16,.7,1.0,0,mat(0xcdb27a,{metalness:.6}));
  B(fd,1.9,.02,.05,0,0,.07,new THREE.MeshBasicMaterial({color:0xffe9b0}));W.frontDoor=fd;W.frontCol=col(-1,-14.1,1,-13.8,2.4);
  W.sun=new THREE.Mesh(new THREE.PlaneGeometry(14,8),new THREE.MeshBasicMaterial({color:0xfff2c8}));W.sun.position.set(0,2,-17);W.sun.visible=false;scene.add(W.sun);
  addIn({x:0,y:1.2,z:-13.4,w:2,h:2.4,d:.8,label:()=>t('a_door'),act:()=>frontDoorAct()});
  W.hallWall=seg(-2,7.9,2,8.2,0,3.2,W.wall,false);W.hallCol=col(-2,7.9,2,8.2,3.2);W.hallCol.on=false;
  /* the doorways cut into the hall walls get dark timber frames */
  [['W',-8.2],['W',-3.0],['W',3.4],['E',3.4],['E',-3.5],['E',-10.9]].forEach(([s,zc])=>{
    const x=s==='W'?-1.97:1.97,g=G(x,0,zc);B(g,.3,2.25,.1,0,0,-.7,wd2,false);B(g,.3,2.25,.1,0,0,.7,wd2,false);B(g,.3,.1,1.5,0,2.2,0,wd2,false)});
  /* the study doorway is blocked by a bookcase panel until the first journal is read (shifting wall) */
  W.shiftWall=seg(-2.1,-3.65,-1.85,-2.35,0,2.3,dk,false);W.shiftCol=col(-2.2,-3.65,-1.8,-2.35,2.3);

  /* ---------------- CHAPEL (no model yet: procedural shell + the altar model) ---------------- */
  setRoom('chapel');
  plane(2,-14,9,-8,0,stone);plane(2,-14,9,-8,3.2,tmat('wall',0x5e544e),false);
  wallX(-14,2,9);wallZ(9,-14,-8);wallX(-8,2,9);
  [4.1,7.2].forEach((x,i)=>{for(let r=0;r<2;r++){const pg=G(x,0,-8.9-r*.95,0,null);B(pg,2.2,.5,.5,0,0,0,wd);B(pg,2.2,.9,.1,0,0,.25,wd);col(x-1.1,-9.15-r*.95,x+1.1,-8.65-r*.95,.9)}});   // two pew rows, clear of the doorway and the altar
  [-1,1].forEach(d=>[0,1].forEach(k=>{const g=G(5.6+d*2.3,0,-9.2-k*1.8);candle(g,0,0,0);Cy(g,.05,1.1,0,0,0,mat(0x3a2f28),8);candle(g,0,1.1,0)}));
  const rec=G(5.6,0,-11.4,0,'altar_recess');W.recess=B(rec,.5,.03,.34,0,0,0,mat(0xcdb27a,{emissive:0x4a3a10,metalness:.5}));
  addIn({x:5.6,y:1.0,z:-11.5,w:3.2,h:1.6,d:1.4,label:()=>t('a_altar'),when:()=>!state.f.altar,act:()=>altarAct()});

  /* ---------------- PROPS placed in free floor cells (from LAYOUT) ---------------- */
  const P_=L.props;
  // wall safe (study) - head appears on top once opened
  const sf=P_.safe;let g=G(sf[0],0,sf[1],faceRy([sf[2],sf[3]]),'safe_study','study');
  B(g,.8,.9,.6,0,0,0,metal);W.safeDoor=new THREE.Group();W.safeDoor.position.set(-.4,.45,.3);g.add(W.safeDoor);B(W.safeDoor,.8,.7,.05,.4,-.35,0,mat(0x555b60,{metalness:.7,roughness:.4}));
  const dial=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.04,12),mat(0xcdb27a,{metalness:.6}));dial.rotation.x=Math.PI/2;dial.position.set(.6,0,.04);W.safeDoor.add(dial);
  col(sf[0]-.45,sf[1]-.45,sf[0]+.45,sf[1]+.45,.9);
  addIn({x:sf[0]+sf[2]*.4,y:.6,z:sf[1]+sf[3]*.4,w:1.1,h:1.2,d:1.1,label:()=>t('a_safe'),when:()=>!state.f.safe,act:()=>openKeypad()});
  // chest (kitchen) with two rusted locks - arms inside
  const ch=P_.chest;g=G(ch[0],0,ch[1],0,'chest_kitchen','kitchen');B(g,1.0,.55,.6,0,0,0,wd);B(g,1.04,.06,.64,0,.5,0,mat(0x3a3a3a,{metalness:.7}));
  W.chestLid=new THREE.Group();W.chestLid.position.set(0,.58,-.3);g.add(W.chestLid);B(W.chestLid,1.0,.08,.6,0,0,.3,wd2);[-.25,.25].forEach(x=>B(g,.08,.1,.04,x,.5,.31,mat(0x7a3d1d,{metalness:.4})));
  W.storeCol=col(ch[0]-.55,ch[1]-.35,ch[0]+.55,ch[1]+.35,.6);
  addIn({x:ch[0],y:.5,z:ch[1],w:1.5,h:1,d:1.1,label:()=>t('a_store'),when:()=>!state.f.store,act:()=>storeAct()});
  // cellar hatch (kitchen) -> basement
  const bd=P_.basement_door;g=G(bd[0],0,bd[1],0,'hatch_kitchen','kitchen');B(g,1.0,.05,1.0,0,0,0,mat(0x2a1a12));B(g,.9,.02,.04,0,.05,0,mat(0x3a3a3a,{metalness:.7}));const rg=new THREE.Mesh(new THREE.TorusGeometry(.12,.02,6,12),mat(0x8a8d90,{metalness:.8}));rg.rotation.x=Math.PI/2;rg.position.y=.08;g.add(rg);
  addIn({x:bd[0],y:.3,z:bd[1],w:1.4,h:.8,d:1.4,label:()=>t('a_down'),act:()=>goLevel('base',L.spawn.base[0]+.01,L.spawn.base[1],-Math.PI/2)});
  // lockers (gallery) - hiding places
  L.props.lockers.forEach((lk,i)=>{
    const lg=G(lk[0],0,lk[1],faceRy([lk[2],lk[3]]),'locker_gallery'+(i+1),'gallery');B(lg,.8,2,.6,0,0,0,metal);B(lg,.6,.5,.02,0,1.3,.31,mat(0x222426));B(lg,.04,.3,.04,.25,.9,.32,mat(0x8a8d90,{metalness:.8}));
    col(lk[0]-.4,lk[1]-.4,lk[0]+.4,lk[1]+.4,2);
    LOCKERS.push({x:lk[0],z:lk[1],yaw:Math.atan2(-lk[2],-lk[3]),ox:lk[0]+lk[2]*.95,oz:lk[1]+lk[3]*.95});
    addIn({x:lk[0]+lk[2]*.7,y:1.1,z:lk[1]+lk[3]*.7,w:1.2,h:2,d:1.2,label:()=>t(P.hidden?'a_unhide':'a_hide'),act:()=>toggleHide(i)})});
  // basement props
  const sp=L.spawn.base;setRoom('basement');
  g=G(sp[0],0,sp[1],0,'ladder');[-.25,.25].forEach(x=>B(g,.05,2.6,.05,x,0,0,metal,false));for(let r=0;r<9;r++)B(g,.5,.04,.04,0,.25+r*.28,0,metal,false);
  addIn({x:sp[0],y:1.2,z:sp[1],w:1.6,h:2.4,d:1.6,lv:'base',label:()=>t('a_up'),act:()=>goLevel('house',bd[0]+.01,bd[1]+.01,Math.PI)});
  const fb=P_.fusebox;g=G(fb[0],0,fb[1],faceRy([fb[2],fb[3]]),'fusebox');B(g,.7,1.0,.2,0,.7,0,mat(0x4c5a52,{metalness:.4}));
  W.fuseLeds=[0,1,2,3].map(i=>{const l=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),new THREE.MeshBasicMaterial({color:0x330000}));l.position.set(-.24+i*.16,1.5,.12);g.add(l);return l});
  addIn({x:fb[0]+fb[2]*.5,y:1.3,z:fb[1]+fb[3]*.5,w:1.4,h:1.4,d:1.4,lv:'base',label:()=>t('a_fuse'),act:()=>openFuse()});
  const rt=P_.ritual;g=G(rt[0],0,rt[1],0,'table_ritual');B(g,2.6,.9,1.2,0,0,0,tmat('stone',0x8c8c88));col(rt[0]-1.3,rt[1]-.6,rt[0]+1.3,rt[1]+.6,.9);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.9,2.1,40),new THREE.MeshBasicMaterial({color:0x7a1018,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(rt[0],.03,rt[1]);scene.add(ring);
  W.fireG=new THREE.Group();W.fireG.position.set(rt[0],.9,rt[1]);W.fireG.visible=false;scene.add(W.fireG);
  [[0,.3],[.25,.2],[-.25,.22],[.1,.18]].forEach(([x,h])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(.12,h*2,6),new THREE.MeshBasicMaterial({color:x?0xff8a2a:0xffc24a}));c.position.set(x,h,0);W.fireG.add(c)});
  W.doll=new THREE.Group();W.doll.position.set(rt[0],.92,rt[1]);W.doll.visible=false;scene.add(W.doll);
  ['head','arms','torso','legs'].forEach((p,i)=>{const m=MK[p]();m.position.set(0,[.65,.45,.3,.05][i],0);if(p==='arms'||p==='legs')m.rotation.y=Math.PI/2;W.doll.add(m)});
  W.doll.rotation.z=Math.PI/2;W.doll.scale.setScalar(2.2);
  addIn({x:rt[0],y:1.1,z:rt[1],w:2.8,h:1.4,d:1.6,lv:'base',label:()=>t(state.f.doll?'a_ritual':(PARTS.every(p=>state.inv.includes(p))?'a_fusedoll':'a_table')),when:()=>!state.f.burned,act:()=>tableAct()});
  // vault: closed cell with a sliding gate; the torso waits on a pedestal inside
  const vt=P_.vault,cn=tmat('concrete',0x666666);
  seg(vt[0]-1.1,vt[1]-1.0,vt[0]+1.1,vt[1]-.8,0,2.6,cn);seg(vt[0]-1.1,vt[1]-.8,vt[0]-.9,vt[1]+.95,0,2.6,cn);seg(vt[0]+.9,vt[1]-.8,vt[0]+1.1,vt[1]+.95,0,2.6,cn);
  W.torsoDoor=seg(vt[0]-.9,vt[1]+.85,vt[0]+.9,vt[1]+1.05,0,2.6,tmat('concrete',0x777777),false);W.torsoCol=col(vt[0]-.9,vt[1]+.85,vt[0]+.9,vt[1]+1.05,2.6);W.torsoY=W.torsoDoor.position.y;
  g=G(vt[0],0,vt[1]-.1,0,'pedestal_torso');B(g,.6,.9,.6,0,0,0,tmat('stone',0x7a7a76));B(G(0,0,0),.1,2.4,.1,vt[0]-.8,0,vt[1]+.8,mat(0xd8b020));
  // hatch under a rug (final scene)
  const ht=P_.hatch;g=G(ht[0],0,ht[1]);W.rug=B(g,3,.03,2,0,0,0,mat(0x5a1a20,{roughness:1}));W.hatch=new THREE.Group();W.hatch.position.set(ht[0],0,ht[1]);W.hatch.visible=false;scene.add(W.hatch);
  const hd=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.05,16),mat(0x3b3f44,{metalness:.7,roughness:.5}));hd.position.y=.03;W.hatch.add(hd);const hr=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,12),mat(0x8a8d90,{metalness:.8}));hr.rotation.x=Math.PI/2;hr.position.y=.08;W.hatch.add(hr);

  /* ---------------- ITEMS (positions chosen on reachable free floor) ---------------- */
  const I=L.items,fl=.04;
  ['passport','id_card','j1','j2','j3','letter','note','music_box','fuse1','fuse2','key1','key2'].forEach(id=>addItem(id,I[id][0],id==='music_box'?.06:fl,I[id][1],'house'));
  addItem('head',sf[0],.96,sf[1],'house',()=>state.f.safe);
  addItem('arms',ch[0],.7,ch[1],'house',()=>state.f.store);
  addItem('torso',vt[0],.92,vt[1]-.1,'base',()=>state.f.torsoDoor);
  addItem('legs',I.legs[0],.1,I.legs[1],'house',()=>state.f.altar);

  /* ---------------- LIGHTING / ENV ---------------- */
  hemi=new THREE.HemisphereLight(0x303050,0x181010,.5);scene.add(hemi);
  flash=new THREE.SpotLight(0xfff0c8,1.8,16,.5,.55,1.2);flash.position.set(0,0,0);flash.target.position.set(0,0,-1);camera.add(flash,flash.target);
  for(let i=0;i<3;i++){const l=new THREE.PointLight(0xffc27a,0,9,2);scene.add(l);lamps.push(l)}
  fireLight=new THREE.PointLight(0xff7a22,0,10,2);scene.add(fireLight);
  SPOTS.house.forEach(s=>bulb(s[0],s[1],s[2]));
  SPOTS.base=[[sp[0]+2,3,sp[1]],[rt[0],3,rt[1]],[vt[0],3,vt[1]+2],[fb[0],3,fb[1]-3]];
  const N=260,pos=new Float32Array(N*3);for(let i=0;i<N;i++){pos[i*3]=-8+Math.random()*24;pos[i*3+1]=Math.random()*3;pos[i*3+2]=-13+Math.random()*22}
  const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(pos,3));dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xaa9988,size:.025,transparent:true,opacity:.5}));scene.add(dust);

  /* ---------------- ENTITIES ---------------- */
  [0,1].forEach(()=>{const v=new THREE.Group();v.add(makeEntityModel());v.visible=false;scene.add(v);ENTV.push(v)});
  buildNav();worldReady=true;
}

/* ---------- environment, world state sync, scene bootstrap ---------- */
function setEnv(lv){
  if(!scene)return;const base=lv==='base';
  scene.background=new THREE.Color(base?0x010102:0x050306);scene.fog=new THREE.FogExp2(base?0x010102:0x050306,base?.07:.12);
  hemi.intensity=base?(state.f.power?.4:0):.5;
}
function refreshWorld(){for(const id in ITEMG)ITEMG[id].visible=!state.taken[id]&&ITEMG[id].userData.when();syncDoors();ledSync();if(typeof phoneCheckNew==='function')phoneCheckNew()}
function syncDoors(){
  const f=state.f;
  W.shiftWall.position.z=-3+(f.shifted?1.5:0);W.shiftCol.on=!f.shifted;
  W.hallWall.position.y=f.hallShut?1.6:5;W.hallCol.on=!!f.hallShut;
  W.chestLid.rotation.x=f.store?-1.9:0;W.storeCol.on=true;
  W.safeDoor.rotation.y=f.safe?-1.9:0;
  W.recess.material.emissive.setHex(f.altar?0xcdb27a:0x4a3a10);
  W.torsoDoor.position.y=(W.torsoY||1.3)+(f.torsoDoor?2.8:0);W.torsoCol.on=!f.torsoDoor;
  W.doll.visible=!!f.doll&&!f.burned;W.doll.position.y=.92+(f.doll?.35:0);W.doll.scale.setScalar(2.2);
  W.fireG.visible=false;W.frontDoor.position.x=0;W.frontCol.on=true;W.sun.visible=false;W.rug.visible=true;W.hatch.visible=false;
  ent.on=!f.burned;
}
function initScene(){
  if(renderer||!hasThree)return;
  renderer=new THREE.WebGLRenderer({canvas:el('c'),antialias:S.gfx==='high',powerPreference:'high-performance'});
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.05,60);camera.rotation.order='YXZ';scene.add(camera);
  rcast=new THREE.Raycaster();rcast.far=3;
  buildWorld();setEnv('house');applyGfx();refreshWorld();loadModels();
}
