// v3: code is network-first (no stale JS after redeploy); audio/Range requests are never intercepted (iOS needs real 206 responses); big .glb cached.
const V='dz-v3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||r.headers.has('range')||u.origin!==location.origin||/\.(mp3|ogg|wav|m4a)$/i.test(u.pathname))return;
 if(/\.glb$/i.test(u.pathname))e.respondWith(caches.open(V).then(async c=>(await c.match(r))||fetch(r).then(n=>{if(n.ok)c.put(r,n.clone()).catch(()=>{});return n})));
 else e.respondWith(fetch(r).then(n=>{if(n.ok)caches.open(V).then(c=>c.put(r,n.clone()));return n}).catch(()=>caches.match(r)))});
