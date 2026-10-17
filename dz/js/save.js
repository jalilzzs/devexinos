// Offline save (localStorage). Swap internals for IndexedDB / web sync later; API stays the same.
const K='dz_save_v1';
const def={money:500000,xp:0,owned:['r4l'],tune:{},chats:{},name:'',car:'r4l',set:{lang:'ar',ctrl:'arrows',traffic:0.5,tspeed:1,shadows:true,scale:1}};
export const Save={
 data:(()=>{try{const d=JSON.parse(localStorage.getItem(K)||'{}');return {...def,...d,set:{...def.set,...(d.set||{})}}}catch{return structuredClone(def)}})(),
 write(){try{localStorage.setItem(K,JSON.stringify(this.data))}catch{}},
 level(){return 1+Math.floor(Math.sqrt(this.data.xp/40))}
};
