import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CARS} from './config/carsConfig.js';
import {MAPS} from './config/mapsConfig.js';
import {Save} from './save.js';
import {t,setLang} from './i18n.js';
import {initPhone} from './phone.js';
import {Snd} from './audio.js';
import {Ground} from './ground.js';
import {Quests} from './quests.js';
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
function subGeo(g0,idx){const g=new THREE.BufferGeometry(),G=['getX','getY','getZ','getW'];for(const k in g0.attributes){const a=g0.attributes[k],n=a.itemSize,arr=new Float32Array(idx.length*n);for(let j=0;j<idx.length;j++)for(let q=0;q<n;q++)arr[j*n+q]=a[G[q]](idx[j]);g.setAttribute(k,new THREE.BufferAttribute(arr,n))}return g}
// Front wheels: finds the tyre/rim geometry (merged 4-in-1 or single wheel meshes), splits off the two front wheels, pivots each side on its axle centre
// and cancels any baked-in "turned left" pose, so wheel.rotation.y = rest - steering (see update()).
function rigWheels(m,wp,f){m.updateMatrixWorld(true);const c=Math.cos(f.phi),s=Math.sin(f.phi),v=new THREE.Vector3(),L=f.L,car=w=>[w.x*c+w.z*s,-w.x*s+w.z*c],cand=[],items=[];
 m.traverse(o=>{if(!o.isMesh||!o.geometry.attributes.position)return;const p=o.geometry.attributes.position,st=Math.max(1,p.count/2500|0);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;
  for(let i=0;i<p.count;i+=st){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const[X,Z]=car(v);x0=Math.min(x0,X);x1=Math.max(x1,X);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);z0=Math.min(z0,Z);z1=Math.max(z1,Z)}
  const h=y1-y0,zl=z1-z0,xl=x1-x0,zm=(z0+z1)/2,xm=(x0+x1)/2;if(y0-f.y0>.07*L||h<.09*L||h>.24*L)return;
  if(zl>.45*L&&zl<.9*L&&xl>.6*f.W)cand.push({o,all:1,zm,xm});else if(zl>.09*L&&zl<.26*L&&xl<.3*f.W&&zm>f.cz)cand.push({o,all:0,xm})});
 for(const cd of cand){const o=cd.o;if(!cd.all){items.push({o,g:o.geometry,sd:cd.xm<f.cx?0:1,whole:1});continue}
  const g0=o.geometry.index?o.geometry.toNonIndexed():o.geometry,p=g0.attributes.position,cl=[[],[]],rest=[];
  for(let t=0;t<p.count;t+=3){let X=0,Z=0;for(let q=0;q<3;q++){v.fromBufferAttribute(p,t+q).applyMatrix4(o.matrixWorld);const[a,b]=car(v);X+=a;Z+=b}X/=3;Z/=3;(Z>cd.zm?(X<cd.xm?cl[0]:cl[1]):rest).push(t,t+1,t+2)}
  if(!cl[0].length&&!cl[1].length)continue;o.geometry=subGeo(g0,rest);cl.forEach((idx,sd)=>{if(idx.length)items.push({o,g:subGeo(g0,idx),sd})})}
 const out=[];
 for(const sd of[0,1]){const its=items.filter(i=>i.sd===sd);if(!its.length)continue;const big=its.reduce((a,b)=>b.g.attributes.position.count>a.g.attributes.position.count?b:a),bp=big.g.attributes.position,st=Math.max(1,bp.count/2000|0),ctr=new THREE.Vector3(),P2=[];
  for(let i=0;i<bp.count;i+=st){v.fromBufferAttribute(bp,i).applyMatrix4(big.o.matrixWorld);ctr.add(v);P2.push(...car(v))}
  const n=P2.length/2;ctr.multiplyScalar(1/n);let mx=0,mz=0,sxx=0,szz=0,sxz=0;for(let i=0;i<n;i++){mx+=P2[2*i];mz+=P2[2*i+1]}mx/=n;mz/=n;
  for(let i=0;i<n;i++){const a=P2[2*i]-mx,b=P2[2*i+1]-mz;sxx+=a*a;szz+=b*b;sxz+=a*b}
  let d=.5*Math.atan2(2*sxz,sxx-szz)-Math.PI/2;d=((d+Math.PI/2)%Math.PI+Math.PI)%Math.PI-Math.PI/2;if(Math.abs(d)>.6)d=0;               // baked-in turn of this wheel
  const pv=new THREE.Group();pv.position.copy(ctr);pv.userData.rest=d;pv.rotation.y=d;wp.add(pv);out.push(pv);
  for(const it of its){const w=new THREE.Mesh(it.g,it.o.material);w.castShadow=true;w.matrix.makeTranslation(-ctr.x,-ctr.y,-ctr.z).multiply(it.o.matrixWorld);w.matrix.decompose(w.position,w.quaternion,w.scale);pv.add(w);if(it.whole&&it.o.parent)it.o.parent.remove(it.o)}}
 return out}
async function carModel(c,npc,cb){
 const m=(await load('assets/models/cars/'+c.file,cb)).clone(true),fl=!!c.flip!==!!(Save.data.flip&&Save.data.flip[c.id]),f=carFit(m,c.id+fl,fl),k=c.len/f.L;
 const wp=new THREE.Group(),ws=npc?[]:rigWheels(m,wp,f),pv=new THREE.Group();pv.add(m,wp);pv.rotation.y=f.phi;const w=new THREE.Group();w.add(pv);w.scale.setScalar(k);w.position.set(-f.cx*k,-f.y0*k,-f.cz*k);
 const g=new THREE.Group();g.add(w);g.rotation.order='YXZ';g.userData={len:c.len,h:(f.y1-f.y0)*k,wid:f.W*k,wheels:ws};
 m.traverse(o=>{if(o.isMesh){o.castShadow=!npc;if(npc)o.material=new THREE.MeshLambertMaterial({color:o.material.color||0xcccccc,map:o.material.map||null})}});return g}
let pT=0,pD=0,spawnId=0;const prog=p=>{pT=p},frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));

// ---------- State ----------
let msgT=45,frameN=0,droneOn=false,prevCam=0;const TR=CARS.filter(c=>c.npc!==false);let eff=null,map=null,root=null,ground=null,chunks=[],player=null,pcfg=null,traffic=[],job=null,beam=null,camMode=0,paused=false,playing=false,snapCb=null,lvl=1;
const P={x:0,z:0,h:0,v:0,s:0,hc:0,ay:0},M={cx:0,cz:0,B:100,gy:0};

// Finds the real road/ground height: ray-cast down on a grid, take the most common surface level (roads/ground cover the most area), spawn on it.
function findGround(root,b){const rc=new THREE.Raycaster(),o=new THREE.Vector3(),d=new THREE.Vector3(0,-1,0),pts=[],N=17,sp=Math.min(M.B*.6,350);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=M.cx+(i/(N-1)-.5)*2*sp,z=M.cz+(j/(N-1)-.5)*2*sp;const h=Ground.hit(x,z,b.max.y+20,0,b.max.y-b.min.y+40);if(h)pts.push({x,z,y:h.point.y,r:h})}
 if(!pts.length)return{y:b.min.y+.02,x:M.cx,z:M.cz};
 const bins={};pts.forEach(p=>{(bins[Math.round(p.y*2)]??=[]).push(p)});let best=null,bn=-1;
 for(const k of Object.keys(bins).map(Number)){const c=[...(bins[k-1]||[]),...bins[k],...(bins[k+1]||[])];if(c.length>bn){bn=c.length;best=c}}
 const gy=best.reduce((a,p)=>a+p.y,0)/best.length;Ground.calibrate(best.map(p=>p.r));best.sort((p,q)=>Math.hypot(p.x-M.cx,p.z-M.cz)-Math.hypot(q.x-M.cx,q.z-M.cz));
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
  ground=new THREE.Mesh(new THREE.PlaneGeometry(M.B*4,M.B*4),new THREE.MeshLambertMaterial({color:0x555a55}));ground.rotation.x=-Math.PI/2;ground.position.set(M.cx,b.min.y-4,M.cz);sc.add(ground);
  prog(.96);await frame();
  let nodes=root.children;while(nodes.length===1&&nodes[0].children.length>1)nodes=nodes[0].children;
  chunks=nodes.map(n=>{const bb=new THREE.Box3().setFromObject(n);return{n,c:bb.getCenter(new THREE.Vector3()),r:bb.getSize(new THREE.Vector3()).length()/2}});
  if(player)sc.remove(player);player=pm;sc.add(player);refreshEff();applyLook();
  Object.assign(P,{x:G.x,z:G.z,y:G.y,vy:0,pt:0,h:0,hc:0,v:0,s:0});Quests.reset();lvl=Save.level();
  traffic.forEach(n=>sc.remove(n.m));traffic=[];
  prog(1);await new Promise(r=>setTimeout(r,260));            // let the bar visibly reach 100%
  show(null);$('#hud').style.display='block';$('#ctl').style.display='flex';playing=true;paused=false;
  syncTraffic();                                               // NOT awaited: cars appear one by one while you already drive
 }catch(e){console.error(e);menu();$('#stat').textContent='⚠ '+(e.message||'load error')}}
async function syncTraffic(){const my=++spawnId,n=Math.round(S.traffic*50);while(traffic.length>n)sc.remove(traffic.pop().m);
 while(traffic.length<n&&my===spawnId){const i=traffic.length,m=await carModel(TR[i%TR.length],true);if(my!==spawnId)return;sc.add(m);const o={m,i,v:0,cv:0,a:0,at:0,tg:0,off:false,wait:0,pass:false,st:0,bad:0,turnT:0,pref:Math.random()<.5?1:-1};traffic.push(o);place(o,true);await new Promise(r=>setTimeout(r,60))}}
// ---- traffic AI: cars only exist on road cells (asphalt colour + flat + free overhead), keep to the right lane, turn at junctions, U-turn at dead ends ----
function edges(x,z,y,a){const f=sg=>{let miss=0;for(let d=1;d<=8;d++){const q=Ground.road(x-sg*Math.cos(a)*d,z+sg*Math.sin(a)*d,y);if(!q.ok){if(++miss>=2)return d-1}else miss=0}return 8};return{r:f(1),l:f(-1)}}
function think(n,dt3){const p=n.m.position,y=p.y,a=n.a,hr=Ground.h(p.x,p.z,y,1.1,12);if(hr===null||hr-y>1.1||y-hr>5){place(n);return}n.tg=hr;
 if(Ground.road(p.x,p.z,y).ok)n.bad=0;else if((n.bad+=dt3)>1.2){place(n);return}                                    // off the road for too long -> respawn on a road
 const ok=(ang,dist)=>{const q=Ground.road(p.x+Math.sin(ang)*dist,p.z+Math.cos(ang)*dist,y);return q.ok&&Math.abs(q.y-y)<.25*dist+.5},pr=n.pref;
 let best=null;if(ok(a,9)&&ok(a,16))best=0;else for(const d of[.3*pr,-.3*pr,.6*pr,-.6*pr,1.57*pr,-1.57*pr])if(ok(a+d,9)&&ok(a+d,15)){best=d;break}   // fixed side preference = no zig-zag
 if(best===null){if(ok(a+Math.PI,9))best=Math.PI;else{place(n);return}}
 const e=edges(p.x,p.z,y,a+(Math.abs(best)<1?best:0)),w=e.l+e.r;let steer=0;if(Math.abs(best)<1&&w>3&&w<22)steer=-clamp((e.r-w*.28)*.05,-.18,.18);   // gentle right-lane keeping
 if((n.turnT-=dt3)<0)n.turnT=0;if(best===0&&w>18&&n.turnT===0&&Math.random()<.015){const t=[1.57*pr,-1.57*pr].find(d=>ok(a+d,9)&&ok(a+d,15));if(t!==undefined){best=t;n.turnT=4}}
 n.at=a+best+steer;let lim=n.v;const sa=Math.sin(a),ca=Math.cos(a);
 for(const o of traffic){if(o===n||o.off)continue;const dx=o.m.position.x-p.x,dz=o.m.position.z-p.z,f=dx*sa+dz*ca;if(f>0&&f<12&&Math.abs(dx*ca-dz*sa)<2.4)lim=Math.min(lim,f<5?0:o.cv*.9)}
 {const dx=P.x-p.x,dz=P.z-p.z,f=dx*sa+dz*ca;if(f>0&&f<12&&Math.abs(dx*ca-dz*sa)<2.4&&Math.abs(P.y-y)<2.5)lim=Math.min(lim,f<6?0:Math.max(0,P.v)*.9)}
 n.lim=lim;if(Ground.wall(p.x,y,p.z,sa,ca,6,1)){n.at=a+Math.PI;n.cv*=.5}}
function place(n,init){n.pass=false;
 for(let t=0;t<60;t++){const a0=Math.random()*6.283,d=init?30+Math.random()*190:130+Math.random()*110,x=P.x+Math.sin(a0)*d,z=P.z+Math.cos(a0)*d,r0=Ground.road(x,z,P.y);
  if(!r0.ok||Math.abs(r0.y-P.y)>9||Math.hypot(x-P.x,z-P.z)<20)continue;let ba=0,bl=0;
  for(let k=0;k<12;k++){const a=k*.5236+Math.random()*.1;let l=0;for(let q=10;q<=50;q+=10){const c=Ground.road(x+Math.sin(a)*q,z+Math.cos(a)*q,r0.y);if(c.ok&&Math.abs(c.y-r0.y)<.3*q+.5)l=q;else break}if(l>bl){bl=l;ba=a}}
  if(bl<30)continue;const e=edges(x,z,r0.y,ba),w=e.l+e.r,off=w>3?clamp(e.r-w*.28,-4,4):0;
  n.a=n.at=ba;n.v=n.cv=n.lim=(9+Math.random()*7)*S.tspeed;n.st=0;n.bad=0;n.turnT=0;n.m.position.set(x-Math.cos(ba)*off,r0.y,z+Math.sin(ba)*off);n.m.rotation.y=ba;n.tg=r0.y;n.off=false;n.m.visible=true;return}
 n.off=true;n.wait=.25;n.m.visible=false}

// ---------- Input ----------
const keys={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=1;if(e.code==='KeyH')Snd.play('horn');if(e.code==='KeyC')setCam((camMode+1)%4)});addEventListener('keyup',e=>keys[e.code]=0);
const inp={l:0,r:0,gas:0,brk:0,axis:0};let holding=false,wr=0,tiltRaw=null,tiltN=null,tiltF=0;
const mkEl=(p,id,cls,html='')=>{const e=document.createElement('div');if(id)e.id=id;if(cls)e.className=cls;e.innerHTML=html;p.append(e);return e};
function btn(p,cls,txt,k){const b=mkEl(p,'','pb '+cls,txt);b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);inp[k]=1;b.classList.add('on')};b.onpointerup=b.onpointercancel=()=>{inp[k]=0;b.classList.remove('on')}}
const IC=p=>`<svg viewBox="0 0 24 24">${p}</svg>`,I_L=IC('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),I_R=IC('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),I_GAS=IC('<path d="M6 11l6-6 6 6M6 18l6-6 6 6"/>'),I_BRK=IC('<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>');
const I_UP=IC('<path d="M5.5 14.5L12 8l6.5 6.5"/>'),I_DN=IC('<path d="M5.5 9.5L12 16l6.5-6.5"/>'),I_UPA=IC('<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5"/>'),I_DNA=IC('<path d="M12 5v13M6.5 12.5L12 18l5.5-5.5"/>'),
 I_YL=IC('<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5"/>'),I_YR=IC('<path d="M21 12a9 9 0 11-9-9 9 9 0 016.4 2.6L21 8M21 3v5h-5"/>'),
 I_EYE=IC('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),I_X=IC('<path d="M6 6l12 12M18 6L6 18"/>');
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
 if(dt&&!droneOn){let a=0;
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
  const hl=pcfg.len*.38,hF=Ground.h(P.x+fx*hl,P.z+fz*hl,P.y,.9,40,.55),hR=Ground.h(P.x-fx*hl,P.z-fz*hl,P.y,.9,40,.55),hC=Ground.h(P.x,P.z,P.y,.9,40,.55);let grounded=false;
  const hs=[hF,hR,hC].filter(v=>v!==null);
  if(hs.length){const tY=hC!==null?hC:(hF!==null&&hR!==null?(hF+hR)/2:hs[0]);
   if(hF!==null&&hR!==null&&Math.abs(hF-hR)<hl*2.4)P.pt+=(Math.atan2(hF-hR,hl*2)-P.pt)*Math.min(1,dt*10);
   if(tY>=P.y-.3||P.y-tY<.35){P.y+=(tY-P.y)*Math.min(1,dt*16);P.vy=0;grounded=true}else{P.vy-=25*dt;P.y+=P.vy*dt;if(P.y<tY){P.y=tY;P.vy=0;grounded=true}}}
  else{P.vy-=25*dt;P.y+=P.vy*dt}
  if(grounded){P.air=0;if((P.gt=(P.gt||0)+dt)>.4){P.gt=0;P.lg={x:P.x,y:P.y,z:P.z,h:P.h}}}                                                       // remember last safe spot
  else if((P.air=(P.air||0)+dt)>1.6&&P.lg){P.x=P.lg.x;P.y=P.lg.y+.3;P.z=P.lg.z;P.h=P.lg.h;P.v=0;P.vy=0;P.air=0}                                   // fell through / off the map: back to last safe spot
  if(P.y<M.sy-80){P.x=M.sx;P.z=M.sz;P.y=M.sy;P.v=0;P.vy=0;P.pt=0}} // invisible walls
 player.position.set(P.x,P.y,P.z);player.rotation.x=-P.pt;player.rotation.y=P.h;for(const w of player.userData.wheels||[])w.rotation.y=w.userData.rest-P.s*.5;player.rotation.z=clamp(-P.ay*.006,-.05,.05);
 const sn=80/smSize;V.set(Math.round(P.x/sn)*sn,P.y,Math.round(P.z/sn)*sn);sun.target.position.copy(V);sun.position.set(V.x+80,P.y+120,V.z+40); // texel-snapped shadows (no shimmer)
 for(const c of chunks)c.n.visible=V.set(c.c.x-P.x,0,c.c.z-P.z).length()-c.r<map.cullDist;
 frameN++;
 for(const n of traffic){
  if(n.off){if((n.wait-=dt)<=0)place(n);continue}
  const ps=n.m.position;if(dt&&(frameN+n.i)%3===0)think(n,dt*3);if(n.off)continue;
  const da=angd(n.at,n.a);n.a+=clamp(da,-1.4*dt,1.4*dt);n.cv+=(Math.min(n.v,n.lim)*(1-.45*Math.min(1,Math.abs(da)))-n.cv)*Math.min(1,dt*2);
  ps.x+=Math.sin(n.a)*n.cv*dt;ps.z+=Math.cos(n.a)*n.cv*dt;n.m.rotation.y=n.a;ps.y+=(n.tg-ps.y)*Math.min(1,dt*8);
  if(dt){if(n.cv<.3){if((n.st+=dt)>6){place(n);continue}}else n.st=0}
  const dx=ps.x-P.x,dz=ps.z-P.z,d=Math.hypot(dx,dz);n.m.visible=d<150;   // far cars are simulated but not drawn
  if(d>300||Math.abs(ps.x-M.cx)>M.B||Math.abs(ps.z-M.cz)>M.B){place(n);continue}
  const near=!droneOn&&Math.abs(ps.y-P.y)<2.5;
  if(d<2.7&&dt&&near){const nx=-dx/(d||1),nz=-dz/(d||1);P.x+=nx*(2.7-d);P.z+=nz*(2.7-d);P.v*=.55;crashFx()}
  else if(near&&!n.pass&&P.v>12){const lat=dx*Math.cos(P.h)-dz*Math.sin(P.h),lon=dx*Math.sin(P.h)+dz*Math.cos(P.h);
   if(Math.abs(lat)<2.8&&Math.abs(lon)<3){n.pass=true;const c=Math.abs(lat)<1.9,v=c?1200:600;addMoney(v);Snd.play(c?'cash':'pass');toast((c?t('near')+' ':'')+'+'+v+' '+t('cur'))}}}
 if(dt&&kmh>60)addMoney(kmh*dt*.5);Quests.update(dt);if(dt&&(msgT-=dt)<=0){msgT=70+Math.random()*80;phone.incoming()}
 $('#spd').textContent=Math.round(kmh);$('#spdw').style.setProperty('--p',Math.min(100,kmh/eff.top*100));$('#mon').textContent=fmt(Save.data.money)+' · '+t('lvl')+' '+Save.level();$('#xpb i').style.width=(Math.sqrt(Save.data.xp/40)%1)*100+'%';
 Snd.engine(kmh,!!gas,eff.top,dt>0);
 // cameras: heading-damped chase (no stitching), frame-rate independent smoothing
 const len=pcfg.len,h=player.userData.h;P.hc+=angd(P.h,P.hc)*(1-Math.exp(-5*dt));const sx=Math.sin(P.h),sz=Math.cos(P.h);
 if(droneOn){droneCam(dt)}
 else if(camMode===0){const dist=len*1.5+3.2+kmh*.012;orb.yaw=angd(orb.yaw,0);if(!orb.drag&&(orb.t+=dt)>2.2){const k=1-Math.exp(-3*dt);orb.yaw-=orb.yaw*k;orb.pitch-=orb.pitch*k}
  const ang=P.hc+orb.yaw,cp=Math.cos(orb.pitch);V.set(P.x-Math.sin(ang)*cp*dist,P.y+h+1.1+len*.12+Math.sin(orb.pitch)*dist,P.z-Math.cos(ang)*cp*dist);
  cam.position.lerp(V,dt?1-Math.exp(-(orb.drag?20:11)*dt):1);const lk=3*Math.max(0,1-Math.abs(orb.yaw)*2);cam.lookAt(P.x+sx*lk,P.y+h*.8,P.z+sz*lk);cam.fov+=(62+kmh*.12-cam.fov)*Math.min(1,dt*3)}
 else if(camMode===1){cam.position.set(P.x+sz*.38+sx*.1,P.y+h*.82,P.z-sx*.38+sz*.1);cam.lookAt(P.x+sx*12-P.s*sz*2,P.y+h*.8,P.z+sz*12+P.s*sx*2);cam.fov=70}
 else if(camMode===3){cam.position.set(fc.x,fc.y,fc.z);const cp=Math.cos(fc.pitch);cam.lookAt(fc.x+Math.sin(fc.yaw)*cp,fc.y+Math.sin(fc.pitch),fc.z+Math.cos(fc.yaw)*cp);cam.fov=65}
 else{const a=performance.now()/5000;V.set(P.x+Math.sin(a)*(len*2+4),P.y+1.6+Math.sin(a*.7),P.z+Math.cos(a)*(len*2+4));cam.position.lerp(V,dt?1-Math.exp(-3*dt):1);cam.lookAt(P.x,P.y+h*.6,P.z);cam.fov=55}
 cam.updateProjectionMatrix();player.visible=droneOn||camMode!==1;
 const nl=Save.level();if(nl>lvl){lvl=nl;Snd.play('levelup');const bn=15000*nl;Save.data.money+=bn;toast('⬆ '+t('lvl')+' '+nl+' · +'+bn+' '+t('cur'))}}
function addMoney(v,xp=v/60){Save.data.money+=v;Save.data.xp+=xp}   // fast progression: 600 DA pass = 10 XP, level 2 at 40 XP
function toast(s){const e=$('#toast');e.textContent=s;clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',1400);Save.write()}
function startJob(){Quests.start('cargo')}

// ---- Free camera (mode 4 of the camera button / C key): 1 finger = look, 2 fingers = pan + pinch zoom, mouse: drag look, right-drag pan, wheel zoom ----
const fc={x:0,y:0,z:0,yaw:0,pitch:0},ptr=new Map();let pc=null,pd=0;
function setCam(m){camMode=m;if(m===3){cam.getWorldDirection(V);fc.x=cam.position.x;fc.y=cam.position.y;fc.z=cam.position.z;fc.yaw=Math.atan2(V.x,V.z);fc.pitch=Math.asin(clamp(V.y,-1,1));toast('🎥 '+t('freecam'))}}
function fmove(r,u,f){const ry=fc.yaw,cp=Math.cos(fc.pitch);fc.x+=-Math.cos(ry)*r+Math.sin(ry)*cp*f;fc.z+=Math.sin(ry)*r+Math.cos(ry)*cp*f;fc.y+=u+Math.sin(fc.pitch)*f}
{const cv=R.domElement;
 cv.addEventListener('pointerdown',e=>{if(camMode!==3&&!droneOn)return;cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});pc=null});
 const up=e=>{ptr.delete(e.pointerId);pc=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
 cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p||(camMode!==3&&!droneOn))return;const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptr.size===1){const dx=p.x-ox,dy=p.y-oy;if(e.buttons&2&&!droneOn)fmove(-dx*.04,dy*.04,0);else{const T=droneOn?drone:fc;T.yaw-=dx*.005;T.pitch=clamp(T.pitch-dy*.005,-1.5,1.5)}}
  else if(ptr.size===2&&!droneOn){const[a,b]=[...ptr.values()],cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,d=Math.hypot(a.x-b.x,a.y-b.y);if(pc){fmove(-(cx-pc.x)*.04,(cy-pc.y)*.04,(d-pd)*.08)}pc={x:cx,y:cy};pd=d}});
 cv.addEventListener('wheel',e=>{if(camMode===3){e.preventDefault();fmove(0,0,-e.deltaY*.05)}},{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault())}
// ---- Drone mode (phone app): car is anchored, free-flying camera, only drone controls + one exit button are shown ----
const drone={x:0,y:0,z:0,yaw:0,pitch:-.3,vx:0,vy:0,vz:0},dk={};let eyeOn=false,hiT=0;
function buildDrone(){const d=$('#drone'),b=(k,ic)=>`<div class="pb db" data-k="${k}">${ic}</div>`,e='<div></div>';
 d.innerHTML=`<div class="dg dl">${e+b('f',I_UP)+e+b('l',I_L)+e+b('r',I_R)+e+b('b',I_DN)+e}</div><div class="dg dr">${e+b('u',I_UPA)+e+b('yl',I_YL)+e+b('yr',I_YR)+e+b('d',I_DNA)+e}</div>
  <button id="dEye" class="ib">${I_EYE}</button><button id="dExit" class="dexit">${I_X}<span data-t="exitdrone"></span></button>`;
 d.querySelectorAll('.db').forEach(x=>{const k=x.dataset.k;x.onpointerdown=ev=>{ev.preventDefault();x.setPointerCapture(ev.pointerId);dk[k]=1;x.classList.add('on')};x.onpointerup=x.onpointercancel=()=>{dk[k]=0;x.classList.remove('on')}});
 $('#dEye').onclick=()=>{eyeOn=!eyeOn;d.classList.toggle('hi',eyeOn);$('#dEye').classList.toggle('act',eyeOn)};$('#dExit').onclick=stopDrone;setLang(S.lang)}
function flashHi(){const d=$('#drone');d.classList.add('hi');clearTimeout(hiT);hiT=setTimeout(()=>{if(!eyeOn)d.classList.remove('hi')},2500)}
function startDrone(){if(!playing)return;droneOn=true;prevCam=camMode;P.v=0;paused=false;const sx=Math.sin(P.h),sz=Math.cos(P.h);
 Object.assign(drone,{x:P.x-sx*7,y:P.y+7,z:P.z-sz*7,yaw:P.h,pitch:-.4,vx:0,vy:0,vz:0});document.body.classList.add('drone');$('#drone').classList.remove('hi');eyeOn=false;$('#dEye').classList.remove('act');flashHi();toast('🛸 '+t('dronehint'))}
function stopDrone(){droneOn=false;for(const k in dk)dk[k]=0;document.body.classList.remove('drone');camMode=prevCam}
function droneCam(dt){const K=k=>keys[k]?1:0,fwd=(dk.f||K('KeyW')||K('ArrowUp')?1:0)-(dk.b||K('KeyS')||K('ArrowDown')?1:0),str=(dk.r||K('KeyD')||K('ArrowRight')?1:0)-(dk.l||K('KeyA')||K('ArrowLeft')?1:0),
  up=(dk.u||K('KeyR')?1:0)-(dk.d||K('KeyF')?1:0),yw=(dk.yl||K('KeyQ')?1:0)-(dk.yr||K('KeyE')?1:0);
 drone.yaw+=yw*1.6*dt;const sy=Math.sin(drone.yaw),cy=Math.cos(drone.yaw),k=Math.min(1,dt*5),sp=24;
 drone.vx+=((sy*fwd-cy*str)*sp-drone.vx)*k;drone.vz+=((cy*fwd+sy*str)*sp-drone.vz)*k;drone.vy+=(up*14-drone.vy)*k;
 drone.x=clamp(drone.x+drone.vx*dt,M.cx-M.B,M.cx+M.B);drone.z=clamp(drone.z+drone.vz*dt,M.cz-M.B,M.cz+M.B);drone.y=Math.min(P.y+150,drone.y+drone.vy*dt);
 const g=Ground.h(drone.x,drone.z,drone.y,0,300);if(g!==null)drone.y=Math.max(drone.y,g+1.5);                       // never flies through the ground
 cam.position.set(drone.x,drone.y,drone.z);const cp=Math.cos(drone.pitch);cam.lookAt(drone.x+Math.sin(drone.yaw)*cp,drone.y+Math.sin(drone.pitch),drone.z+Math.cos(drone.yaw)*cp);cam.fov=75}
// ---- Orbit: drag on the screen while in the follow camera to swing around the car; it keeps following and eases back behind the car ----
const orb={yaw:0,pitch:0,t:0,drag:false};let oid=null,ox=0,oy=0;
{const cv=R.domElement;cv.addEventListener('pointerdown',e=>{if(camMode!==0||droneOn)return;oid=e.pointerId;ox=e.clientX;oy=e.clientY;orb.drag=true;cv.setPointerCapture(e.pointerId)});
 cv.addEventListener('pointermove',e=>{if(e.pointerId!==oid)return;orb.yaw-=(e.clientX-ox)*.006;orb.pitch=clamp(orb.pitch+(e.clientY-oy)*.004,-.05,1.2);ox=e.clientX;oy=e.clientY;orb.t=0});
 const end=e=>{if(e.pointerId===oid){oid=null;orb.drag=false;orb.t=0}};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end)}
// ---------- Menus ----------
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.toggle('on',s.id===id))}
function menu(){const live=playing;paused=live;$('#hud').style.display=$('#ctl').style.display='none';$('#bRes').style.display=live?'':'none';$('#stat').textContent=fmt(Save.data.money)+' · '+t('lvl')+' '+Save.level();show('menu');if(map&&root&&playing)syncTraffic()}
const refreshEff=()=>{eff=stats(pcfg,Save.data.tune[pcfg.id]);Snd.setCar(pcfg.id)};let cd=0;function crashFx(v=1){if(performance.now()-cd>600){cd=performance.now();Snd.play('crash',v);Quests.crash()}}
function applyLook(){const tn=Save.data.tune[pcfg.id]||{};if(tn.paint)player.traverse(o=>{if(o.isMesh&&/body|paint|exterior/i.test(o.material.name||'')){if(!o.userData.pc){o.material=o.material.clone();o.userData.pc=1}o.material.color.set(tn.paint)}});
 let n=player.getObjectByName('neon');if(tn.neon&&!n){n=new THREE.PointLight(0x00e5ff,6,8);n.name='neon';n.position.set(0,.25,0);player.add(n)}if(n)n.visible=!!tn.neon}
async function swap(){sc.remove(player);player=await carModel(pcfg,false);sc.add(player);refreshEff();applyLook()}
function garage(){const d=Save.data,l=$('#carl');$('#stat2').textContent=fmt(d.money)+' · '+t('lvl')+' '+Save.level();l.innerHTML='';
 for(const c of CARS){const own=d.owned.includes(c.id),ok=Save.level()>=c.level,r=mkEl(l,'','card'),e=stats(c,d.tune[c.id]),bar=(v,m)=>`<div class="bar"><i style="width:${Math.min(100,v/m*100)}%"></i></div>`;r.style.marginBottom='8px';
  r.innerHTML=`<div style="flex:1"><b>${c.name}</b><br><small>${Math.round(e.hp)} HP · ${Math.round(e.torque)} Nm · ${Math.round(e.weight)} kg · ${Math.round(e.top)} km/h</small>${bar(e.hp,220)}${bar(e.top,260)}<small>${own?'':fmt(c.price)}</small></div><div style="display:flex;flex-direction:column;gap:6px"><button class="pr"></button>${own?'<button class="alt tn">🔧</button><button class="alt fl">⇄</button>':''}</div>`;
  const bb=r.querySelector('.pr');bb.textContent=own?(d.car===c.id?'✓':t('use')):ok?t('buy'):'🔒 '+t('lvl')+' '+c.level;bb.disabled=!own&&(!ok||d.money<c.price);
  bb.onclick=()=>{if(!own){d.money-=c.price;d.owned.push(c.id)}d.car=c.id;Save.write();pcfg=c;refreshEff();if(playing)swap();garage()};const tn=r.querySelector('.tn');if(tn)tn.onclick=()=>tuneScr(c.id);const fl=r.querySelector('.fl');if(fl)fl.onclick=()=>{const F=d.flip||={};F[c.id]=!F[c.id];Save.write();if(playing&&pcfg.id===c.id)swap()}}show('gar')}
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
$('#bCam').onclick=()=>setCam((camMode+1)%4);$('#bMenu').onclick=menu;$('#bPh').onclick=()=>phone.toggle();

// ---------- Boot ----------
phone=initPhone({quests:Quests,drone:startDrone,notify:s=>toast('📩 '+s),ctx:()=>({n:Save.data.name,m:Save.data.money,l:Save.level(),car:pcfg.name,tuned:Object.values(Save.data.tune[pcfg.id]||{}).filter(v=>typeof v==='number').reduce((a,b)=>a+b,0)}),S,money:()=>Save.data.money,level:()=>Save.level(),pause:p=>paused=p,snap:cb=>snapCb=cb,startJob});
Quests.init({scene:sc,P,M,Ground,Snd,toast,addMoney,level:()=>Save.level(),hud:$('#jobp')});buildDrone();R.domElement.addEventListener('pointerdown',()=>{if(droneOn)flashHi()});Snd.init(S);Snd.bindGesture(()=>phone.autoplay());
for(const ev of['contextmenu','selectstart','gesturestart','gesturechange','gestureend'])document.addEventListener(ev,e=>{if(!(e.target.closest&&e.target.closest('input,textarea')))e.preventDefault()},{passive:false});   // no Copy/Look Up menu, no pinch-zoom
{let lt=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-lt<350&&!(e.target.closest&&e.target.closest('button,input,select,textarea,.pb,.db,.ib,.row,.app,.card')))e.preventDefault();lt=n},{passive:false});   // double-tap zoom
 document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});                                                                                                          // two-finger pinch
 if(window.visualViewport)visualViewport.addEventListener('resize',()=>{if(visualViewport.scale>1.01){const m=document.querySelector('meta[name=viewport]');m.content='width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover';scrollTo(0,0)}})}   // auto-reset if it ever zoomsdocument.addEventListener('click',e=>{if(e.target.closest('button,.app,.row'))Snd.play('click',.6)},true);$('#bHorn').onclick=()=>Snd.play('horn');
(async()=>{pcfg=CARS.find(c=>c.id===Save.data.car);refreshEff();setLang(S.lang);gfx();buildCtl();menu();tick();   // menu is shown immediately
 const f=['maps/'+MAPS[0].file,...CARS.filter(c=>Save.data.owned.includes(c.id)).map(c=>'cars/'+c.file)];            // background preload (map first)
 for(const x of f){await new Promise(r=>setTimeout(r,300));try{await load('assets/models/'+x)}catch{console.warn('missing',x)}}})();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
