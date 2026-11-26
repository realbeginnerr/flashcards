// Amplitude analytics + session replay, shared by the home app and every step page.
// The site has no bundler, so @amplitude/unified is loaded as an ES module from a pinned CDN URL.
// It is loaded lazily so a blocked or offline CDN never breaks the site: tracking just becomes a no-op.

// Amplitude ingestion key — public by design; move to an env var when you set up environments.
const AMPLITUDE_API_KEY='d19602a487de4a067a2bd398c09763c4';
const SDK_URL='https://cdn.jsdelivr.net/npm/@amplitude/unified@1.2.2/+esm';

// Screens that must not be recorded by session replay (admin tools and account/login forms).
const PRIVATE_ROUTES=['#/admin','#/login'];
export const isPrivateRoute=hash=>PRIVATE_ROUTES.some(prefix=>hash===prefix||hash.startsWith(prefix+'/'));

let ready=null;
// Initializes Amplitude once per page load and resolves to the SDK, or null when it cannot load.
export function initAnalytics({window:win=globalThis.window,load=()=>import(SDK_URL)}={}){
 if(ready)return ready;
 if(!win?.document)return ready=Promise.resolve(null);
 ready=(async()=>{
  try{
   const amplitude=await load();
   await amplitude.initAll(AMPLITUDE_API_KEY,{"analytics":{"autocapture":true},"sessionReplay":{"sampleRate":1}});
   syncReplayToRoute(win.location.hash,amplitude);
   return amplitude;
  }catch(error){
   console.warn('Amplitude could not load — analytics disabled',error);
   return null;
  }
 })();
 return ready;
}

function syncReplayToRoute(hash,amplitude){
 const replay=amplitude.sessionReplay?.();
 if(!replay)return;
 if(isPrivateRoute(hash))replay.stop();else replay.start();
}

// Call on every in-app route change so admin/login screens are never recorded.
export function updateReplayForRoute(hash){
 ready?.then(amplitude=>{if(amplitude)syncReplayToRoute(hash,amplitude);});
}

export function track(name,properties){
 (ready??initAnalytics()).then(amplitude=>amplitude?.track(name,properties));
}

// Test hook: forget the loaded SDK.
export function resetAnalyticsForTest(){ready=null;}
