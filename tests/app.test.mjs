import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import * as core from '../src/core.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const terms=core.normalizeCatalog(JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8')));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup({cards=terms,state,hash=''}={}){
 const win=new Window({url:'http://localhost:5174/'+hash,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 if(state!==undefined)win.localStorage.setItem(core.STORE_KEY,typeof state==='string'?state:JSON.stringify(state));
 win.scrollTo=()=>{};win.confirm=()=>true;win.alert=()=>{};let admin=false,saved=null;
 win.__deps={...core,e:core.escapeHtml,configured:true,loadCatalog:async()=>cards,currentAdmin:async()=>admin,login:async()=>{admin=true;},logout:async()=>{admin=false;},writeTerm:async value=>{saved=value;},deleteTerm:async()=>{},seedCatalog:async()=>{}};
 const body=source.replace(/^import .*;\r?\n/gm,'');
 const bindings=Object.keys(win.__deps).join(',');
 win.eval(`{ const {${bindings}} = window.__deps; ${body} }`);
 await wait(35);
 return {win,doc:win.document,click(action){const el=win.document.querySelector(`[data-action="${action}"]`);assert.ok(el,`button ${action}`);el.click();},saved:()=>saved,close:()=>win.close()};
}
test('homepage shows actual category counts and 10-card session with bilingual term',async()=>{
 const ui=await setup();try{
 assert.match(ui.doc.body.textContent,/239/);assert.match(ui.doc.body.textContent,/145/);
 ui.click('start');assert.match(ui.doc.querySelector('.numeric').textContent,/1.*10/);
 assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);assert.equal(ui.doc.querySelector('.english').textContent,terms[0].englishTerm);
 assert.equal(ui.doc.querySelectorAll('[data-action=known]').length,0);
 ui.click('flip');assert.equal(ui.doc.querySelector('.definition>p').textContent,terms[0].definition);
 ui.click('unknown');await wait(270);assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
 assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).ratings[terms[0].id],'unknown');
 }finally{ui.close();}
});
test('ten evaluations finish one batch and next starts at card eleven',async()=>{
 const ui=await setup();try{
 ui.click('start');for(let i=0;i<10;i++){ui.click('flip');ui.click(i%2?'known':'unknown');await wait(260);}
 assert.match(ui.doc.querySelector('h1').textContent,/学習|학습/);
 assert.match(ui.doc.querySelector('.result-stats').textContent,/10/);
 ui.click('next');assert.equal(ui.doc.querySelector('h1').textContent,terms[10].term);
 assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).completed['전체'].length,10);
 }finally{ui.close();}
});
test('last batch is nine and restart preserves ratings',async()=>{
 let state=core.completeBatch(core.emptyState(),'전체',terms.slice(0,230).map(c=>c.id));state=core.rate(state,terms[0].id,'unknown');
 const ui=await setup({state});try{
 ui.click('start');assert.match(ui.doc.querySelector('.numeric').textContent,/1.*9/);
 for(let i=0;i<9;i++){ui.click('flip');ui.click('known');await wait(260);}
 assert.match(ui.doc.querySelector('h1').textContent,/한 바퀴/);ui.click('restart');
 assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
 assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).ratings[terms[0].id],'unknown');
 }finally{ui.close();}
});
test('review uses only unknown IDs and known removes it on next visit',async()=>{
 const state=core.rate(core.emptyState(),terms[5].id,'unknown');const ui=await setup({state});try{
 ui.click('review');assert.equal(ui.doc.querySelector('h1').textContent,terms[5].term);
 ui.click('flip');ui.click('known');await wait(270);ui.click('home');await wait(35);ui.click('review');
 assert.match(ui.doc.querySelector('h1').textContent,/모르는 용어가 아직 없어요/);
 }finally{ui.close();}
});
test('corrupt storage is preserved while learning continues',async()=>{
 const ui=await setup({state:'{broken'});try{assert.match(ui.doc.querySelector('#notice').textContent,/기존 기록은 보존/);ui.click('start');ui.click('flip');ui.click('known');await wait(270);assert.equal(ui.win.localStorage.getItem(core.STORE_KEY),'{broken');}finally{ui.close();}
});
test('HTML in term data is text, not executable markup',async()=>{
 const cards=[{...terms[0],term:'<img src=x onerror=alert(1)>',definition:'<script>alert(1)</script>',englishTerm:''}];
 const ui=await setup({cards});try{ui.click('start');assert.equal(ui.doc.querySelector('h1 img'),null);ui.click('flip');assert.match(ui.doc.querySelector('.definition').textContent,/<script>/);assert.equal(ui.doc.querySelector('.definition script'),null);}finally{ui.close();}
});
test('admin Google login leads to list and shared editor validates categories',async()=>{
 const ui=await setup({hash:'#/admin'});try{
 assert.match(ui.doc.querySelector('h1').textContent,/관리자 로그인/);ui.click('login');await wait(35);
 assert.match(ui.doc.querySelector('h1').textContent,/용어 관리/);ui.click('add');
 const form=ui.doc.querySelector('form');form.elements.term.value='새 용어';form.elements.definition.value='새 뜻';
 form.dispatchEvent(new ui.win.Event('submit',{bubbles:true,cancelable:true}));await wait(10);
 assert.match(ui.doc.querySelector('#category-error').textContent,/하나 이상/);assert.equal(ui.saved(),null);
 form.querySelector('[name=categories]').checked=true;
 form.dispatchEvent(new ui.win.Event('submit',{bubbles:true,cancelable:true}));await wait(35);
 assert.equal(ui.saved().term,'새 용어');assert.equal(ui.saved().categories.length,1);
 }finally{ui.close();}
});
