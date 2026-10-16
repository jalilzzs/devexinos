// Real terrain: height under any point + wall detection, using the map's own triangles (slopes, ramps, bridges).
// A 32 m grid index keeps queries tiny; three-mesh-bvh (lazy, only for big meshes) makes them fast. Falls back to plain raycasts if the CDN import fails.
import * as THREE from 'three';
const rc=new THREE.Raycaster(),o=new THREE.Vector3(),D=new THREE.Vector3(0,-1,0),H=new THREE.Vector3(),nv=new THREE.Vector3(),C=32,key=(i,j)=>(i+2048)*4096+j+2048;
export const Ground={idx:new Map(),fast:false,
 ready:import('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.6.8/build/index.module.js').then(m=>{THREE.Mesh.prototype.raycast=m.acceleratedRaycast;THREE.BufferGeometry.prototype.computeBoundsTree=m.computeBoundsTree;rc.firstHitOnly=true;Ground.fast=true}).catch(e=>console.warn('BVH unavailable, collisions use plain raycast',e)),
 build(root){this.idx.clear();root.updateMatrixWorld(true);const b=new THREE.Box3();
  root.traverse(m=>{if(!m.isMesh)return;b.setFromObject(m);if(b.isEmpty())return;
   for(let i=Math.floor(b.min.x/C);i<=Math.floor(b.max.x/C);i++)for(let j=Math.floor(b.min.z/C);j<=Math.floor(b.max.z/C);j++){const k=key(i,j);let L=this.idx.get(k);if(!L)this.idx.set(k,L=[]);L.push(m)}})},
 list(x,z){return this.idx.get(key(Math.floor(x/C),Math.floor(z/C)))},
 prep(L){if(L.p===this.fast+1)return;if(this.fast)for(const m of L){const g=m.geometry;if(!g.boundsTree&&!g.userData.nb&&(g.index?g.index.count:g.attributes.position.count)>7500){try{g.computeBoundsTree({maxLeafTris:12})}catch{g.userData.nb=1}}}L.p=this.fast+1},
 // surface height below (x, y+up); ignores bridges/roofs above that point and near-vertical faces. null = nothing there.
 h(x,z,y,up=1.4,far=80){const L=this.list(x,z);if(!L)return null;this.prep(L);rc.near=0;rc.far=far+up;rc.set(o.set(x,y+up,z),D);
  for(const r of rc.intersectObjects(L,false)){if(r.face&&nv.copy(r.face.normal).transformDirection(r.object.matrixWorld).y<.3)continue;return r.point.y}return null},
 // horizontal rays (center + both sides) at bumper height; steep faces = walls/buildings/barriers, climbable slopes are ignored
 wall(x,y,z,fx,fz,dist,half){const rx=fz,rz=-fx;for(const off of[0,-half,half]){const ox=x+rx*off,oz=z+rz*off,A=this.list(ox,oz),B=this.list(ox+fx*dist,oz+fz*dist);
  for(const L of A===B?[A]:[A,B]){if(!L)continue;this.prep(L);rc.near=0;rc.far=dist;rc.set(o.set(ox,y+.55,oz),H.set(fx,0,fz));
   for(const r of rc.intersectObjects(L,false)){if(r.face&&nv.copy(r.face.normal).transformDirection(r.object.matrixWorld).y>.55)continue;return r}}}return null}
};
