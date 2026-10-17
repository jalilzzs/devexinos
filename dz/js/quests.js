// Missions: taxi (passenger), cargo, speed checkpoints, steal. Targets are always picked on real road cells (Ground.road).
import * as THREE from 'three';
import {t} from './i18n.js';
const T={taxi:{ico:'🚕',col:0x35e08a,base:6000,per:22},cargo:{ico:'📦',col:0xffd84a,base:8000,per:28},speed:{ico:'⚡',col:0x35b7ff,base:12000,per:0},steal:{ico:'🥷',col:0xff4d6d,base:30000,per:60}};
const fmt=n=>Math.round(n).toLocaleString('fr-DZ')+' '+t('cur'),dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const Quests={types:Object.keys(T),cur:null,ico:k=>T[k].ico,
 init(c){this.c=c;const g=new THREE.Group();this.beam=new THREE.Mesh(new THREE.CylinderGeometry(3,3,90,16,1,true),new THREE.MeshBasicMaterial({color:0xffd84a,transparent:true,opacity:.35,side:THREE.DoubleSide,fog:false}));
  this.gem=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2),new THREE.MeshBasicMaterial({color:0xffd84a,fog:false}));g.add(this.beam,this.gem);g.visible=false;this.g=g;c.scene.add(g)},
 estimate(k,lv){const x=T[k];return Math.round((k==='speed'?x.base+16000:x.base+x.per*300)*(1+.15*lv))},
 spot(from,min,max){const c=this.c;for(let i=0;i<60;i++){const a=Math.random()*6.283,d=min+Math.random()*(max-min),x=from.x+Math.sin(a)*d,z=from.z+Math.cos(a)*d;
  if(Math.abs(x-c.M.cx)>c.M.B-25||Math.abs(z-c.M.cz)>c.M.B-25)continue;const r=c.Ground.road(x,z,from.y);if(r.ok&&Math.abs(r.y-from.y)<8)return{x,z,y:r.y}}return null},
 start(k){const c=this.c,P=c.P;if(this.cur){c.toast('⚠ '+t('q_busy'));return false}const lv=c.level(),m={k,lv,mult:1+.15*lv,stage:0,crash:0,slow:0,i:0},me={x:P.x,z:P.z,y:P.y};
  if(k==='speed'){m.min=Math.min(110,60+lv*4);m.pts=[];let f=me;for(let i=0;i<5;i++){const s=this.spot(f,110,230);if(!s)break;m.pts.push(s);f=s}if(m.pts.length<3){c.toast(t('q_none'));return false}m.t=dist(me,m.pts[0])/(m.min/3.6*.7)+20}
  else{const A=this.spot(me,110,320),B=A&&this.spot(A,k==='steal'?220:180,520);if(!B){c.toast(t('q_none'));return false}m.A=A;m.B=B;m.t=dist(me,A)/8+40}
  this.cur=m;this.beam.material.color.setHex(T[k].col);this.gem.material.color.setHex(T[k].col);this.g.visible=true;c.toast(T[k].ico+' '+t('q_'+k));return true},
 target(m){return m.k==='speed'?m.pts[m.i]:m.stage?m.B:m.A},
 crash(){const m=this.cur;if(!m)return;m.crash++;if(m.k==='steal'&&m.stage&&m.crash>=3)this.fail('q_caught')},
 fail(k){this.c.toast('✖ '+t(k));this.stop()},
 stop(){this.cur=null;if(this.g)this.g.visible=false;if(this.c)this.c.hud.textContent=''},
 reset(){this.stop()},cancel(){this.stop()},
 done(rew,xp){const c=this.c;c.addMoney(Math.round(rew),Math.round(xp));c.Snd.play('levelup');c.toast('✔ '+t('q_done')+' +'+fmt(rew)+' · +'+Math.round(xp)+' XP');this.stop()},
 update(dt){const m=this.cur;if(!m)return;const c=this.c,P=c.P,kmh=Math.abs(P.v)*3.6,tg=this.target(m),d=dist(tg,P),lvl=Math.abs(tg.y-P.y)<6;
  this.g.position.set(tg.x,tg.y+45,tg.z);this.gem.position.y=-43+Math.sin(performance.now()/300)*.5;this.gem.rotation.y+=dt*2;if((m.t-=dt)<=0)return this.fail('q_time');
  let txt=T[m.k].ico+' '+(m.k==='speed'?t('q_cp')+' '+(m.i+1)+'/'+m.pts.length+' · ⚡ '+Math.round(kmh)+'/'+m.min:t(m.stage?'q_drop':'q_pick'))+' · '+Math.round(d)+' m · '+Math.max(0,Math.ceil(m.t))+' s';
  if(m.k==='speed'){if(kmh<m.min){if((m.slow+=dt)>5)return this.fail('q_slow')}else m.slow=Math.max(0,m.slow-dt*2);if(m.slow>0)txt+=' ⚠';
   if(d<14&&lvl){m.i++;c.Snd.play('cash');if(m.i>=m.pts.length)return this.done((12000+4000*m.pts.length)*m.mult,60+30*m.pts.length);m.t=dist(tg,m.pts[m.i])/(m.min/3.6*.7)+15;c.toast('✔ '+t('q_cp')+' '+m.i)}}
  else if(d<9&&lvl){if(kmh<22){c.Snd.play('cash');
    if(!m.stage){m.stage=1;m.t=dist(m.A,m.B)/7+35;c.toast('✔ '+t('q_obj'+m.k))}
    else{const x=T[m.k],dd=dist(m.A,m.B),pen=m.k==='taxi'?Math.max(.4,1-.12*m.crash):m.k==='cargo'?Math.max(.3,1-.15*m.crash):1;return this.done((x.base+x.per*dd)*m.mult*pen,(50+dd*.1)*(1+.1*m.lv)*(m.k==='steal'?2:1))}}else txt+=' 🐢'}
  c.hud.textContent=txt}
};
