import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CARS} from './config/carsConfig.js';
import {MAPS} from './config/mapsConfig.js';
import {Save} from './save.js';
import {t,setLang} from './i18n.js';
import {initPhone} from './phone.js';
import {Snd} from './audio.js';
import {Ground} from './ground.js';
import {stats,PARTS,PAINTS,cost} from './tuning.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const $=s=>document.querySelector(s),S=Save.data.set,clamp=THREE.MathUtils.clamp,TAU=Math.PI*2;
const DEF={master:1,music:.7,sfx:.8,quality:'med',fps:60,post:true,shadows:true,scale:1};for(const k in DEF)if(S[k]===undefined)S[k]=DEF[k];
const fmt=n=>Math.floor(n).toLocaleString('fr-DZ')+' '+t('cur');
const angd=(a,b)=>((a-b+Math.PI)%TAU+TAU)%TAU-Math.PI;

// ---------- Renderer / scene ----------
const R=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});document.body.prepend(R.domElement);R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.1;R.shadowMap.type=THREE.PCFSoftShadowMap;
const sc=new THREE.Scene();{const c=document.createElement('canvas');c.width=2;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#2f7fd1');g.addColorStop(.55,'#8fc8f0');g.addColorStop(1,'#f4e3bd');x.fillStyle=g;x.fillRect(0,0,2,256);const tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;sc.background=tx}sc.fog=new THREE.Fog(0xcfe3ee,150,430);
const cam=new THREE.PerspectiveCamera(65,1,.2,700);
sc.add(new THREE.HemisphereLight(0xffffff,0x667766,1.2));
const sun=new THREE.DirectionalLight(0xffffff,1.7);sc.add(sun,sun.target);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:300});sun.shadow.bias=-.0004;sun.shadow.normalBias=.05;
const Q={low:[.6,512],med:[.8,1024],high:[1,2048]};let smSize=0;
function gfx(){const[q,sm]=Q[S.quality];R.setPixelRatio(Math.min(devicePixelRatio,2)*q*S.scale);R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();
 R.shadowMap.enabled=S.shadows;sun.castShadow=S.shadows;if(smSize!==sm){smSize=sm;sun.shadow.mapSize.set(sm,sm);sun.shadow.map?.dispose();sun.shadow.map=null}
 document.body.classList.toggle('post',S.post)}
addEventListener('resize',gfx);

// ---------- Assets (cached, auto-scaled to real-world size) ----------
const GL=new GLTFLoader(),cache={};GL.setMeshoptDecoder(MeshoptDecoder);{const dr=new DRACOLoader();dr.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');GL.setDRACOLoader(dr)}const load=(u,cb)=>{let e=cache[u];if(!e){e=cache[u]={fr:0,ls:[]};e.p=new Promise((ok,no)=>GL.load(u,g=>{e.fr=1;e.ls.forEach(f=>f(1));ok(g.scene)},x=>{e.fr=x.total?x.loaded/x.total:Math.min(.95,e.fr+.02);e.ls.forEach(f=>f(e.fr))},er=>{delete cache[u];no(er)}))}
 if(cb){e.ls.push(cb);cb(e.fr)}return e.p};
// Pure math (testable): flat xyz array -> yaw that puts the car's long axis on +Z, hood (lower end) at +Z, plus robust size.
function fitPoints(P,flipCfg){const n=P.length/3;let mx=0,mz=0;for(let i=0;i<n;i++){mx+=P[i*3];mz+=P[i*3+2]}mx/=n;mz/=n;let cxx=0,czz=0,cxz=0;
 for(let i=0;i<n;i++){const x=P[i*3]-mx,z=P[i*3+2]-mz;cxx+=x*x;czz+=z*z;cxz+=x*z}
 const th=.5*Math.atan2(2*cxz,cxx-czz);let phi=Math.atan2(-Math.cos(th),Math.sin(th));
 const X=new Float32Array(n),Y=new Float32Array(n),Z=new Float32Array(n);
 const rot=()=>{const c=Math.cos(phi),s=Math.sin(phi);for(let i=0;i<n;i++){const x=P[i*3],z=P[i*3+2];X[i]=x*c+z*s;Z[i]=-x*s+z*c;Y[i]=P[i*3+1]}};
 const q=(a,f)=>{const b=Float32Array.from(a).sort();return b[Math.round(f*(b.length-1))]};
 rot();let z0=q(Z,.005),z1=q(Z,.995);const L0=z1-z0;let a=0,na=0,b=0,nb=0;
 for(let i=0;i<n;i++){const t=(Z[i]-z0)/L0;if(t>.75){a+=Y[i];na++}else if(t<.25){b+=Y[i];nb++}}
 let flip=na>0&&nb>0&&a/na>b/nb;if(flipCfg)flip=!flip;if(flip){phi+=Math.PI;rot()}
 const x0=q(X,.005),x1=q(X,.995);z0=q(Z,.005);z1=q(Z,.995);const y0=q(Y,.005),y1=q(Y,.995);
 return{phi,cx:(x0+x1)/2,cz:(z0+z1)/2,y0,y1,L:z1-z0,W:x1-x0}}
const fitCache={};
function carFit(m,id,flipCfg){if(fitCache[id])return fitCache[id];m.updateMatrixWorld(true);let tot=0;m.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position)tot+=o.geometry.attributes.position.count});
 const st=Math.max(1,Math.floor(tot/20000)),v=new THREE.Vector3(),P=[];
 m.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.position)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=st){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);P.push(v.x,v.y,v.z)}});
 return fitCache[id]=fitPoints(P,flipCfg)}
async function carModel(c,npc,cb){
 const m=(await load('assets/models/cars/'+c.file,cb)).clone(true),f=carFit(m,c.id,c.flip),k=c.len/f.L;
 const pv=new THREE.Group();pv.add(m);pv.rotation.y=f.phi;const w=new THREE.Group();w.add(pv);w.scale.setScalar(k);w.position.set(-f.cx*k,-f.y0*k,-f.cz*k);
 const g=new THREE.Group();g.add(w);g.rotation.order='YXZ';g.userData={len:c.len,h:(f.y1-f.y0)*k,wid:f.W*k};
 m.traverse(o=>{if(o.isMesh){o.castShadow=!npc;if(npc)o.material=new THREE.MeshLambertMaterial({color:o.material.color||0xcccccc,map:o.material.map||null})}});return g}
let pT=0,pD=0,spawnId=0;const prog=p=>{pT=p},frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));

// ---------- State ----------
let msgT=45,frameN=0;const TR=CARS.filter(c=>c.npc!==false);let eff=null,map=null,root=null,ground=null,chunks=[],player=null,pcfg=null,traffic=[],job=null,beam=null,camMode=0,paused=false,playing=false,snapCb=null,lvl=1;
const P={x:0,z:0,h:0,v:0,s:0,hc:0,ay:0},M={cx:0,cz:0,B:100,gy:0};

// Finds the real road/ground height: ray-cast down on a grid, take the most common surface level (roads/ground cover the most area), spawn on it.
function findGround(root,b){const rc=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3(0,-1,0),pts=[],N=17,sp=Math.min(M.B*.6,350);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=M.cx+(i/(N-1)-.5)*2*sp,z=M.cz+(j/(N-1)-.5)*2*sp;rc.firstHitOnly=true;rc.set(o.set(x,b.max.y+20,z),d);const L=Ground.list(x,z),h=L&&(Ground.prep(L),rc.intersectObjects(L,false)[0]);if(h)pts.push({x,z,y:h.point.y})}
 if(!pts.length)return{y:b.min.y+.02,x:M.cx,z:M.cz};
 const bins={};pts.forEach(p=>{(bins[Math.round(p.y*2)]??=[]).push(p)});let best=null,bn=-1;
 for(const k of Object.keys(bins).map(Number)){const c=[...(bins[k-1]||[]),...bins[k],...(bins[k+1]||[])];if(c.length>bn){bn=c.length;best=c}}
 const gy=best.reduce((a,p)=>a+p.y,0)/best.length;best.sort((p,q)=>Math.hypot(p.x-M.cx,p.z-M.cz)-Math.hypot(q.x-M.cx,q.z-M.cz));
 console.log('ground level',gy.toFixed(2),'from',pts.length,'rays');return{y:gy,x:best[0].x,z:best[0].z}}
async function startMap(id){
 map=MAPS.find(m=>m.id===id);playing=false;pT=pD=0;$('#hud').style.display=$('#ctl').style.display='none';show('load');
 await frame();await frame();                                   // the loading screen is painted BEFORE any heavy work
 try{
  pcfg=CARS.find(c=>c.id===Save.data.car);let fm=0,fp=0;const upd=()=>prog(.7*fm+.2*fp);
  const[raw,pm]=await Promise.all([load('assets/models/maps/'+map.file,f=>{fm=f;upd()}),carModel(pcfg,false,f=>{fp=f;upd()})]);
  prog(.92);await frame();
  if(root)sc.remove(root);if(ground)sc.remove(ground);
  root=raw.clone(true);let b=new THREE.Box3().setFromObject(root),sz=b.getSize(new THREE.Vector3());
  root.scale.setScalar(map.extent/Math.max(sz.x,sz.z));sc.add(root);root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);sz=b.getSize(new THREE.Vector3());
  M.cx=(b.min.x+b.max.x)/2;M.cz=(b.min.z+b.max.z)/2;M.B=Math.max(sz.x,sz.z)/2*.96;await Promise.race([Ground.ready,new Promise(r=>setTimeout(r,3000))]);Ground.build(root);const G=findGround(root,b);M.gy=map.groundY??G.y;M.sx=G.x;M.sz=G.z;M.sy=G.y;
  ground=new THREE.Mesh(new THREE.PlaneGeometry(M.B*4,M.B*4),new THREE.MeshLambertMaterial({color:0x555a55}));ground.rotation.x=-Math.PI/2;ground.position.set(M.cx,M.gy-.06,M.cz);ground.receiveShadow=true;sc.add(ground);
  prog(.96);await frame();
  let nodes=root.children;while(nodes.length===1&&nodes[0].children.length>1)nodes=nodes[0].children;
  chunks=nodes.map(n=>{const bb=new THREE.Box3().setFromObject(n);return{n,c:bb.getCenter(new THREE.Vector3()),r:bb.getSize(new THREE.Vector3()).length()/2}});
  if(player)sc.remove(player);player=pm;sc.add(player);refreshEff();applyLook();
  Object.assign(P,{x:G.x,z:G.z,y:G.y,vy:0,pt:0,h:0,hc:0,v:0,s:0});job=null;if(beam)beam.visible=false;lvl=Save.level();
  traffic.forEach(n=>sc.remove(n.m));traffic=[];
  prog(1);await new Promise(r=>setTimeout(r,260));            // let the bar visibly reach 100%
  show(null);$('#hud').style.display='block';$('#ctl').style.display='flex';playing=true;paused=false;
  syncTraffic();                                               // NOT awaited: cars appear one by one while you already drive
 }catch(e){console.error(e);menu();$('#stat').textContent='⚠ '+(e.message||'load error')}}
async function syncTraffic(){const my=++spawnId,n=Math.round(S.traffic*18);while(traffic.length>n)sc.remove(traffic.pop().m);
 while(traffic.length<n&&my===spawnId){const i=traffic.length,m=await carModel(TR[i%TR.length],true);if(my!==spawnId)return;sc.add(m);const o={m,i,d:i%2?1:-1,v:0,pass:false,tg:0,off:false,wait:0,dx:0,dz:1};traffic.push(o);place(o,true);await new Promise(r=>setTimeout(r,120))}}
function place(n,init){n.v=(9+Math.random()*7)*S.tspeed;n.pass=false;
 for(let t=0;t<14;t++){const a=Math.random()*6.283,d=init?30+Math.random()*190:140+Math.random()*120,x=P.x+Math.sin(a)*d,z=P.z+Math.cos(a)*d,ax=Math.random()<.5,dx=ax?n.d:0,dz=ax?0:n.d;
  let y=Ground.h(x,z,P.y,6,60);if(y===null||Math.abs(y-P.y)>8)continue;let py=y,ok=true;
  for(let k=1;k<=5&&ok;k++){const yy=Ground.h(x+dx*15*k,z+dz*15*k,py,1.8,30);ok=yy!==null&&Math.abs(yy-py)<1.8;py=yy}   // 75 m of continuous road ahead
  if(!ok)continue;n.dx=dx;n.dz=dz;n.m.position.set(x,y,z);n.m.rotation.y=Math.atan2(dx,dz);n.tg=y;n.off=false;n.m.visible=true;return}
 n.off=true;n.wait=1.5;n.m.visible=false}

// ---------- Input ----------
const keys={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=1;if(e.code==='KeyH')Snd.play('horn');if(e.code==='KeyC')camMode=(camMode+1)%3});addEventListener('keyup',e=>keys[e.code]=0);
const inp={l:0,r:0,gas:0,brk:0,axis:0};let holding=false,wr=0,tiltRaw=null,tiltN=null,tiltF=0;
const mkEl=(p,id,cls,html='')=>{const e=document.createElement('div');if(id)e.id=id;if(cls)e.className=cls;e.innerHTML=html;p.append(e);return e};
function btn(p,cls,txt,k){const b=mkEl(p,'','pb '+cls,txt);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);inp[k]=1;b.classList.add('on')};b.onpointerup=b.onpointercancel=()=>{inp[k]=0;b.classList.remove('on')}}
const IC=p=>`<svg viewBox="0 0 24 24">${p}</svg>`,I_L=IC('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),I_R=IC('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),I_GAS=IC('<path d="M6 11l6-6 6 6M6 18l6-6 6 6"/>'),I_BRK=IC('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>');
function buildCtl(){const L=$('#left'),Rr=$('#right');L.innerHTML=Rr.innerHTML='';inp.axis=0;wr=0;tiltN=null;
 btn(Rr,'pedal brk',I_BRK,'brk');btn(Rr,'pedal gas',I_GAS,'gas');
 if(S.ctrl==='arrows'){btn(L,'',I_L,'l');btn(L,'',I_R,'r')}
 else if(S.ctrl==='joystick'){const s=mkEl(L,'stick','','<div id="knob"></div>'),k=s.firstChild;const mv=e=>{const r=s.getBoundingClientRect();inp.axis=clamp((e.clientX-r.left-r.width/2)/(r.width/2-24),-1,1);k.style.transform=`translate(${inp.axis*38}px,0)`};
  s.onpointerdown=e=>{s.setPointerCapture(e.pointerId);mv(e)};s.onpointermove=e=>{if(s.hasPointerCapture(e.pointerId))mv(e)};s.onpointerup=s.onpointercancel=()=>{inp.axis=0;k.style.transform=''}}
 else if(S.ctrl==='wheel'){const w=mkEl(L,'wheel','','<i></i>');let a0=0,r0=0;const ang=e=>{const r=w.getBoundingClientRect();return Math.atan2(e.clientX-r.left-r.width/2,r.top+r.height/2-e.clientY)};
  w.onpointerdown=e=>{w.setPointerCapture(e.pointerId);holding=true;a0=ang(e);r0=wr};w.onpointermove=e=>{if(holding)wr=clamp(r0+angd(ang(e),a0),-2.2,2.2)};w.onpointerup=w.onpointercancel=()=>holding=false}
 else mkEl(L,'tiltind','','<i></i>')}
addEventListener('deviceorientation',e=>{const a=screen.orientation?.angle||0;tiltRaw=a===90?e.beta:a===270?-e.beta:e.gamma;if(tiltN===null&&tiltRaw!=null)tiltN=tiltRaw});
function steerTarget(dt){let a=0;
 if(S.ctrl==='wheel'){if(!holding)wr*=Math.exp(-7*dt);a=wr/2.2;$('#wheel').style.transform=`rotate(${wr}rad)`}
 else if(S.ctrl==='tilt'&&tiltRaw!=null){let d=(tiltRaw-tiltN)/24;d=Math.abs(d)<.06?0:d;tiltF+=(clamp(d,-1,1)-tiltF)*Math.min(1,dt*10);a=tiltF;const i=$('#tiltind i');if(i)i.style.transform=`translateX(${a*52}px)`}
 else a=inp.axis;
 const sh=Math.sign(a)*Math.pow(Math.abs(a),1.35);
 return clamp((keys.ArrowRight||keys.KeyD||inp.r?1:0)-(keys.ArrowLeft||keys.KeyA||inp.l?1:0)+sh,-1,1)}

// ---------- Audio (engine synth) ----------
let phone;

// ---------- Update ----------
const V=new THREE.Vector3(),clock=new THREE.Clock();let acc=0;
function tick(){requestAnimationFrame(tick);pD+=(pT-pD)*.25;$('#lbar i').style.width=pD*100+'%';acc+=clock.getDelta();const step=1/S.fps;if(acc<step-.002)return;const dt=Math.min(acc,.05);acc=0;if(playing)update(paused?0:dt);R.render(sc,cam);
 if(snapCb){snapCb(R.domElement.toDataURL('image/jpeg',.85));snapCb=null}}
function update(dt){
 const gas=keys.ArrowUp||keys.KeyW||inp.gas,brk=keys.ArrowDown||keys.KeyS||inp.brk,top=eff.top/3.6,kmh=Math.abs(P.v)*3.6;
 if(brk&&P.v>14&&!P.bk){Snd.play('brake',.8);P.bk=1}if(!brk)P.bk=0;
 // longitudinal: power-limited accel (P/mv) capped by traction, quadratic drag to hit top speed
 if(dt){let a=0;
  if(gas&&P.v>=-.3)a=Math.min(2.5+eff.torque/eff.weight*12,eff.hp*745*.8/(eff.weight*Math.max(P.v,3.5)))*(1-Math.pow(P.v/top,2));
  else if(brk&&P.v>.5)a=-9*eff.brake;else if(brk)a=-3*(1+P.v/-8);          // brake, then reverse (max ~8 m/s)
  else if(gas)a=9;                                                // gas while rolling backwards = brake
  if(!gas)a-=Math.sign(P.v)*(.5+.012*P.v*P.v*.2);                // engine braking + rolling resistance
  P.v+=a*dt;if(!gas&&!brk&&Math.abs(P.v)<.25)P.v=0;P.v=clamp(P.v,-8,top);
  // steering: bicycle model, steering angle shrinks with speed, lateral-grip limit (heavier = less grip)
  const tgt=steerTarget(dt),k=Math.abs(tgt)>Math.abs(P.s)?9:14;P.s+=(tgt-P.s)*Math.min(1,dt*k);
  const del=P.s*(.6-.5*Math.min(1,Math.pow(Math.abs(P.v)/top,.7))),L=pcfg.len*.62;let yaw=P.v/L*Math.tan(del);const aLat=Math.abs(yaw*P.v),gmax=eff.grip*(10-eff.weight/700);
  if(aLat>gmax){yaw*=gmax/aLat;P.v*=1-.25*dt}P.h-=yaw*dt;P.ay=yaw*P.v;
  const fx=Math.sin(P.h),fz=Math.cos(P.h),sg=P.v<0?-1:1;let mv=true;
  if(Math.abs(P.v)>.3&&(Ground.fast||frameN%3===0)&&Ground.wall(P.x,P.y,P.z,fx*sg,fz*sg,pcfg.len/2+Math.abs(P.v)*dt+.2,player.userData.wid/2-.15)){crashFx(Math.min(1,Math.abs(P.v)/12));P.v*=-.2;mv=false}   // solid walls/buildings
  if(mv){P.x+=fx*P.v*dt;P.z+=fz*P.v*dt}
  if(Math.abs(P.x-M.cx)>M.B||Math.abs(P.z-M.cz)>M.B){P.x=clamp(P.x,M.cx-M.B,M.cx+M.B);P.z=clamp(P.z,M.cz-M.B,M.cz+M.B);P.v*=.5;crashFx(.5)}
  const hl=pcfg.len*.38,hF=Ground.h(P.x+fx*hl,P.z+fz*hl,P.y,.9,40),hR=Ground.h(P.x-fx*hl,P.z-fz*hl,P.y,.9,40),gT=hF??hR;     // follow the real surface
  if(gT!==null){if(hF!==null&&hR!==null)P.pt+=(Math.atan2(hF-hR,hl*2)-P.pt)*Math.min(1,dt*10);
   const tY=hF!==null&&hR!==null?(hF+hR)/2:gT;if(tY>=P.y-.3||P.y-tY<.35){P.y+=(tY-P.y)*Math.min(1,dt*16);P.vy=0}else{P.vy-=25*dt;P.y+=P.vy*dt;if(P.y<tY){P.y=tY;P.vy=0}}}
  else{P.vy-=25*dt;P.y+=P.vy*dt}
  if(P.y<M.sy-60){P.x=M.sx;P.z=M.sz;P.y=M.sy;P.v=0;P.vy=0;P.pt=0}} // invisible walls
 player.position.set(P.x,P.y,P.z);player.rotation.x=-P.pt;player.rotation.y=P.h;player.rotation.z=clamp(-P.ay*.006,-.05,.05);
 const sn=80/smSize;V.set(Math.round(P.x/sn)*sn,P.y,Math.round(P.z/sn)*sn);sun.target.position.copy(V);sun.position.set(V.x+80,P.y+120,V.z+40); // texel-snapped shadows (no shimmer)
 for(const c of chunks)c.n.visible=V.set(c.c.x-P.x,0,c.c.z-P.z).length()-c.r<map.cullDist;
 frameN++;
 for(const n of traffic){
  if(n.off){if((n.wait-=dt)<=0)place(n);continue}
  const ps=n.m.position;ps.x+=n.dx*n.v*dt;ps.z+=n.dz*n.v*dt;const dx=ps.x-P.x,dz=ps.z-P.z,d=Math.hypot(dx,dz);
  if(dt&&(frameN+n.i)%3===0){const hy=Ground.h(ps.x,ps.z,ps.y,1.1,40);if(hy===null||hy-ps.y>1.1||ps.y-hy>5){place(n);continue}n.tg=hy}   // same surface logic as the player
  ps.y+=(n.tg-ps.y)*Math.min(1,dt*8);
  if(d>280||Math.abs(ps.x-M.cx)>M.B||Math.abs(ps.z-M.cz)>M.B){place(n);continue}
  const near=Math.abs(ps.y-P.y)<2.5;
  if(d<2.7&&dt&&near){const nx=-dx/(d||1),nz=-dz/(d||1);P.x+=nx*(2.7-d);P.z+=nz*(2.7-d);P.v*=.55;crashFx()}
  else if(near&&!n.pass&&P.v>12){const lat=dx*Math.cos(P.h)-dz*Math.sin(P.h),lon=dx*Math.sin(P.h)+dz*Math.cos(P.h);
   if(Math.abs(lat)<2.8&&Math.abs(lon)<3){n.pass=true;const c=Math.abs(lat)<1.9,v=c?1200:600;addMoney(v);Snd.play(c?'cash':'pass');toast((c?t('near')+' ':'')+'+'+v+' '+t('cur'))}}}
 if(dt&&kmh>60)addMoney(kmh*dt*.5);if(dt&&(msgT-=dt)<=0){msgT=70+Math.random()*80;phone.incoming()}
 if(job){job.t-=dt;const d=Math.hypot(job.x-P.x,job.z-P.z);$('#jobp').textContent=`📦 ${Math.round(d)} m · ${Math.max(0,Math.ceil(job.t))} s`;
  if(d<12){addMoney(job.r);toast(t('done')+' +'+job.r);endJob()}else if(job.t<=0){toast(t('fail'));endJob()}}
 $('#spd').textContent=Math.round(kmh);$('#spdw').style.setProperty('--p',Math.min(100,kmh/eff.top*100));$('#mon').textContent=fmt(Save.data.money)+' · '+t('lvl')+' '+Save.level();$('#xpb i').style.width=(Math.sqrt(Save.data.xp/100)%1)*100+'%';
 Snd.engine(kmh,!!gas,eff.top,dt>0);
 // cameras: heading-damped chase (no stitching), frame-rate independent smoothing
 const len=pcfg.len,h=player.userData.h;P.hc+=angd(P.h,P.hc)*(1-Math.exp(-5*dt));const sx=Math.sin(P.h),sz=Math.cos(P.h);
 if(camMode===0){const dist=len*1.5+3.2+kmh*.012,cx=Math.sin(P.hc),cz=Math.cos(P.hc);V.set(P.x-cx*dist,P.y+h+1.1+len*.12,P.z-cz*dist);cam.position.lerp(V,dt?1-Math.exp(-11*dt):1);cam.lookAt(P.x+sx*3,P.y+h*.8,P.z+sz*3);cam.fov+=(62+kmh*.12-cam.fov)*Math.min(1,dt*3)}
 else if(camMode===1){cam.position.set(P.x+sz*.38+sx*.1,P.y+h*.82,P.z-sx*.38+sz*.1);cam.lookAt(P.x+sx*12-P.s*sz*2,P.y+h*.8,P.z+sz*12+P.s*sx*2);cam.fov=70}
 else{const a=performance.now()/5000;V.set(P.x+Math.sin(a)*(len*2+4),P.y+1.6+Math.sin(a*.7),P.z+Math.cos(a)*(len*2+4));cam.position.lerp(V,dt?1-Math.exp(-3*dt):1);cam.lookAt(P.x,P.y+h*.6,P.z);cam.fov=55}
 cam.updateProjectionMatrix();player.visible=camMode!==1;
 const nl=Save.level();if(nl>lvl){lvl=nl;Snd.play('levelup');toast('⬆ '+t('lvl')+' '+nl)}}
function addMoney(v){Save.data.money+=v;Save.data.xp+=v/400}
function toast(s){const e=$('#toast');e.textContent=s;clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',1400);Save.write()}
function startJob(){const a=Math.random()*TAU,d=250+Math.random()*250;job={x:clamp(P.x+Math.sin(a)*d,M.cx-M.B,M.cx+M.B),z:clamp(P.z+Math.cos(a)*d,M.cz-M.B,M.cz+M.B),r:15000,t:40+d/8};
 if(!beam){beam=new THREE.Mesh(new THREE.CylinderGeometry(3,3,90,16,1,true),new THREE.MeshBasicMaterial({color:0xffd84a,transparent:true,opacity:.35,side:THREE.DoubleSide,fog:false}));sc.add(beam)}beam.visible=true;beam.position.set(job.x,P.y+45,job.z)}
function endJob(){job=null;beam.visible=false;$('#jobp').textContent=''}

// ---------- Menus ----------
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id))}
function menu(){const live=playing;paused=live;$('#hud').style.display=$('#ctl').style.display='none';$('#bRes').style.display=live?'':'none';$('#stat').textContent=fmt(Save.data.money)+' · '+t('lvl')+' '+Save.level();show('menu');if(map&&root&&playing)syncTraffic()}
const refreshEff=()=>{eff=stats(pcfg,Save.data.tune[pcfg.id]);Snd.setCar(pcfg.id)};let cd=0;function crashFx(v=1){if(performance.now()-cd>600){cd=performance.now();Snd.play('crash',v)}}
function applyLook(){const tn=Save.data.tune[pcfg.id]||{};if(tn.paint)player.traverse(o=>{if(o.isMesh&&/body|paint|exterior/i.test(o.material.name||'')){if(!o.userData.pc){o.material=o.material.clone();o.userData.pc=1}o.material.color.set(tn.paint)}});
 let n=player.getObjectByName('neon');if(tn.neon&&!n){n=new THREE.PointLight(0x00e5ff,6,8);n.name='neon';n.position.set(0,.25,0);player.add(n)}if(n)n.visible=!!tn.neon}
async function swap(){sc.remove(player);player=await carModel(pcfg,false);sc.add(player);refreshEff();applyLook()}
function garage(){const d=Save.data,l=$('#carl');$('#stat2').textContent=fmt(d.money)+' · '+t('lvl')+' '+Save.level();l.innerHTML='';
 for(const c of CARS){const own=d.owned.includes(c.id),ok=Save.level()>=c.level,r=mkEl(l,'','card'),e=stats(c,d.tune[c.id]),bar=(v,m)=>`<div class="bar"><i style="width:${Math.min(100,v/m*100)}%"></i></div>`;r.style.marginBottom='8px';
  r.innerHTML=`<div style="flex:1"><b>${c.name}</b><br><small>${Math.round(e.hp)} HP · ${Math.round(e.torque)} Nm · ${Math.round(e.weight)} kg · ${Math.round(e.top)} km/h</small>${bar(e.hp,220)}${bar(e.top,260)}<small>${own?'':fmt(c.price)}</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="pr"></button>${own?'<button class="alt tn">🔧</button>':''}</div>`;
  const bb=r.querySelector('.pr');bb.textContent=own?(d.car===c.id?'✓':t('use')):ok?t('buy'):'🔒 '+t('lvl')+' '+c.level;bb.disabled=!own&&(!ok||d.money<c.price);
  bb.onclick=()=>{if(!own){d.money-=c.price;d.owned.push(c.id)}d.car=c.id;Save.write();pcfg=c;refreshEff();if(playing)swap();garage()};const tn=r.querySelector('.tn');if(tn)tn.onclick=()=>tuneScr(c.id)}show('gar')}
function tuneScr(id){const c=CARS.find(x=>x.id===id),d=Save.data,tn=d.tune[id]||={},e=stats(c,tn),b=stats(c,{}),T=$('#tunel');
 T.innerHTML=`<div class="card" style="flex-direction:column;align-items:stretch"><b>${c.name}</b>`+[['HP',b.hp,e.hp],['Nm',b.torque,e.torque],['kg',b.weight,e.weight],['km/h',b.top,e.top],['0-100 s',b.t100,e.t100]].map(([n,x,y])=>{const f=n==='0-100 s'?1:0;return`<div style="display:flex;justify-content:space-between"><span>${n}</span><span>${x.toFixed(f)} → <b style="color:#7dffb0">${y.toFixed(f)}</b></span></div>`}).join('')+'</div>';
 for(const p of PARTS){const lv=tn[p.id]||0,row=mkEl(T,'','card'),max=lv>=3,pr=cost(p,c,lv+1);row.innerHTML=`<div><b>${p.icon} ${t(p.id)}</b><br><small>${'●'.repeat(lv)}${'○'.repeat(3-lv)}</small></div><button></button>`;
  const bt=row.lastChild;bt.textContent=max?'MAX':fmt(pr);bt.disabled=max||d.money<pr;bt.onclick=()=>{d.money-=pr;tn[p.id]=lv+1;Save.write();if(pcfg.id===id)refreshEff();tuneScr(id)}}
 const pc=mkEl(T,'','card');pc.innerHTML=`<span>🎨 ${t('paint')}</span><div class="grid" style="gap:6px;max-width:60%">`+PAINTS.map(h=>`<i class="sw" data-c="${h}" style="background:${h}"></i>`).join('')+'</div>';
 pc.querySelectorAll('.sw').forEach(s=>s.onclick=()=>{tn.paint=s.dataset.c;Save.write();if(player&&pcfg.id===id)applyLook()});
 const nn=mkEl(T,'','card');nn.innerHTML=`<span>💡 ${t('neon')}</span><input type="checkbox" ${tn.neon?'checked':''}>`;nn.querySelector('input').onchange=ev=>{tn.neon=ev.target.checked;Save.write();if(player&&pcfg.id===id)applyLook()};
 $('#stat3').textContent=fmt(d.money);show('tune')}
$('#tback').onclick=garage;
function mapsMenu(){const l=$('#mapl');l.innerHTML='';MAPS.forEach(m=>{const b=document.createElement('button');b.textContent='🗺 '+m.name;b.onclick=()=>{Snd.unlock();if(S.ctrl==='tilt'&&DeviceOrientationEvent.requestPermission)DeviceOrientationEvent.requestPermission();buildCtl();playing=false;startMap(m.id)};l.append(b)});show('maps')}
const sync=()=>{$('#sLang').value=S.lang;$('#sCtrl').value=S.ctrl;$('#sTr').value=S.traffic;$('#sTs').value=S.tspeed;$('#sMa').value=S.master;$('#sMu').value=S.music;$('#sSf').value=S.sfx;$('#sQ').value=S.quality;$('#sRes').value=S.scale;$('#sFps').value=S.fps;$('#sSh').checked=S.shadows;$('#sndinfo').textContent=Snd.info()+' · '+phone.info();$('#sPo').checked=S.post};
$('#bPlay').onclick=mapsMenu;$('#bGar').onclick=garage;$('#bSet').onclick=()=>{sync();show('set')};$('#bRes').onclick=()=>{show(null);$('#hud').style.display='block';$('#ctl').style.display='flex';paused=false;buildCtl()};
document.querySelectorAll('.x').forEach(b=>b.onclick=menu);
const bind=(id,k,fn,num=true,ev='oninput')=>$(id)[ev]=e=>{const v=e.target;S[k]=v.type==='checkbox'?v.checked:num?+v.value:v.value;Save.write();fn&&fn()};
bind('#sLang','lang',()=>{setLang(S.lang);sync()},false,'onchange');bind('#sCtrl','ctrl',buildCtl,false,'onchange');bind('#sTr','traffic');bind('#sTs','tspeed');
bind('#sMa','master',()=>{phone.vol();Snd.vol()});bind('#sMu','music',()=>phone.vol());bind('#sSf','sfx',()=>{Snd.vol();Snd.play('horn',.5)});bind('#sQ','quality',gfx,false,'onchange');bind('#sRes','scale',gfx);bind('#sFps','fps',null,true,'onchange');bind('#sSh','shadows',gfx,false,'onchange');bind('#sPo','post',gfx,false,'onchange');
$('#bCam').onclick=()=>camMode=(camMode+1)%3;$('#bMenu').onclick=menu;$('#bPh').onclick=()=>phone.toggle();

// ---------- Boot ----------
phone=initPhone({notify:s=>toast('📩 '+s),ctx:()=>({n:Save.data.name,m:Save.data.money,l:Save.level(),car:pcfg.name,tuned:Object.values(Save.data.tune[pcfg.id]||{}).filter(v=>typeof v==='number').reduce((a,b)=>a+b,0)}),S,money:()=>Save.data.money,level:()=>Save.level(),pause:p=>paused=p,snap:cb=>snapCb=cb,startJob});
Snd.init(S);Snd.bindGesture(()=>phone.autoplay());
for(const ev of['contextmenu','selectstart','gesturestart'])document.addEventListener(ev,e=>{if(!(e.target.closest&&e.target.closest('input,textarea')))e.preventDefault()},{passive:false});   // no Copy/Look Up menu, no pinch-zoomdocument.addEventListener('click',e=>{if(e.target.closest('button,.app,.row'))Snd.play('click',.6)},true);$('#bHorn').onclick=()=>Snd.play('horn');
(async()=>{pcfg=CARS.find(c=>c.id===Save.data.car);refreshEff();setLang(S.lang);gfx();buildCtl();menu();tick();   // menu is shown immediately
 const f=['maps/'+MAPS[0].file,...CARS.filter(c=>Save.data.owned.includes(c.id)).map(c=>'cars/'+c.file)];            // background preload (map first)
 for(const x of f){await new Promise(r=>setTimeout(r,300));try{await load('assets/models/'+x)}catch{console.warn('missing',x)}}})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
