// v4: code is network-first; audio, Range requests and .glb models are NEVER intercepted (caching a clone of a 40-50 MB model starved phones of memory).
const V='dz-v4';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||r.headers.has('range')||u.origin!==location.origin||/\.(mp3|ogg|wav|m4a|glb|gltf|bin)$/i.test(u.pathname))return;
 e.respondWith(fetch(r).then(n=>{if(n.ok)caches.open(V).then(c=>c.put(r,n.clone()));return n}).catch(()=>caches.match(r)))});
