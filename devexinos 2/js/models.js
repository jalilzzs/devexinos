/* =====================================================================
   DEVEXINOS / js/models.js   (load this file LAST in index.html, after main.js)
   Adds your .glb rooms (assets/models/*.glb) on top of the procedural mansion.
   It needs no edits to the other files: it wraps initScene() and applyGfx().
   ===================================================================== */
/* =====================================================================
   MODEL DRESSING: your GLB rooms (assets/models/*.glb)
   ---------------------------------------------------------------------
   The procedural mansion stays as the game's skeleton (walls, collisions,
   doors, puzzles). Each model below DRESSES one room: its floor and props are
   shown, its own walls/ceiling are hidden (the mansion's walls are used), and
   the procedural furniture is hidden, except "host" pieces that carry items or
   puzzles (nightstand, desk, safe, altar, fuse box...).
   Tuning knobs per entry:  scale (metres per model unit), align ('east' =
   toward the hall for west rooms, 'west' for east rooms), rotate ('auto'),
   hideNames (regex of node names to hide), hideShell (auto-hide walls and
   ceiling), gain (brightness boost), heavy (skipped on Medium graphics).
   Live tweak from the browser console:  DVX.apply('bedroom',{scale:0.012})
   ===================================================================== */
const MODEL_DIR='assets/models/';
const ROOMRECT={bedroom:[-8.85,2.15,-2.15,9.85],study:[-8.85,-5.85,-2.15,1.85],kitchen:[-8.85,-13.85,-2.15,-6.15],amira:[2.15,2.15,8.85,9.85],hall:[-1.85,-13.85,1.85,9.85]};
const MODEL_PLAN=[
  /* long loop corridor -> the hall. Straight 109-unit section (model x 27.7..136.7, z -209.6..-197.9) is rotated onto the hall's N-S axis and clipped to the hall.
     Its modular wall pieces are named "duvar*" (Turkish for wall): hidden, the mansion's wallpaper walls are used. 1 model unit = 0.316 m here. */
  {id:'hall',file:'house_corridor_interior.glb',kind:'strip',room:'hall',strip:{x1:27.7,z1:-209.6,x2:136.7,z2:-197.9},floorY:4.8,width:3.7,hideNames:/duvar/i,keepDecor:true,gain:1.7},
  /* old_room: units are centimetres -> 0.01 */
  {id:'bedroom',file:'old_room.glb',kind:'room',room:'bedroom',scale:0.01,align:'east',hideShell:true,gain:1.8},
  /* old_living_room: ceiling ~154 units ~ 3.1 m -> 0.02 */
  {id:'study',file:'old_living_room.glb',kind:'room',room:'study',scale:0.02,align:'east',hideShell:true,gain:1.8,heavy:true},
  /* an_old_cheap_room_in_chinatown: already in metres; rotated to fit if that helps */
  {id:'amira',file:'an_old_cheap_room_in_chinatown.glb',kind:'room',room:'amira',scale:1,align:'west',rotate:'auto',hideShell:true,gain:1.6,heavy:true},
  /* horror_scene: a low-poly house shell + TV, table, hanging light, gas tank, crates (~0.003 m per unit). The "house" shell is hidden. */
  {id:'kitchen',file:'horror_scene.glb',kind:'room',room:'kitchen',scale:0.003,align:'east',hideNames:/house/i,gain:1.8},
  /* nameless_doll: replaces the four floating doll parts on the ritual table */
  {id:'doll',file:'nameless_doll.glb',kind:'doll',length:1.1,gain:1.6}
];
const DRESS={status:{},gltf:{},roots:{},busy:false,t:0};
const V3=()=>new THREE.Vector3();
function loadDressing(){
  if(!worldReady||!hasThree||!THREE.GLTFLoader)return;
  const loader=new THREE.GLTFLoader();
  MODEL_PLAN.forEach(plan=>{
    const st=DRESS.status[plan.id];if(st==='ok'||st==='loading')return;
    if(plan.heavy&&S.gfx!=='high'){DRESS.status[plan.id]='skipped (Medium graphics)';return}
    DRESS.status[plan.id]='loading';
    loader.load(MODEL_DIR+plan.file,g=>{
      DRESS.gltf[plan.id]=g;
      try{dressApply(plan,g);DRESS.status[plan.id]='ok'}catch(e){DRESS.status[plan.id]='error: '+e.message;console.error('[DVX] dressing '+plan.id,e)}
      dressReport();
    },null,err=>{
      DRESS.status[plan.id]='failed to load '+MODEL_DIR+plan.file+(location.protocol==='file:'?' (open the game through http://, not file://)':' (check the path and upper/lower case)');
      console.error('[DVX] '+plan.file,err);dressReport();
    });
  });
}
function dressReport(){
  const ids=MODEL_PLAN.map(p=>p.id),ok=ids.filter(i=>DRESS.status[i]==='ok').length,pending=ids.filter(i=>DRESS.status[i]==='loading').length,bad=ids.filter(i=>/^(failed|error)/.test(DRESS.status[i]||''));
  console.log('[DVX] models',DRESS.status);
  if(!pending)toast('Models: '+ok+'/'+ids.length+' loaded'+(bad.length?' · see console (F12)':''));
}
function nameMatch(obj,re){for(let o=obj;o;o=o.parent){if(o.name&&re.test(o.name))return true}return false}
function measure(root){
  root.updateMatrixWorld(true);
  const meshes=[];root.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m)});
  const U=new THREE.Box3();meshes.forEach(m=>U.expandByObject(m));
  const us=U.getSize(V3());let floor=null,fa=0;
  meshes.forEach(m=>{const b=new THREE.Box3().setFromObject(m),sz=b.getSize(V3());
    if(sz.y<=Math.max(.08,us.y*.04)&&b.min.y<=U.min.y+us.y*.15){const a=sz.x*sz.z;if(a>fa){fa=a;floor=b}}});
  return {meshes,U,us,F:floor||U};
}
function dressMaterials(root,o,planes){
  const gain=o.gain||1.7;
  root.traverse(m=>{
    if(!m.isMesh)return;m.castShadow=false;m.receiveShadow=true;m.frustumCulled=false;
    (Array.isArray(m.material)?m.material:[m.material]).forEach(mt=>{
      if(!mt)return;
      mt.side=THREE.DoubleSide;if(mt.metalness>.5)mt.metalness=.25;               // no env-map in this scene: metal would render black
      const col=mt.color||(mt.uniforms&&mt.uniforms.diffuse&&mt.uniforms.diffuse.value);
      if(col&&!mt.userData.gained){col.multiplyScalar(gain);mt.userData.gained=1}  // sRGB textures + linear output + dim lights: lift them
      if(planes){mt.clippingPlanes=planes;mt.clipShadows=true}
      mt.needsUpdate=true;
    });
  });
}
function hideDecor(room,keep){
  if(keep||!ROOM[room])return;
  ROOM[room].children.forEach(g=>{if(!g.userData.host)g.visible=false});
}
function dressApply(plan,gltf,over){
  const o=Object.assign({},plan,over||{}),root=gltf.scene;
  if(DRESS.roots[o.id]&&DRESS.roots[o.id]!==root)scene.remove(DRESS.roots[o.id]);
  if(root.parent)root.parent.remove(root);
  root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.setScalar(1);
  root.traverse(m=>{if(m.isMesh)m.visible=true});
  if(o.kind==='strip')dressStrip(o,root);else if(o.kind==='doll')dressDoll(o,root);else dressRoom(o,root);
  DRESS.roots[o.id]=root;
}
function dressRoom(o,root){
  const rect=ROOMRECT[o.room],rw=rect[2]-rect[0]-.1,rd=rect[3]-rect[1]-.1;
  root.scale.setScalar(o.scale||1);
  root.traverse(m=>{if(m.isMesh&&o.hideNames&&nameMatch(m,o.hideNames))m.visible=false});
  let M=measure(root);
  if(o.rotate==='auto'){const sx=M.F.getSize(V3()),f0=Math.min(rw/sx.x,rd/sx.z),f90=Math.min(rw/sx.z,rd/sx.x);if(f90>f0){root.rotation.y=Math.PI/2;M=measure(root)}}
  const fs=M.F.getSize(V3()),fit=Math.min(rw/fs.x,rd/fs.z);
  if(fit<1){root.scale.multiplyScalar(fit*.98);M=measure(root)}                    // never bigger than the room
  const fc=M.F.getCenter(V3()),fz=M.F.getSize(V3()),cx=(rect[0]+rect[2])/2,cz=(rect[1]+rect[3])/2;
  let tx=cx;if(o.align==='east')tx=rect[2]-.05-fz.x/2;else if(o.align==='west')tx=rect[0]+.05+fz.x/2;
  root.position.set(tx-fc.x,.03-M.F.min.y,cz-fc.z);
  M=measure(root);
  if(o.hideShell){                                                                  // hide the model's own walls and ceiling
    M.meshes.forEach(m=>{const b=new THREE.Box3().setFromObject(m),sz=b.getSize(V3()),us=M.us;
      const wall=sz.y>=us.y*.5&&((sz.x<=us.x*.06&&sz.z>=us.z*.35)||(sz.z<=us.z*.06&&sz.x>=us.x*.35));
      const ceil=sz.y<=us.y*.05&&b.min.y>=M.U.min.y+us.y*.75&&sz.x>=us.x*.35&&sz.z>=us.z*.35;
      if(wall||ceil)m.visible=false})}
  dressMaterials(root,o,null);
  scene.add(root);root.userData.center=[M.F.getCenter(V3()).x,M.F.getCenter(V3()).z];root.userData.room=o.room;
  hideDecor(o.room,o.keepDecor);
  console.log('[DVX] '+o.id+': scale',root.scale.x.toFixed(4),'floor',M.F.getSize(V3()).toArray().map(v=>+v.toFixed(2)),'at',root.position.toArray().map(v=>+v.toFixed(2)));
}
function dressStrip(o,root){
  const st=o.strip,s=o.width/(st.z2-st.z1),cx=(st.x1+st.x2)/2,cz=(st.z1+st.z2)/2;
  root.scale.setScalar(s);root.rotation.y=-Math.PI/2;                                // model +x -> hall +z (south)
  root.position.set(cz*s,.03-o.floorY*s,-2-cx*s);
  root.traverse(m=>{if(m.isMesh&&o.hideNames&&nameMatch(m,o.hideNames))m.visible=false});
  const planes=[new THREE.Plane(new THREE.Vector3(1,0,0),1.95),new THREE.Plane(new THREE.Vector3(-1,0,0),1.95),new THREE.Plane(new THREE.Vector3(0,0,1),13.9),new THREE.Plane(new THREE.Vector3(0,0,-1),9.9)];
  dressMaterials(root,o,planes);
  scene.add(root);root.userData.center=[0,-2];root.userData.room='hall';root.userData.always=true;
  hideDecor('hall',o.keepDecor);
  console.log('[DVX] hall strip: scale',s.toFixed(4));
}
function dressDoll(o,root){
  root.rotation.set(0,0,0);root.scale.setScalar(1);root.position.set(0,0,0);root.updateMatrixWorld(true);
  let b=new THREE.Box3().setFromObject(root),sz=b.getSize(V3());
  if(sz.z>=sz.x&&sz.z>=sz.y)root.rotation.x=-Math.PI/2;else if(sz.x>=sz.y&&sz.x>=sz.z)root.rotation.z=Math.PI/2;   // longest axis -> local Y (the group lies it on the table)
  root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);sz=b.getSize(V3());
  root.scale.setScalar(((o.length||1.1)/(W.doll.scale.x||2.2))/Math.max(sz.y,.001));
  root.updateMatrixWorld(true);b=new THREE.Box3().setFromObject(root);const c=b.getCenter(V3());
  root.position.set(-c.x,-b.min.y,-c.z);
  W.doll.children.slice().forEach(ch=>W.doll.remove(ch));                           // remove the 4 procedural parts
  dressMaterials(root,o,null);W.doll.add(root);root.userData.always=true;
}
/* keep draw calls low: only render a dressed room while the player is near it */
function updateDressing(dt){
  DRESS.t-=dt;if(DRESS.t>0)return;DRESS.t=.4;
  for(const id in DRESS.roots){const r=DRESS.roots[id];if(!r||r.userData.always||!r.userData.center)continue;
    r.visible=P.lv==='house'&&Math.hypot(P.x-r.userData.center[0],P.z-r.userData.center[1])<16}
  if(DRESS.roots.hall)DRESS.roots.hall.visible=P.lv==='house';
}
window.DVX={models:DRESS,plan:MODEL_PLAN,report:dressReport,apply:(id,over)=>{const p=MODEL_PLAN.find(x=>x.id===id),g=DRESS.gltf[id];if(!p||!g)return console.warn('model not loaded',id);dressApply(p,g,over);refreshWorld()}};

/* ---------- hook into the existing game without editing it ---------- */
function dvxPatchWorld(){
  renderer.localClippingEnabled=true;
  /* furniture that carries items/puzzles stays visible when a model dresses the room */
  ['nightstand_bedroom','dresser_bedroom','desk_study','table_kitchen','counter_kitchen','table_store','dresser_amira','vanity_amira','table_gallery','safe_study','altar_chapel','fusebox','table_ritual','pedestal_torso','door_basement','door_front','locker_gallery1','locker_gallery2'].forEach(id=>{if(PROPS[id])PROPS[id].userData.host=true});
  /* items that lay on beds move onto nightstand / dresser so they never float */
  const moveItem=(id,ox,oz,nx,ny,nz)=>{const g=ITEMG[id],o=IN.find(q=>q.lv==='house'&&Math.abs(q.x-ox)<.02&&Math.abs(q.z-oz)<.02);if(!g||!o)return;g.position.set(nx,ny,nz);o.hit.position.set(nx,ny+.12,nz);o.x=nx;o.y=ny+.12;o.z=nz};
  moveItem('passport',-8.55,6,-8.55,.6,5.85);moveItem('j1',-7.4,8.9,-8.55,.6,6.15);moveItem('letter',7,8.6,8.55,.9,4.6);
}
const _dvxInitScene=initScene;
initScene=function(){_dvxInitScene();if(renderer&&worldReady&&!DRESS.started){DRESS.started=true;dvxPatchWorld();loadDressing()}};
const _dvxApplyGfx=applyGfx;
applyGfx=function(){_dvxApplyGfx();if(S.gfx==='high'&&worldReady&&DRESS.started)loadDressing()};
setInterval(()=>{if(worldReady&&started&&!paused)updateDressing(.4)},400);
