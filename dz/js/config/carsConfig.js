// ADD A CAR: drop the .glb in assets/models/cars/ + ONE line here.
// len = real length in metres (model is auto-scaled to it). flip:true if the model faces backwards.
export const CARS = [
 {id:'r4l',   name:'Renault 4L',         file:'renault_4l.glb',            len:3.64,price:0,      level:1,hp:34, torque:60, weight:700, top:115},
 {id:'p404',  name:'Peugeot 404 Pick-up',file:'peugeot_404_pick-up.glb',   len:4.5, price:350000, level:2,hp:72, torque:120,weight:1100,top:135},
 {id:'p307',  name:'Peugeot 307',        file:'2008_peugeot_307.glb',      len:4.2, price:900000, level:3,hp:110,torque:147,weight:1220,top:190,npc:false},
 {id:'clio',  name:'Clio Moschino',      file:'renault_clio_moschino.glb', len:3.8, price:1300000,level:4,hp:90, torque:135,weight:1000,top:180},
 {id:'duster',name:'Renault Duster',     file:'renault_duster.glb',        len:4.3, price:2400000,level:5,hp:115,torque:156,weight:1250,top:170},
 {id:'p208',  name:'Peugeot 208',        file:'peugeot_208_2017.glb',      len:3.96,price:2800000,level:6,hp:110,torque:205,weight:1090,top:200},
{id:'partner',name:'Peugeot Partner Tepee',file:'peugeot_partner_tepee.glb',len:4.38,price:2300000,level:4,hp:92, torque:230,weight:1400,top:165,npc:false},
 {id:'dduster',name:'Dacia Duster',file:'dacia_duster_low_poly.glb',len:4.34,price:2600000,level:5,hp:110,torque:260,weight:1280,top:170},
 {id:'polo',   name:'VW Polo Plus 2021',file:'2021_volkswagen_polo_plus.glb',len:4.07,price:3300000,level:7,hp:95,torque:175,weight:1150,top:190},
];
// npc:false = never used as traffic (too heavy until compressed). flip:true = model faces backwards.
