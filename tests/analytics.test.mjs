import test from 'node:test';
import assert from 'node:assert/strict';
import {initAnalytics,updateReplayForRoute,track,isPrivateRoute,resetAnalyticsForTest} from '../src/analytics.js';

function fakeSdk(){
 const calls=[];
 const replay={stop:()=>calls.push('stop'),start:()=>calls.push('start')};
 return {calls,sdk:{initAll:async(...args)=>{calls.push(['initAll',...args]);},sessionReplay:()=>replay,track:(...args)=>calls.push(['track',...args])}};
}
const windowAt=hash=>({document:{},location:{hash}});

test('initializes Amplitude once with the exact unified options',async()=>{
 resetAnalyticsForTest();
 const {calls,sdk}=fakeSdk();let loads=0;
 const load=async()=>{loads++;return sdk;};
 const first=initAnalytics({window:windowAt('#/'),load}),second=initAnalytics({window:windowAt('#/'),load});
 assert.equal(first,second);
 assert.equal(await first,sdk);
 assert.equal(loads,1);
 assert.deepEqual(calls[0],['initAll','d19602a487de4a067a2bd398c09763c4',{analytics:{autocapture:true},sessionReplay:{sampleRate:1}}]);
 assert.equal(calls[1],'start');
 track('Viewed Home Page',{prompt_version:'BA400.4'});
 await first;await Promise.resolve();
 assert.deepEqual(calls.at(-1),['track','Viewed Home Page',{prompt_version:'BA400.4'}]);
});

test('session replay stops on admin and login screens and resumes elsewhere',async()=>{
 resetAnalyticsForTest();
 const {calls,sdk}=fakeSdk();
 await initAnalytics({window:windowAt('#/admin'),load:async()=>sdk});
 assert.equal(calls.at(-1),'stop');
 updateReplayForRoute('#/study');await Promise.resolve();await Promise.resolve();
 assert.equal(calls.at(-1),'start');
 updateReplayForRoute('#/login');await Promise.resolve();await Promise.resolve();
 assert.equal(calls.at(-1),'stop');
 assert.ok(isPrivateRoute('#/admin/edit'));
 assert.ok(!isPrivateRoute('#/administrator'));
 assert.ok(!isPrivateRoute('#/term/x'));
});

test('a blocked CDN disables analytics without throwing',async()=>{
 resetAnalyticsForTest();
 const warn=console.warn;console.warn=()=>{};
 try{
  assert.equal(await initAnalytics({window:windowAt('#/'),load:async()=>{throw new Error('blocked');}}),null);
  track('Viewed Home Page',{});
 }finally{console.warn=warn;resetAnalyticsForTest();}
});
