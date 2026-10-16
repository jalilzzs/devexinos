// Every part feeds stats() -> used directly by the driving physics (power, torque, mass, top speed, grip, brakes).
export const PARTS=[
 {id:'engine',icon:'🔩',base:120000,hp:[0,.08,.16,.26],tq:[0,.07,.14,.22]},
 {id:'turbo', icon:'🌀',base:200000,hp:[0,.10,.20,.32],tq:[0,.12,.24,.38]},
 {id:'ecu',   icon:'💻',base:80000, hp:[0,.04,.08,.12],tq:[0,.04,.08,.12],top:[0,.03,.06,.09]},
 {id:'weight',icon:'🪶',base:100000,wt:[0,-.05,-.09,-.13]},
 {id:'tires', icon:'🛞',base:90000, grip:[0,.08,.16,.25]},
 {id:'brakes',icon:'🛑',base:70000, brake:[0,.12,.25,.4]}];
export const PAINTS=['#e8e8e8','#111111','#d21034','#0a7b3e','#1e5eff','#ffb400','#ff6a00','#7a2bff'];
export const cost=(p,c,lvl)=>Math.round(p.base*lvl*(.6+c.price/2.5e6)/1000)*1000;
export function stats(c,tn={}){let h=0,q=0,w=0,tp=0,g=0,b=0;
 for(const p of PARTS){const l=tn[p.id]||0;h+=p.hp?.[l]||0;q+=p.tq?.[l]||0;w+=p.wt?.[l]||0;tp+=p.top?.[l]||0;g+=p.grip?.[l]||0;b+=p.brake?.[l]||0}
 const hp=c.hp*(1+h),torque=c.torque*(1+q),weight=c.weight*(1+w),top=Math.min(c.top*(1+tp)*(1+h*.3),c.top*1.45);
 return{hp,torque,weight,top,grip:1+g,brake:1+b,t100:27.8/Math.min(6.5,hp*745*.8/(weight*14))}}
