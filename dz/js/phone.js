import {t,lang} from './i18n.js';
import {Save} from './save.js';
import {reply,opener,CHIPS} from './chat.js';
import {Snd} from './audio.js';
const $=s=>document.querySelector(s);const SIL='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
export const CONTACTS=[{n:'Mama',i:'❤️',k:'mama',d:'Mama, a loving Algerian mother who worries about her son/daughter driving; mixes Darija and French'},{n:'Baba',i:'👨',k:'baba',d:'Baba, calm Algerian father, loves football (Les Fennecs) and gives driving advice'},
{n:'Yacine (Khoya)',i:'🧔',k:'friend',d:'Yacine, best friend from Algiers, jokes in Darija/French slang'},{n:'Amine – Mécano',i:'🔧',k:'amine',d:'Amine, mechanic in Algiers who upsells tuning parts (turbo, ECU, tires)'},
{n:'Karim – Taxi Alger',i:'🚕',k:'taxi',d:'Karim, Algiers taxi driver who knows every street and shortcut'},{n:'Lynda',i:'👩',k:'lynda',d:'Lynda, friendly and witty friend from Algiers'},
{n:'Samir – Livraison',i:'📦',k:'samir',d:'Samir, delivery boss who offers 15,000 DA delivery jobs'},{n:'Sofiane – Course',i:'🏁',k:'sofiane',d:'Sofiane, street-racing buddy who loves challenges'}];
export function initPhone(api){
 const el=$('#phone'),pb=$('#pb'),S=api.S;let tracks=[],names=[],ti=0,gal=[],started=false,want=false,unl=false,userPaused=false,probed=false;const au=new Audio();au.preload='auto';
 const vol=()=>au.volume=S.master*S.music;
 (async()=>{const B=['assets/audio/','audio/','public/audio/','assets/music/','music/','assets/',''],U=p=>new URL(p,document.baseURI).href,
   ok=async u=>{const ac=new AbortController();try{const r=await fetch(u,{headers:{Range:'bytes=0-1'},cache:'no-store',signal:ac.signal});const g=(r.status===200||r.status===206)&&!/html|json|text/i.test(r.headers.get('content-type')||'');ac.abort();return g}catch{return false}};
  for(const b of B){try{const r=await fetch(U(b+'playlist.json'),{cache:'no-store'});if(r.ok&&/json/i.test(r.headers.get('content-type')||'')){for(const f of await r.json()){tracks.push(U(b+f));names.push(String(f).replace(/\.[^.]+$/,''))}}}catch{}if(tracks.length)break}   // optional playlist.json = any file names
  if(!tracks.length)for(const b of B){for(let i=1;i<=80;i++){let u=null;for(const p of['music','Music'])for(const x of['mp3','m4a','ogg','wav','MP3']){if(u)break;const c=U(`${b}${p}${i}.${x}`);if(await ok(c))u=c}if(!u)break;tracks.push(u);names.push('music'+i);if(want&&!started)nextT(0)}if(tracks.length)break}
  console.log('music tracks found:',tracks.length,tracks[0]||'');probed=true})();
 au.onended=()=>{if(started)nextT(1)};au.onerror=()=>console.warn('music error',au.error&&au.error.code,au.src);
 const nm=i=>names[i]||decodeURIComponent((tracks[i]||'').split('/').pop().split('?')[0]),nextT=d=>{if(!tracks.length)return;started=true;userPaused=false;ti=(ti+d+tracks.length)%tracks.length;au.src=tracks[ti];vol();au.play().catch(()=>{});if($('#trk'))$('#trk').textContent='♪ '+nm(ti)};
 const clock=()=>{$('#pt').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});$('#pm').textContent=Math.floor(api.money()).toLocaleString()+' '+t('cur')};
 function home(){el.classList.remove('cam');api.pause(true);clock();
  pb.innerHTML='<div class="apps">'+[['contacts','💬','contacts'],['camera','📷','camera'],['missions','📋','missions'],['places','📍','places'],['drone','🛸','drone'],['music','🎵','musicapp'],['bank','🏦','bank'],['photos','🖼','photos']].map(a=>`<div class="app" data-a="${a[0]}"><b>${a[1]}</b>${t(a[2])}</div>`).join('')+'</div>';
  pb.querySelectorAll('.app').forEach(x=>x.onclick=()=>app(x.dataset.a))}
 function chat(c){const th=Save.data.chats[c.k]||=[];pb.innerHTML=`<div class="row"><b>${c.i} ${c.n}</b><button class="alt" id="cb" style="min-width:0;padding:4px 12px">←</button></div><div id="msgs"></div><div class="chips">${CHIPS[S.lang].map(x=>`<button class="chip alt">${x}</button>`).join('')}</div><div class="send"><input id="ci" placeholder="${t('typemsg')}" autocomplete="off"><button id="cs" style="min-width:0;padding:10px 14px">➤</button></div>`;
  const box=$('#msgs'),draw=()=>{box.innerHTML=th.slice(-30).map(m=>`<div class="msg ${m.w}">${m.t.replace(/</g,'&lt;')}${m.act?`<br><button class="acc">${t('accept')}</button>`:''}</div>`).join('');box.scrollTop=box.scrollHeight;
   box.querySelectorAll('.acc').forEach(b=>b.onclick=()=>{api.startJob();api.pause(false);el.classList.remove('on')})};
  draw();$('#cb').onclick=()=>app('contacts');
  const send=async()=>{const i=$('#ci'),v=i.value.trim();if(!v)return;i.value='';th.push({w:'me',t:v});draw();box.insertAdjacentHTML('beforeend','<div class="msg them">…</div>');box.scrollTop=box.scrollHeight;
   const r=reply(c,v,api.ctx(),S.lang);await new Promise(o=>setTimeout(o,500+Math.random()*600));if(r.name)Save.data.name=r.name;Snd.play('message');
   th.push({w:'them',t:r.text,act:c.k==='samir'&&r.intent==='job'});if(th.length>60)th.splice(0,th.length-60);Save.write();draw()};
  $('#cs').onclick=send;pb.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{$('#ci').value=b.textContent;send()});$('#ci').onkeydown=e=>{if(e.key==='Enter')send()}}
 function app(a){if(a==='drone'){close();api.drone();return}
  if(a==='places'){const H=api.home,fm=n=>Math.round(n).toLocaleString('fr-DZ')+' '+t('cur'),btn='style="min-width:0;padding:8px 12px"';
   pb.innerHTML='<h4>🏠 '+t('p_houses')+'</h4>'+H.houses().map(h=>`<div class="row"><span>${h.ico} <b>${t('hs_'+h.id)}</b><br><small>${h.w}×${h.d} m · ${h.owned?'✓ '+t('owned'):fm(h.price)}</small></span><span>${h.owned?'':`<button data-b="${h.id}" ${btn}>${t('buy')}</button>`} <button class="alt" data-g="${h.id}" ${btn}>🧭</button></span></div>`).join('')
    +'<h4>🛍 '+t('p_shops')+'</h4>'+['furn','elec','deco'].map(k=>`<div class="row"><span>${{furn:'🛋',elec:'📺',deco:'🪴'}[k]} <b>${t('sh_'+k)}</b></span><button class="alt" data-g="${k}" ${btn}>🧭</button></div>`).join('');
   pb.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{H.buy(b.dataset.b);app('places')});pb.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{close();H.go(b.dataset.g)});return}
  if(a==='missions'){const Q=api.quests,lv=api.level(),card=k=>`<div class="row"><span>${Q.ico(k)} <b>${t('q_'+k)}</b><br><small>${t('q_'+k+'_d')}<br>≈ ${Q.estimate(k,lv).toLocaleString('fr-DZ')} ${t('cur')}</small></span><button data-k="${k}" style="min-width:0;padding:8px 14px">${t('go')}</button></div>`;
   pb.innerHTML='<h4>🚗 '+t('q_grp_car')+'</h4>'+Q.types.filter(k=>!Q.foot(k)).map(card).join('')+'<h4>🚶 '+t('q_grp_foot')+'</h4>'+Q.types.filter(k=>Q.foot(k)).map(card).join('')+(Q.cur?`<button class="alt" id="qc">${t('q_cancel')}</button>`:'');
   pb.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>{close();Q.start(b.dataset.k)});if($('#qc'))$('#qc').onclick=()=>{Q.cancel();app('missions')};return}
  if(a==='contacts'){pb.innerHTML=CONTACTS.map((c,i)=>`<div class="row" data-i="${i}"><span>${c.i} ${c.n}</span><small>${(Save.data.chats[c.k]||[]).slice(-1)[0]?.t.slice(0,18)||''}</small></div>`).join('');pb.querySelectorAll('.row').forEach(r=>r.onclick=()=>chat(CONTACTS[r.dataset.i]))}
  else if(a==='camera'){el.classList.add('cam');api.pause(false);pb.style.display='none';pb.innerHTML='';
   pb.insertAdjacentHTML('beforebegin','<button class="shutter" id="shut"></button>');$('#shut').onclick=()=>{Snd.play('shutter');api.snap(u=>{gal.unshift(u);const f=$('#flash');f.style.opacity=.9;setTimeout(()=>f.style.opacity=0,120)})}}
  else if(a==='music'){pb.innerHTML=`<div class="row" style="flex-direction:column"><b id="trk">${tracks.length?'♪ '+nm(ti):'—'}</b><div><button class="alt" id="mp" style="min-width:0">⏮</button> <button id="mpl" style="min-width:0">${au.paused?'▶':'⏸'}</button> <button class="alt" id="mn" style="min-width:0">⏭</button></div><small>${tracks.length} tracks</small><label class="lbtn">＋ ${t('addmusic')}<input id="mf" type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" multiple hidden></label></div>`;
   $('#mf').onchange=e=>{const fs=[...e.target.files];if(!fs.length)return;for(const f of fs){tracks.push(URL.createObjectURL(f));names.push(f.name.replace(/\.[^.]+$/,''))}if(!started)nextT(0);app('music')};$('#mp').onclick=()=>nextT(-1);$('#mn').onclick=()=>nextT(1);$('#mpl').onclick=e=>{if(!started)nextT(0);else if(au.paused){userPaused=false;au.play()}else{au.pause();userPaused=true}e.target.textContent=au.paused?'▶':'⏸'}}
  else if(a==='bank'){pb.innerHTML=`<div class="row"><b>${Math.floor(api.money()).toLocaleString()} ${t('cur')}</b><span>${t('lvl')} ${api.level()}</span></div>`}
  else if(a==='photos'){pb.innerHTML='<div class="thumbs">'+gal.map(u=>`<a href="${u}" download="dzair-photo.jpg"><img src="${u}"></a>`).join('')+'</div>'}}
 function close(){document.querySelector('.shutter')?.remove();pb.style.display='';el.classList.remove('on','cam');api.pause(false)}
 $('#pHome').onclick=()=>{document.querySelector('.shutter')?.remove();pb.style.display='';home()};
 return{info(){return '🎵 '+tracks.length+' tracks'},autoplay(){want=true;vol();if(!unl){unl=true;au.src=SIL;au.play().catch(()=>{})}if(tracks.length&&!started)nextT(0);else if(started&&au.paused&&!userPaused)au.play().catch(()=>{});return(probed&&!tracks.length)||(started&&!au.paused)},incoming(){const c=CONTACTS[Math.floor(Math.random()*CONTACTS.length)],th=Save.data.chats[c.k]||=[],m=opener(c,api.ctx(),S.lang);th.push({w:'them',t:m,act:c.k==='samir'});Save.write();Snd.play('message');api.notify(c.n+': '+m.slice(0,38))},open(){el.classList.add('on');home()},toggle(){el.classList.contains('on')?close():this.open()},vol,close};
}
