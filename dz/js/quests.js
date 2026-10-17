// Missions (car + on foot). Targets are picked on reachable cells, a route is searched with A* (Ground.path) and drawn on the ground.
import * as THREE from 'three';
import {t} from './i18n.js';
const T={taxi:{ico:'🚕',col:0x35e08a,base:6000,per:22,kind:'ab'},cargo:{ico:'📦',col:0xffd84a,base:8000,per:28,kind:'ab'},speed:{ico:'⚡',col:0x35b7ff,base:12000,kind:'speed'},steal:{ico:'🥷',col:0xff4d6d,base:30000,per:60,kind:'ab'},
 courier:{ico:'🚶',col:0x7dffb0,base:4000,per:35,kind:'ab',foot:1},collect:{ico:'🧺',col:0xffa94d,base:6000,kind:'pts',foot:1},run:{ico:'🏃',col:0x9b8cff,base:7000,kind:'speed',foot:1,min:14}};
const fmt=n=>Math.round(n).toLocaleString('fr-DZ')+' '+t('cur'),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),plen=p=>p.reduce((s,q,i)=>i?s+dist(q,p[i-1]):0,0);
export const Quests={types:Object.keys(T),cur:null,starting:false,ico:k=>T[k].ico,foot:k=>!!T[k].foot,
 init(c){this.c=c;const g=new THREE.Group();this.beam=new THREE.Mesh(new THREE.CylinderGeometry(3,3,90,16,1,true),new THREE.MeshBasicMaterial({color:0xffd84a,transparent:true,opacity:.35,side:THREE.DoubleSide,fog:false}));
  this.gem=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),new THREE.MeshBasicMaterial({color:0xffd84a,fog:false}));g.add(this.beam,this.gem);g.visible=false;this.g=g;c.scene.add(g);
  this.rm=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0x35e08a,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false,fog:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  this.rm.renderOrder=3;this.rm.frustumCulled=false;this.rm.visible=false;c.scene.add(this.rm)},
 estimate(k,lv){const x=T[k];return Math.round((x.kind==='speed'?x.base+(x.foot?6000:16000):x.kind==='pts'?x.base+7500:x.base+x.per*(x.foot?240:300))*(1+.15*lv))},
 spot(from,mode,min,max){const c=this.c,G=c.Ground;for(let i=0;i<60;i++){const a=Math.random()*6.283,d=min+Math.random()*(max-min),x=from.x+Math.sin(a)*d,z=from.z+Math.cos(a)*d;
  if(Math.abs(x-c.M.cx)>c.M.B-25||Math.abs(z-c.M.cz)>c.M.B-25)continue;const r=mode==='walk'?G.walk(x,z,from.y):G.road(x,z,from.y);if(r.ok&&Math.abs(r.y-from.y)<8)return{x,z,y:r.y}}return null},
 none(){this.c.toast(t('q_none'));return false},
 draw(pts){const g=this.rm.geometry,n=pts.length;if(n<2){this.rm.visible=false;return}const pos=new Float32Array(n*6),idx=[];
  for(let i=0;i<n;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(n-1,i+1)];let dx=b.x-a.x,dz=b.z-a.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const w=.9,y=pts[i].y+.35;
   pos.set([pts[i].x-dz*w,y,pts[i].z+dx*w,pts[i].x+dz*w,y,pts[i].z-dx*w],i*6);if(i)idx.push(2*i-2,2*i-1,2*i,2*i-1,2*i+1,2*i)}
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(idx);g.computeBoundingSphere();this.rm.visible=true},
 async start(k){const c=this.c,x=T[k];if(this.cur||this.starting){c.toast('⚠ '+t('q_busy'));return false}
  if(!x.foot&&c.onFoot()){c.toast('⚠ '+t('q_incar'));return false}if(x.foot&&!c.goFoot())return false;
  this.starting=true;c.toast('🧭 '+t('q_route'));const G=c.Ground,P=x.foot?c.foot:c.P,me={x:P.x,z:P.z,y:P.y},mode=x.foot?'walk':'road',lv=c.level(),
   m={k,x,kind:x.kind,lv,mult:1+.15*lv,stage:0,crash:0,slow:0,i:0,foot:!!x.foot,rt:null,rtT:0,dT:0,busy:false},sp=x.foot?2.4:8;
  try{
   if(x.kind==='ab'){for(let tr=0;tr<6&&!m.B;tr++){const A=this.spot(me,mode,x.foot?60:110,x.foot?160:320),p1=A&&await G.path(me,A,mode);if(!p1)continue;
     const B=this.spot(A,mode,x.foot?120:k==='steal'?220:180,x.foot?320:520),p2=B&&await G.path(A,B,mode);if(p2){m.A=A;m.B=B;m.r1=p1;m.r2=p2}}
    if(!m.B)return this.none();m.rt=m.r1;m.t=2*(plen(m.r1)/sp+40)}
   else{const nP=x.kind==='pts'?5:x.foot?4:5,lo=x.kind==='pts'?35:x.foot?60:110,hi=x.kind==='pts'?90:x.foot?150:230;m.pts=[];m.min=x.min||Math.min(110,60+lv*4);let first=null;
    for(let tr=0;tr<6&&!first;tr++){const s=this.spot(me,mode,lo,hi);if(!s)continue;const p=await G.path(me,s,mode);if(p){first=p;m.pts=[s]}}if(!first)return this.none();
    let f=m.pts[0];for(let i=1;i<nP;i++){const s=this.spot(f,mode,lo,hi);if(!s)break;m.pts.push(s);f=s}if(m.pts.length<3)return this.none();
    m.rt=first;m.t=2*(plen(first)/(x.kind==='pts'?2.2:m.min/3.6*.7)+(x.kind==='pts'?25:20))}
  }finally{this.starting=false}
  this.cur=m;for(const o of[this.beam.material,this.gem.material,this.rm.material])o.color.setHex(x.col);this.g.visible=true;c.toast(x.ico+' '+t('q_'+k));return true},
 target(m){return m.kind==='ab'?(m.stage?m.B:m.A):m.pts[m.i]},
 async reroute(m,from){if(m.busy)return;m.busy=true;const c=this.c,tg=this.target(m),p=await c.Ground.path(from,tg,m.foot?'walk':'road');m.busy=false;if(this.cur===m&&p&&this.target(m)===tg)m.rt=p},
 crash(){const m=this.cur;if(!m||m.foot)return;m.crash++;if(m.k==='steal'&&m.stage&&m.crash>=3)this.fail('q_caught')},
 fail(k){this.c.toast('✖ '+t(k));this.stop()},
 stop(){this.cur=null;if(this.g){this.g.visible=false;this.rm.visible=false}if(this.c)this.c.hud.textContent=''},
 reset(){this.stop()},cancel(){this.stop()},
 done(rew,xp){const c=this.c;c.addMoney(Math.round(rew),Math.round(xp));c.Snd.play('levelup');c.toast('✔ '+t('q_done')+' +'+fmt(rew)+' · +'+Math.round(xp)+' XP');this.stop()},
 update(dt){const m=this.cur;if(!m)return;const c=this.c,P=m.foot?c.foot:c.P,kmh=Math.abs(P.v)*3.6,tg=this.target(m),d=dist(tg,P),lvl=Math.abs(tg.y-P.y)<6,R=m.foot?3.5:9,CR=m.foot?4.5:14;
  this.g.position.set(tg.x,tg.y+45,tg.z);this.gem.position.y=-43+Math.sin(performance.now()/300)*.5;this.gem.rotation.y+=dt*2;if((m.t-=dt)<=0)return this.fail('q_time');
  // route: trim what is behind you, redraw, re-plan if you leave it
  const rt=m.rt;if(rt&&rt.length>1){while(rt.length>2&&(dist(rt[0],P)<9||dist(rt[1],P)<dist(rt[0],P)))rt.shift()}
  if((m.dT-=dt)<=0){m.dT=.3;if(rt&&rt.length>1)this.draw([{x:P.x,y:P.y,z:P.z},...rt]);else this.rm.visible=false}
  if((m.rtT-=dt)<=0&&(!rt||dist(rt[0],P)>40)){m.rtT=4;this.reroute(m,{x:P.x,y:P.y,z:P.z})}
  const rem=rt&&rt.length?plen(rt)+dist(P,rt[0]):d;let txt=T[m.k].ico+' ';
  if(m.kind==='ab')txt+=t(m.stage?'q_drop':'q_pick');else if(m.kind==='pts')txt+=t('q_parcel')+' '+(m.i+1)+'/'+m.pts.length;else txt+=t('q_cp')+' '+(m.i+1)+'/'+m.pts.length+' · ⚡ '+Math.round(kmh)+'/'+m.min;
  txt+=' · '+Math.round(rem)+' m · '+Math.max(0,Math.ceil(m.t))+' s';
  if(m.kind==='speed'){if(kmh<m.min){if((m.slow+=dt)>5)return this.fail('q_slow')}else m.slow=Math.max(0,m.slow-dt*2);if(m.slow>0)txt+=' ⚠'}
  if(m.kind!=='ab'){if(d<CR&&lvl){m.i++;c.Snd.play('cash');m.rt=null;
    if(m.i>=m.pts.length)return this.done(m.kind==='pts'?m.x.base*m.mult:(m.x.base+4000*m.pts.length)*m.mult,60+30*m.pts.length);
    if(m.kind==='pts')c.addMoney(1500*m.mult);const n=m.pts[m.i];m.t=2*(dist(tg,n)*1.4/(m.kind==='pts'?2.2:m.min/3.6*.7)+(m.kind==='pts'?25:15));this.reroute(m,{x:tg.x,y:tg.y,z:tg.z});c.toast('✔ '+(m.kind==='pts'?t('q_parcel'):t('q_cp'))+' '+m.i)}}
  else if(d<R&&lvl){if(m.foot||kmh<22){c.Snd.play('cash');
    if(!m.stage){m.stage=1;m.rt=m.r2;m.t=2*(plen(m.r2)/(m.foot?2.4:7)+35);c.toast('✔ '+t('q_obj'+m.k))}
    else{const x=m.x,dd=dist(m.A,m.B),pen=m.k==='taxi'?Math.max(.4,1-.12*m.crash):m.k==='cargo'?Math.max(.3,1-.15*m.crash):1;return this.done((x.base+x.per*dd)*m.mult*pen,(50+dd*.1)*(1+.1*m.lv)*(m.k==='steal'?2:1))}}else txt+=' 🐢'}
  c.hud.textContent=txt}
};
