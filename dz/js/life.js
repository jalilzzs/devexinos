// Daily life: hunger, energy, day/night clock, food (bag + fridge), eating, sleeping, desk work, reading, tea, TV, wardrobe.
import {t} from './i18n.js';
export const FOODS={bread:{ico:'🥖',price:150,h:15},milk:{ico:'🥛',price:120,h:10,e:3},apple:{ico:'🍎',price:200,h:12},dates:{ico:'🌴',price:100,h:8,e:4},couscous:{ico:'🍲',price:600,h:45},chakh:{ico:'🍛',price:800,h:50,e:5},tea:{ico:'🍵',price:80,h:3,e:8}};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),hex=n=>'#'+n.toString(16).padStart(6,'0'),
 mix=(a,b,k)=>{k=clamp(k,0,1);const f=s=>Math.round((a>>s&255)*(1-k)+(b>>s&255)*k);return f(16)<<16|f(8)<<8|f(0)},SW=[0x1d6fe0,0xe0243c,0x1fa36b,0xffd166,0x7a4bff,0x111111,0xf2efe6,0xff7a3c];
export const Life={act:null,acc:0,warn:30,usable:['fridge','bed','table','sofa','armchair','chair','desk','wardrobe','bookshelf','kitchen','tv'],
 init(c){this.c=c;const S=c.Save.data;S.hunger??=80;S.energy??=80;S.time??=9;S.bag||={};S.fridge||={};this.hud=document.getElementById('needs');this.draw();this.applyTime()},
 mult(){const S=this.c.Save.data;return S.hunger<20||S.energy<20?.7:1},   // hungry or tired = 30% less pay / XP
 update(dt){const c=this.c,S=c.Save.data;if(!dt)return;S.time=(S.time+dt/120)%24;S.hunger=Math.max(0,S.hunger-dt/25);S.energy=Math.max(0,S.energy-dt/40);   // 1 game hour = 2 min
  if((this.acc+=dt)>.5){this.acc=0;this.draw();this.applyTime()}
  if((this.warn-=dt)<=0&&(S.hunger<20||S.energy<20)){this.warn=60;c.toast('⚠ '+t(S.hunger<20?'hungry':'tired'))}
  const a=this.act;if(a){a.t-=dt;const b=document.getElementById('abar');if(b)b.style.width=(1-a.t/a.T)*100+'%';if(a.t<=0){this.act=null;document.getElementById('modal').style.display='none';c.foot.busy=false;a.done();c.Save.write()}}},
 draw(){const S=this.c.Save.data,h=Math.floor(S.time),m=Math.floor((S.time-h)*60),lo=v=>v<20?' style="color:#ff6b81"':'';
  this.hud.innerHTML=`<span${lo(S.hunger)}>🍞 ${Math.round(S.hunger)}%</span> <span${lo(S.energy)}>⚡ ${Math.round(S.energy)}%</span> 🕐 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`},
 // sky, sun, fog and exposure follow the clock (interiors stay bright)
 applyTime(){const c=this.c;if(c.garage())return;const h=c.Save.data.time,inH=c.interior(),d=inH?.85:Math.pow(clamp(Math.sin((h-6)/12*Math.PI),0,1),.7),
   dusk=inH?0:clamp(1-Math.abs(h-6.2)/1.2,0,1)+clamp(1-Math.abs(h-18)/1.2,0,1);let top=mix(0x04060d,0x2f7fd1,d),mid=mix(0x0a1226,0x8fc8f0,d),bot=mix(0x1a2240,0xf4e3bd,d);
  top=mix(top,0x5a3a6a,dusk*.5);mid=mix(mid,0xc9788a,dusk*.7);bot=mix(bot,0xff9a5a,dusk*.8);c.setSky(hex(top),hex(mid),hex(bot));c.fog.color.setHex(bot);c.sun.intensity=.12+1.6*d;c.hemi.intensity=.3+.9*d;c.R.toneMappingExposure=.95+.15*d},
 modal(html,wire){const m=document.getElementById('modal');m.innerHTML='<div class="mbox">'+html+'</div>';m.style.display='flex';m.onclick=e=>{if(e.target===m&&!this.act)this.close()};wire&&wire(m)},
 close(){document.getElementById('modal').style.display='none';if(!this.act)this.c.foot.busy=false},
 activity(ico,label,secs,done){this.c.foot.busy=true;this.act={t:secs,T:secs,done};this.modal(`<h3>${ico} ${label}</h3><div class="bar2"><i id="abar"></i></div><button class="alt" id="acan">${t('cancel')}</button>`,m=>m.querySelector('#acan').onclick=()=>{this.act=null;this.close()})},
 eat(k,pct,where){const c=this.c,S=c.Save.data,F=FOODS[k],src=where==='fridge'?S.fridge[c.home()]:S.bag;if(!src||!(src[k]>0))return false;src[k]--;S.hunger=Math.min(100,S.hunger+F.h*pct);S.energy=Math.min(100,S.energy+(F.e||0)*pct);c.addMoney(0,pct>.9?4:2);c.Snd.play('cash');c.Save.write();return true},
 rows(src,btns){const o=Object.entries(src||{}).filter(([k,n])=>n>0);return o.length?o.map(([k,n])=>`<div class="mrow"><span>${FOODS[k].ico} ${t('fd_'+k)} ×${n}</span><span>${btns(k)}</span></div>`).join(''):`<small>${t('empty')}</small>`},
 eatMenu(pct){const S=this.c.Save.data,hid=this.c.home(),b=k=>`<button data-k="${k}" data-w="bag">${t('eat')}</button>`,f=k=>`<button data-k="${k}" data-w="fridge">${t('eat')}</button>`;
  this.modal(`<h3>🍽 ${t('a_eat')}</h3><h5>🎒 ${t('bagt')}</h5>${this.rows(S.bag,b)}`+(hid?`<h5>🧊 ${t('fridget')}</h5>${this.rows(S.fridge[hid],f)}`:'')+`<button class="alt" id="mx">${t('close')}</button>`,m=>{
   m.querySelectorAll('[data-k]').forEach(x=>x.onclick=()=>{const k=x.dataset.k,w=x.dataset.w;this.close();this.activity(FOODS[k].ico,t('a_eat'),2.5,()=>this.eat(k,pct,w))});m.querySelector('#mx').onclick=()=>this.close()})},
 fridge(){const S=this.c.Save.data,hid=this.c.home(),F=S.fridge[hid]||={},draw=()=>this.modal(`<h3>🧊 ${t('fridget')}</h3>${this.rows(F,k=>`<button data-t="${k}">${t('take')}</button>`)}<h5>🎒 ${t('bagt')}</h5>${this.rows(S.bag,k=>`<button data-p="${k}">${t('putin')}</button>`)}<button class="alt" id="mx">${t('close')}</button>`,m=>{
   m.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const k=b.dataset.t;F[k]--;S.bag[k]=(S.bag[k]||0)+1;this.c.Save.write();draw()});m.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const k=b.dataset.p;S.bag[k]--;F[k]=(F[k]||0)+1;this.c.Save.write();draw()});m.querySelector('#mx').onclick=()=>this.close()});this.c.foot.busy=true;draw()},
 sleepMenu(){const S=this.c.Save.data,morning=Math.max(2,Math.round((6-S.time+24)%24));this.c.foot.busy=true;
  this.modal(`<h3>🛏 ${t('sleepq')}</h3><div class="mrow"><button data-h="4">4 h</button><button data-h="8">8 h</button><button data-h="${morning}">${t('s6')}</button></div><button class="alt" id="mx">${t('close')}</button>`,m=>{
   m.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{this.close();this.sleep(+b.dataset.h)});m.querySelector('#mx').onclick=()=>this.close()})},
 sleep(h){const c=this.c,S=c.Save.data;c.foot.busy=true;c.fade(()=>{S.time=(S.time+h)%24;S.energy=Math.min(100,S.energy+h*12);S.hunger=Math.max(5,S.hunger-h*3);this.applyTime();this.draw();c.Save.write();c.foot.busy=false});c.toast('😴 '+t('sleepq')+' · '+h+' h')},
 sitMenu(){const S=this.c.Save.data;this.c.foot.busy=true;this.modal(`<h3>🛋</h3><button id="rs">${t('a_sit')}</button><button class="alt" id="mx">${t('stand')}</button>`,m=>{
   m.querySelector('#rs').onclick=()=>{this.close();this.c.foot.busy=true;this.activity('🛋',t('a_rest'),10,()=>{S.energy=Math.min(100,S.energy+10)})};m.querySelector('#mx').onclick=()=>{this.close();this.c.stand()}})},
 wardrobe(){this.c.foot.busy=true;this.modal(`<h3>👕 ${t('wardt')}</h3><div class="grid" style="gap:10px;justify-content:center">${SW.map(x=>`<i class="sw" data-c="${x}" style="background:${hex(x)};width:44px;height:44px"></i>`).join('')}</div><button class="alt" id="mx">${t('close')}</button>`,m=>{
   m.querySelectorAll('.sw').forEach(s=>s.onclick=()=>this.c.setShirt(+s.dataset.c));m.querySelector('#mx').onclick=()=>this.close()})},
 action(it){const c=this.c,S=c.Save.data,L=this;switch(it.k){
  case'fridge':return{ico:'🧊',fn:()=>L.fridge()};case'bed':return{ico:'🛏',fn:()=>L.sleepMenu()};case'table':return{ico:'🍽',fn:()=>c.sit(it,true)};case'sofa':case'armchair':case'chair':return{ico:'🪑',fn:()=>c.sit(it,false)};
  case'desk':return{ico:'💻',fn:()=>L.activity('💻',t('a_work'),20,()=>{c.addMoney(3000*(1+.1*c.level()),12);S.energy=Math.max(0,S.energy-12)})};case'wardrobe':return{ico:'👕',fn:()=>L.wardrobe()};
  case'bookshelf':return{ico:'📖',fn:()=>L.activity('📖',t('a_read'),8,()=>c.addMoney(0,20))};case'kitchen':return{ico:'☕',fn:()=>L.activity('☕',t('a_tea'),4,()=>{S.energy=Math.min(100,S.energy+8)})};
  case'tv':return{ico:'📺',fn:()=>L.activity('📺',t('a_tv'),10,()=>{S.energy=Math.min(100,S.energy+5)})}}return null},
 // phone "Bag" app: eat anywhere (60% effect)
 bagHtml(){const S=this.c.Save.data,h=Math.floor(S.time),m=Math.floor((S.time-h)*60);return`<div class="row"><b>🍞 ${Math.round(S.hunger)}% · ⚡ ${Math.round(S.energy)}% · 🕐 ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}</b></div>`+this.rows(S.bag,k=>`<button data-k="${k}" style="min-width:0;padding:8px 12px">${t('eat')}</button>`)},
 wireBag(root,again){root.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{this.eat(b.dataset.k,.6,'bag');again()})}
};
