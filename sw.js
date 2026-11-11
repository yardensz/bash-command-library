/* Same-origin offline cache for static GitHub Pages hosting. No third-party calls. */
const CACHE_NAME = 'bash-library-shell-v4';
const CORE = ['./','./index.html','./styles.css','./app.js','./commands.json','./versions.json','./favicon.svg','./manifest.webmanifest','./history/1.0.0.json','./history/1.1.0.json','./history/1.1.1.json','./history/1.2.0.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bash-library-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try{
      const response=await fetch(request);
      if(response.ok)cache.put(request,response.clone()).catch(()=>{});
      return response;
    }catch{
      const cached=await cache.match(request,{ignoreSearch:true});
      if(cached)return cached;
      if(request.mode==='navigate')return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});