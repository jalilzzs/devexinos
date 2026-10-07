/* =====================================================================
   DEVEXINOS / js/persistence.js
   Helpers, settings and the save game (localStorage)
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
