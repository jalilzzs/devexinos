// Real terrain: height under any point + wall detection, using the map's own triangles (slopes, ramps, bridges).
// A 32 m grid index keeps queries tiny; three-mesh-bvh (lazy, only for big meshes) makes them fast. Falls back to plain raycasts if the CDN import fails.
import * as THREE from 'three';
const rc=new THREE.Raycaster(),o=new THREE.Vector3(),D=new THREE.Vector3(0,-1,0),U=new THREE.Vector3(0,1,0),cvs=document.createElement('canvas'),cx=(cvs.width=cvs.height=1,cvs.getContext('2d',{willReadFrequently:true})),H=new THREE.Vector3(),nv=new THREE.Vector3(),C=32,key=(i,j)=>(i+2048)*4096+j+2048;
function cast(L){const out=[];for(const m of L){const mt=m.material,arr=Array.isArray(mt)?mt:[mt],old=arr.map(x=>x.side);arr.forEach(x=>x.side=THREE.DoubleSide);m.raycast(rc,out);arr.forEach((x,i)=>x.side=old[i])}return out.sort((a,b)=>a.distance-b.distance)}
export const Ground={idx:new Map(),cache:new Map(),wc:new Map(),ref:null,fast:false,
 ready:import('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.6.8/build/index.module.js').then(m=>{THREE.Mesh.prototype.raycast=m.acceleratedRaycast;THREE.BufferGeometry.prototype.computeBoundsTree=m.computeBoundsTree;rc.firstHitOnly=true;Ground.fast=true}).catch(e=>console.warn('BVH unavailable, collisions use plain raycast',e)),
 build(root){this.idx.clear();this.cache.clear();this.wc.clear();this.ref=null;root.updateMatrixWorld(true);const b=new THREE.Box3();
  root.traverse(m=>{if(!m.isMesh)return;b.setFromObject(m);if(b.isEmpty())return;
   for(let i=Math.floor(b.min.x/C);i<=Math.floor(b.max.x/C);i++)for(let j=Math.floor(b.min.z/C);j<=Math.floor(b.max.z/C);j++){const k=key(i,j);let L=this.idx.get(k);if(!L)this.idx.set(k,L=[]);L.push(m)}})},
 list(x,z){return this.idx.get(key(Math.floor(x/C),Math.floor(z/C)))},
 prep(L){if(L.p===this.fast+1)return;if(this.fast)for(const m of L){const g=m.geometry;if(!g.boundsTree&&!g.userData.nb&&(g.index?g.index.count:g.attributes.position.count)>7500){try{g.computeBoundsTree({maxLeafTris:12})}catch{g.userData.nb=1}}}L.p=this.fast+1},
 // first walkable surface below (x, y+up): ignores bridges/roofs above and steep faces (sign-independent, so flipped triangles still count)
 hit(x,z,y,up=1.4,far=80,mn=.3){const L=this.list(x,z);if(!L)return null;this.prep(L);rc.near=0;rc.far=far+up;rc.set(o.set(x,y+up,z),D);
  for(const r of cast(L)){r.ny=r.face?Math.abs(nv.copy(r.face.normal).transformDirection(r.object.matrixWorld).y):1;if(r.ny<mn)continue;return r}return null},
 h(x,z,y,up=1.4,far=80,mn=.3){const r=this.hit(x,z,y,up,far,mn);return r?r.point.y:null},
 up(x,y,z,len){const L=this.list(x,z);if(!L)return false;this.prep(L);rc.near=0;rc.far=len;rc.set(o.set(x,y+.15,z),U);return cast(L).length>0},
 // colour of the map texture under a hit (null if untextured)
 pix(r){const mt=Array.isArray(r.object.material)?r.object.material[r.face.materialIndex]:r.object.material,im=mt&&mt.map&&mt.map.image;if(!im||!r.uv)return null;
  let u=r.uv.x%1,v=r.uv.y%1;if(u<0)u+=1;if(v<0)v+=1;if(mt.map.flipY)v=1-v;
  try{cx.drawImage(im,Math.min(im.width-1,u*im.width|0),Math.min(im.height-1,v*im.height|0),1,1,0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return[d[0],d[1],d[2]]}catch{return null}},
 // asphalt colour = median colour of the surfaces at street level around the spawn
 calibrate(rs){const c=rs.map(r=>this.pix(r)).filter(Boolean);if(c.length<6){this.ref=null;console.warn('road colour: no texture data, using geometry only');return}
  const med=i=>c.map(p=>p[i]).sort((a,b)=>a-b)[c.length>>1];this.ref=[med(0),med(1),med(2)];console.log('road colour',this.ref,'from',c.length,'samples')},
 // is (x,z) at height ~y a drivable road cell? cached on a 1.5 m grid. {ok,y}
 road(x,z,y){const k=((Math.round(x/1.5)+4096)*8192+Math.round(z/1.5)+4096)*64+Math.round(y/3)+32;let c=this.cache.get(k);if(c)return c;
  const r=this.hit(x,z,y,1.8,10);c={ok:false,y};
  if(r){c.y=r.point.y;let ok=r.ny>.88;if(ok&&this.ref){const p=this.pix(r);if(p){const m=Math.max(Math.abs(p[0]-this.ref[0]),Math.abs(p[1]-this.ref[1]),Math.abs(p[2]-this.ref[2]));ok=m<=50||(p[0]>140&&p[1]>110&&p[2]<95)}}   // asphalt or yellow marking
   c.ok=ok&&!this.up(x,c.y,z,2.2)}                                                                                                                       // nothing overhead (buildings, low ceilings)
  this.cache.set(k,c);return c},
 // horizontal rays (center + both sides) at bumper height; steep faces = walls/buildings/barriers, climbable slopes are ignored
 // can a person stand here? (flat enough, free overhead) - roads, pavements, squares
 walk(x,z,y){const k=((Math.round(x/1.5)+4096)*8192+Math.round(z/1.5)+4096)*64+Math.round(y/3)+32;let c=this.wc.get(k);if(c)return c;const r=this.hit(x,z,y,1.8,10);c={ok:false,y};
  if(r){c.y=r.point.y;c.ok=r.ny>.85&&!this.up(x,c.y,z,2)}this.wc.set(k,c);return c},
 // weighted A* over road cells (mode 'road', 5 m grid) or walkable cells (mode 'walk', 4 m grid); yields to the browser every ~7 ms. -> [{x,y,z}] or null
 async path(a,b,mode='road',max=2500){const step=mode==='road'?5:4,chk=mode==='road'?(x,z,y)=>this.road(x,z,y):(x,z,y)=>this.walk(x,z,y),sn=v=>Math.round(v/step),key=(i,j)=>i*100003+j,
   si=sn(a.x),sj=sn(a.z),gi=sn(b.x),gj=sn(b.z),open=[{i:si,j:sj,y:a.y,g:0,f:0}],best=new Map([[key(si,sj),0]]),par=new Map(),D=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];let n=0,t0=performance.now();
  while(open.length&&n<max){let bi=0;for(let q=1;q<open.length;q++)if(open[q].f<open[bi].f)bi=q;const c=open.splice(bi,1)[0];n++;
   if(Math.abs(c.i-gi)<=1&&Math.abs(c.j-gj)<=1){const pts=[];for(let nd=c;nd;nd=par.get(key(nd.i,nd.j)))pts.push({x:nd.i*step,y:nd.y,z:nd.j*step});pts.reverse();pts.push({x:b.x,y:b.y,z:b.z});return pts}
   for(const[di,dj]of D){const ni=c.i+di,nj=c.j+dj,q=chk(ni*step,nj*step,c.y);if(!q.ok||Math.abs(q.y-c.y)>.3*step+.4)continue;
    if(!chk((c.i+ni)/2*step,(c.j+nj)/2*step,(c.y+q.y)/2).ok)continue;const g=c.g+Math.hypot(di,dj)*step,k=key(ni,nj);if(best.has(k)&&best.get(k)<=g)continue;
    best.set(k,g);par.set(k,c);open.push({i:ni,j:nj,y:q.y,g,f:g+1.4*Math.hypot(ni-gi,nj-gj)*step})}
   if(performance.now()-t0>7){await new Promise(r=>setTimeout(r,0));t0=performance.now()}}
  return null},
 // horizontal rays at two heights (low + bumper) x (centre + both sides): anything steeper than ~41 deg is a wall
 wall(x,y,z,fx,fz,dist,half){const rx=fz,rz=-fx;for(const hy of[.3,.9])for(const off of[0,-half,half]){const ox=x+rx*off,oz=z+rz*off,A=this.list(ox,oz),B=this.list(ox+fx*dist,oz+fz*dist);
  for(const L of A===B?[A]:[A,B]){if(!L)continue;this.prep(L);rc.near=0;rc.far=dist;rc.set(o.set(ox,y+hy,oz),H.set(fx,0,fz));
   for(const r of cast(L)){if(r.face&&Math.abs(nv.copy(r.face.normal).transformDirection(r.object.matrixWorld).y)>.75)continue;return r}}}return null}
};
