/* =====================================================================
   DEVEXINOS / js/npc.js
   Devexinos: model/skin, navigation grid, patrol / chase / search AI, capture and apparitions
   ===================================================================== */
/* ---------- entity (Devexinos) procedural model ---------- */
function makeEntityModel(){
  const g=new THREE.Group(),dark=mat(0x040305,{roughness:.5,emissive:0x050204});
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.14,.4,1.7,10),dark);body.position.y=.85;g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,10,10),dark);head.position.y=2.0;head.scale.y=1.3;g.add(head);
  [-1,1].forEach(d=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:0xff2a3a}));e.position.set(d*.08,2.05,.17);g.add(e);
    const a=new THREE.Mesh(new THREE.BoxGeometry(.06,1.5,.06),dark);a.position.set(d*.45,.9,.05);a.rotation.z=d*.12;g.add(a)});
  g.userData.proc=true;return g}
function skinEntity(gltf){                       // demonic_runner.glb: skinned + animated (RunFast clip)
  ENTMIX.length=0;ENT_ACT=null;const v=ENTV[0];while(v.children.length)v.remove(v.children[0]);
  const obj=gltf.scene;obj.scale.setScalar(ENT_SCALE);obj.rotation.y=ENT_YAW;dressMaterials(obj,1.6);v.add(obj);
  if(gltf.animations&&gltf.animations.length){const mx=new THREE.AnimationMixer(obj);ENT_ACT=mx.clipAction(gltf.animations[0]);ENT_ACT.play();ENTMIX.push(mx)}
}

const NAV={x0:0,z0:0,cs:.5,nx:1,nz:1,ok:[]};
let WPS=[[5,-3.5]];
const GAL={x0:2,x1:15,z0:-8,z1:0};
const ent={x:5,z:-3.5,yaw:0,state:'patrol',aw:0,path:[],wp:0,on:true,lost:0,wait:0,rep:0,moving:false};
const wrapA=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
const inGallery=(x,z)=>x>GAL.x0&&x<GAL.x1&&z>GAL.z0&&z<GAL.z1;
/* ---------- navigation grid for the gallery ---------- */
function buildNav(){
  const g=GRIDS.find(q=>q.name==='gallery');if(!g)return;
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;                                  // floor bounds of the baked gallery
  for(let j=0;j<g.nz;j++)for(let i=0;i<g.nx;i++)if(g.floor[j*g.nx+i]){const x=g.x0+i*g.cs,z=g.z0+j*g.cs;x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)}
  GAL.x0=Math.max(x0,2.2);GAL.x1=x1;GAL.z0=z0;GAL.z1=z1;
  NAV.x0=GAL.x0;NAV.z0=z0;NAV.nx=Math.ceil((x1-GAL.x0)/NAV.cs);NAV.nz=Math.ceil((z1-z0)/NAV.cs);NAV.ok=[];
  for(let j=0;j<NAV.nz;j++)for(let i=0;i<NAV.nx;i++)NAV.ok.push(!blocked(NAV.x0+(i+.5)*NAV.cs,NAV.z0+(j+.5)*NAV.cs,.25));
  const w=LAYOUT.gallery.waypoints;WPS=w.concat(w.slice(1,-1).reverse());   // ping-pong along the gallery
  ent.x=WPS[0][0];ent.z=WPS[0][1];
}
const cellOf=(x,z)=>({i:clamp(Math.floor((x-NAV.x0)/NAV.cs),0,NAV.nx-1),j:clamp(Math.floor((z-NAV.z0)/NAV.cs),0,NAV.nz-1)});
function findPath(ax,az,bx,bz){
  const idx=(i,j)=>j*NAV.nx+i,s=cellOf(ax,az);let g=cellOf(bx,bz);
  if(!NAV.ok[idx(g.i,g.j)]){let best=null,bd=1e9;for(let j=0;j<NAV.nz;j++)for(let i=0;i<NAV.nx;i++)if(NAV.ok[idx(i,j)]){const d=(i-g.i)**2+(j-g.j)**2;if(d<bd){bd=d;best={i,j}}}g=best||g}
  const prev=new Int16Array(NAV.nx*NAV.nz).fill(-2),q=[idx(s.i,s.j)];prev[q[0]]=-1;const goal=idx(g.i,g.j);
  const D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let h=0;h<q.length;h++){const c=q[h];if(c===goal)break;const ci=c%NAV.nx,cj=(c/NAV.nx)|0;
    for(const [di,dj] of D){const ni=ci+di,nj=cj+dj;if(ni<0||nj<0||ni>=NAV.nx||nj>=NAV.nz)continue;const n=idx(ni,nj);if(prev[n]!==-2||!NAV.ok[n])continue;
      if(di&&dj&&(!NAV.ok[idx(ci+di,cj)]||!NAV.ok[idx(ci,cj+dj)]))continue;prev[n]=c;q.push(n)}}
  if(prev[goal]===-2)return [];
  const out=[];for(let c=goal;c>=0&&prev[c]!==-1;c=prev[c])out.push({x:NAV.x0+((c%NAV.nx)+.5)*NAV.cs,z:NAV.z0+(((c/NAV.nx)|0)+.5)*NAV.cs});return out.reverse();
}

/* ---------- Devexinos: patrol / chase / search AI (stealth gallery) ---------- */
function stepPath(spd,dt){const n=ent.path[0];if(!n)return;ent.moving=true;const dx=n.x-ent.x,dz=n.z-ent.z,d=Math.hypot(dx,dz);if(d<.15){ent.path.shift();return}
  const s=Math.min(d,spd*dt);slide(ent,dx/d*s,dz/d*s,.25);ent.yaw+=wrapA(Math.atan2(dx,dz)-ent.yaw)*Math.min(1,dt*7)}
function updEntity(dt,now){
  const v=ENTV[0];
  if(!ent.on||P.lv!=='house'){v.visible=false;setChase(false);return}
  v.visible=true;
  const dx=P.x-ent.x,dz=P.z-ent.z,dist=Math.hypot(dx,dz),inZ=inGallery(P.x,P.z);
  const los=inZ&&clearLine(ent.x,ent.z,1.4,P.x,P.z,1.4,0,true);
  const range=(flashOn?12:7)*(P.crouch?.55:1)*(P.moving?1:.8);
  const cone=Math.abs(wrapA(Math.atan2(dx,dz)-ent.yaw))<1.1||ent.state==='chase';
  const seen=inZ&&!P.hidden&&los&&dist<range&&cone;
  const heard=inZ&&!P.hidden&&P.moving&&dist<(P.run?7:P.crouch?1.4:3.4);
  if(ent.state!=='chase'){
    ent.aw=clamp(ent.aw+(seen?1.2+(1-dist/range)*1.6:heard?.8:-.4)*dt,0,1.2);
    if(ent.aw>=1){ent.state='chase';ent.lost=0;ent.path=[];sfx('growl');setChase(true);boost(1,2.5)}
  }
  if(ent.state==='chase'){
    if(P.hidden)ent.lost+=dt*2;else if(seen||heard||(los&&dist<6))ent.lost=Math.max(0,ent.lost-dt);else ent.lost+=dt;
    if(!inZ)ent.lost+=dt*2;
    if(ent.lost>4){ent.state='search';ent.aw=0;ent.path=[];ent.wait=(P.hidden&&dist<2.8)?4:0;setChase(false)}
    else{ent.rep-=dt;if(ent.rep<=0||!ent.path.length){ent.rep=.35;ent.path=findPath(ent.x,ent.z,P.x,P.z)}stepPath(3.3,dt);
      if(dist<.95&&!P.hidden&&!locked){caught();return}}
  }else if(ent.wait>0){ent.wait-=dt}
  else{if(!ent.path.length){if(ent.state==='search')ent.state='patrol';ent.wp=(ent.wp+1)%WPS.length;ent.path=findPath(ent.x,ent.z,WPS[ent.wp][0],WPS[ent.wp][1])}stepPath(ent.state==='search'?1.6:.9,dt)}
  v.position.set(ent.x,0,ent.z);v.rotation.y=ent.yaw;
  if(ENT_ACT)ENT_ACT.timeScale=ent.state==='chase'?1.5:(ent.moving?.45:.001);ent.moving=false;
}
async function caught(){
  locked=true;ent.state='patrol';setChase(false);sfx('scare');boost(1,2);await fade(1,250);say('m_caught',2600);
  ent.x=WPS[0][0];ent.z=WPS[0][1];ent.wp=0;ent.path=[];ent.aw=0;ent.lost=0;P.hidden=false;P.x=0;P.z=-3.5;P.yaw=-Math.PI/2;P.pitch=0;
  await wait(1500);await fade(0,900);locked=false;
}
function apparition(){ // brief scare: a figure at the far end of the hall
  const v=ENTV[1];v.position.set(0,0,P.z>-4?-12:6);v.rotation.y=P.z>-4?0:Math.PI;v.visible=true;sfx('scare');boost(.9,2.5);
  setTimeout(()=>{v.visible=false},1300);
}
