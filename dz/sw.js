// Minimal PWA cache-as-you-go
self.addEventListener('fetch',e=>{e.respondWith(caches.open('dz1').then(async c=>{const r=await c.match(e.request);return r||fetch(e.request).then(n=>{if(e.request.method==='GET')c.put(e.request,n.clone());return n})}))});
