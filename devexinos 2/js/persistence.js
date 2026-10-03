/* =====================================================================
   DEVEXINOS / js/persistence.js
   Helpers, settings, save state, IndexedDB asset storage, drag-and-drop asset loader
   ===================================================================== */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],el=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wait=ms=>new Promise(r=>setTimeout(r,ms));
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const SAVE_KEY='dvx_save_v1';
const DEF={gfx:'high',shadows:true,fps:60,lang:'en',sens:1,master:.8,sfx:.8,bgm:.45,size:1,forceTouch:false,pos:{}};
let S=Object.assign({},DEF,store.get('dvx_settings',{}));
const newState=()=>({inv:[],taken:{},logs:[],f:{},br:[0,0,0,0],pos:null});
let state=newState(),SAVE=store.get(SAVE_KEY,null),ACCT=store.get('dvx_acct',null);
const t=k=>(T[S.lang]&&T[S.lang][k])||T.en[k]||k;
const saveSettings=()=>store.set('dvx_settings',S);
const isTouchDevice=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const useTouch=()=>isTouchDevice||S.forceTouch;
const hasThree=typeof THREE!=='undefined';

/* ---------- save game ---------- */
let noSave=false;
function saveGame(){
  if(!started||noSave)return;
  state.pos={lv:P.lv,x:+P.x.toFixed(2),z:+P.z.toFixed(2),yaw:+P.yaw.toFixed(2)};state.lastSave=Date.now();
  store.set(SAVE_KEY,state);SAVE=JSON.parse(JSON.stringify(state));refreshContinue();
}

/* =====================================================================
   ASSET MANAGER: IndexedDB persistence + drag-and-drop + manifest.json
   ===================================================================== */
const Assets={models:{},names:[],pend:[]};
function idbOpen(){return new Promise((res,rej)=>{const r=indexedDB.open('dvx_assets',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbPut(k,v){try{const d=await idbOpen();return new Promise(res=>{const tx=d.transaction('f','readwrite');tx.objectStore('f').put(v,k);tx.oncomplete=res;tx.onerror=res})}catch(e){}}
async function idbAll(){try{const d=await idbOpen();return await new Promise(res=>{const o={},c=d.transaction('f').objectStore('f').openCursor();c.onsuccess=()=>{const cur=c.result;if(cur){o[cur.key]=cur.value;cur.continue()}else res(o)};c.onerror=()=>res(o)})}catch(e){return {}}}
async function idbClear(){try{const d=await idbOpen();d.transaction('f','readwrite').objectStore('f').clear()}catch(e){}}
async function ingest(fname,ab,persist=true){
  const dot=fname.lastIndexOf('.');if(dot<1){toast(t('assetBad')+': '+fname);return false}
  const base=fname.slice(0,dot).toLowerCase().replace(/[^a-z0-9_]/g,'_'),ext=fname.slice(dot+1).toLowerCase();
  try{
    if(ext==='glb'||ext==='gltf'){
      if(!hasThree||!THREE.GLTFLoader)throw new Error('GLTFLoader not loaded');
      const data=ext==='gltf'?new TextDecoder().decode(ab):ab;
      Assets.models[base]=await new Promise((res,rej)=>new THREE.GLTFLoader().parse(data,'',res,rej));
      if(typeof applyModel==='function')applyModel(base);
    }else if(['mp3','ogg','wav','m4a','aac'].includes(ext)){
      if(!/^(sfx|bgm|voice)_/.test(base)){toast(t('assetBad')+': '+fname);return false}
      if(!AC)Assets.pend.push([base,ab.slice(0)]);else{custom.buf[base]=await AC.decodeAudioData(ab.slice(0));if(base==='bgm_main')refreshBgm()}
    }else{toast(t('assetBad')+': '+fname);return false}
    if(persist)idbPut(fname,ab);
    if(!Assets.names.includes(fname))Assets.names.push(fname);renderAssetList();toast(t('assetsLoaded')+': '+fname);return true;
  }catch(e){console.warn(e);toast('Asset error: '+fname);return false}
}
async function ingestFiles(files){for(const f of files)await ingest(f.name,await f.arrayBuffer(),true)}
addEventListener('dragover',e=>{e.preventDefault();document.body.classList.add('dropping')});
addEventListener('dragleave',e=>{if(!e.relatedTarget)document.body.classList.remove('dropping')});
addEventListener('drop',e=>{e.preventDefault();document.body.classList.remove('dropping');ingestFiles(e.dataTransfer.files)});
async function loadStoredAssets(){
  const all=await idbAll();for(const k of Object.keys(all))await ingest(k,all[k],false);
  try{ // optional: assets/manifest.json -> {"models":{"entity_devexinos":"models/entity/devexinos.glb"},"audio":{"sfx_door":"audio/sfx/door.ogg"}}
    const r=await fetch('assets/manifest.json');if(!r.ok)return;const m=await r.json();
    for(const grp of ['models','audio'])for(const [name,path] of Object.entries(m[grp]||{})){
      try{const rr=await fetch('assets/'+path);if(!rr.ok)continue;await ingest(name+path.slice(path.lastIndexOf('.')),await rr.arrayBuffer(),false)}catch(e){}}
  }catch(e){}
}

