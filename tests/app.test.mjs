import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import * as core from '../src/core.js';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const terms=core.normalizeCatalog(JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8')));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function setup({cards=terms,state,hash='',motion=false}={}){
 const win=new Window({url:'http://localhost:5174/'+hash,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 const animations=[];
 win.matchMedia=()=>({matches:!motion});
 if(motion)win.HTMLElement.prototype.animate=function(keyframes,options){let resolve;const finished=new Promise(r=>resolve=r);animations.push({keyframes,options,finish:resolve});return {finished};};
 win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 if(state!==undefined)win.localStorage.setItem(core.STORE_KEY,typeof state==='string'?state:JSON.stringify(state));
 win.scrollTo=()=>{};win.confirm=()=>true;win.alert=()=>{};let admin=false,saved=null;
 win.__deps={...core,e:core.escapeHtml,configured:true,loadCatalog:async()=>cards,currentAdmin:async()=>admin,login:async()=>{admin=true;},logout:async()=>{admin=false;},writeTerm:async value=>{saved=value;},deleteTerm:async()=>{},seedCatalog:async()=>{}};
 const body=source.replace(/^import .*;\r?\n/gm,'');
 const bindings=Object.keys(win.__deps).join(',');
 win.eval(`{ const {${bindings}} = window.__deps; ${body} }`);
 await wait(35);
 return {win,doc:win.document,animations,click(action){const el=win.document.querySelector(`[data-action="${action}"]`) || (action==='flip'?win.document.querySelector('.flashcard'):null);assert.ok(el,`button ${action}`);el.click();},saved:()=>saved,close:()=>win.close()};
}
test('homepage shows actual category counts and 10-card session with bilingual term',async()=>{
 const ui=await setup();try{
 assert.match(ui.doc.body.textContent,/239/);assert.match(ui.doc.body.textContent,/145/);
 ui.click('start');assert.match(ui.doc.querySelector('.numeric').textContent,/1.*10/);
 assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);assert.equal(ui.doc.querySelector('.english').textContent,terms[0].englishTerm);
 assert.equal(ui.doc.querySelectorAll('[data-action=known]').length,1);
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
test('clicking either card face repeatedly flips without rating or advancing',async()=>{
 const ui=await setup();try{
 ui.click('start');
 for(let i=0;i<8;i++){
  ui.doc.querySelector(i%2?'.definition>p':'.term-heading h1').click();
  assert.ok(ui.doc.querySelector(i%2?'.flashcard.front':'.flashcard.back'));
  assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
  assert.match(ui.doc.querySelector('.numeric').textContent,/1.*10/);
 }
 assert.equal(ui.win.localStorage.getItem(core.STORE_KEY),null);
 }finally{ui.close();}
});
test('card keyboard and explicit flip buttons each toggle only once',async()=>{
 const ui=await setup();try{
 ui.click('start');ui.click('flip');assert.ok(ui.doc.querySelector('.flashcard.back'));
 ui.click('flip');assert.ok(ui.doc.querySelector('.flashcard.front'));
 for(const key of ['Enter',' ','Enter',' '])ui.doc.querySelector('.flashcard').dispatchEvent(new ui.win.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
 assert.ok(ui.doc.querySelector('.flashcard.front'));
 }finally{ui.close();}
});
test('reference controls and text selection do not flip the back face',async()=>{
 const card={...terms[0],sources:[{title:'Reference',url:'https://example.com'}]};
 const ui=await setup({cards:[card]});try{
 ui.click('start');ui.click('flip');ui.doc.querySelector('summary').click();
 assert.ok(ui.doc.querySelector('.flashcard.back'));
 const selection=ui.win.getSelection();const range=ui.doc.createRange();range.selectNodeContents(ui.doc.querySelector('.definition>p'));selection.addRange(range);
 ui.doc.querySelector('.definition>p').click();assert.ok(ui.doc.querySelector('.flashcard.back'));
 selection.removeAllRanges();ui.doc.querySelector('.definition>p').click();assert.ok(ui.doc.querySelector('.flashcard.front'));
 }finally{ui.close();}
});
test('rotation swaps faces at halfway, prevents double flips, and reverses direction',async()=>{
 const ui=await setup({motion:true});try{
 ui.click('start');ui.doc.querySelector('.flashcard').click();
 assert.equal(ui.animations.length,1);assert.ok(ui.doc.querySelector('.flashcard.front'));
 ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,1);
 ui.animations[0].finish();await wait(5);assert.ok(ui.doc.querySelector('.flashcard.back'));assert.equal(ui.animations.length,2);
 ui.click('known');assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
 ui.animations[1].finish();await wait(5);ui.doc.querySelector('.flashcard').click();
 assert.match(ui.animations[2].keyframes[1].transform,/-90deg/);
 ui.animations[2].finish();await wait(5);assert.ok(ui.doc.querySelector('.flashcard.front'));
 ui.animations[3].finish();await wait(5);
 }finally{ui.close();}
});
test('leaving during rotation does not restore an old card',async()=>{
 const ui=await setup({motion:true});try{
 ui.click('start');ui.click('flip');ui.click('exit');
 ui.animations[0].finish();await wait(5);
 assert.equal(ui.doc.querySelector('.flashcard'),null);assert.ok(ui.doc.querySelector('[data-action=start]'));
 }finally{ui.close();}
});
test('known and unknown both slide current card upward and next card from below exactly once',async()=>{
 for(const rating of ['known','unknown']){
  const ui=await setup({motion:true});try{
   ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
   ui.click(rating);assert.equal(ui.animations.length,3);
   assert.match(ui.animations[2].keyframes[1].transform,/-110%/);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[0].term);
   ui.click(rating);ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,3);
   assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).ratings[terms[0].id],rating);
   ui.animations[2].finish();await wait(5);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
   assert.match(ui.animations[3].keyframes[0].transform,/100%/);
   ui.doc.querySelector('.flashcard').click();assert.equal(ui.animations.length,4);
   ui.animations[3].finish();await wait(5);
   assert.equal(ui.doc.querySelector('.flashcard').hasAttribute('aria-busy'),false);
   assert.match(ui.doc.querySelector('.numeric').textContent,/2.*10/);
  }finally{ui.close();}
 }
});
test('exit during outgoing slide keeps saved rating without resurrecting next card',async()=>{
 const ui=await setup({motion:true});try{
  ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
  ui.click('known');ui.click('exit');ui.animations[2].finish();await wait(5);
  assert.equal(ui.doc.querySelector('.flashcard'),null);
  assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).ratings[terms[0].id],'known');
 }finally{ui.close();}
});
test('last card slides out before completion, with no nonexistent next card',async()=>{
 const ui=await setup({motion:true,cards:[terms[0]]});try{
  ui.click('start');ui.click('flip');ui.animations[0].finish();await wait(5);ui.animations[1].finish();await wait(5);
  ui.click('unknown');assert.ok(ui.doc.querySelector('.flashcard'));
  ui.animations[2].finish();await wait(5);assert.equal(ui.doc.querySelector('.flashcard'),null);assert.ok(ui.doc.querySelector('.complete-panel'));
  ui.animations[3].finish();await wait(5);
 }finally{ui.close();}
});
test('rating dock occupies the same position after the card on both faces',async()=>{
 const ui=await setup();try{
  ui.click('start');
  for(let i=0;i<4;i++){
   const card=ui.doc.querySelector('.flashcard');
   assert.equal(card.nextElementSibling.className,'rating-dock');
   assert.equal(card.nextElementSibling.nextElementSibling.className,'card-footer');
   assert.equal(ui.doc.body.textContent.includes('이 용어, 이제 어느 정도 아세요?'),false);
   assert.deepEqual([...ui.doc.querySelectorAll('.rating-dock button')].map(b=>b.textContent),['몰라요','알아요']);
   card.click();
  }
 }finally{ui.close();}
});
test('both ratings work on the front without flipping',async()=>{
 for(const value of ['known','unknown']){
  const ui=await setup();try{
   ui.click('start');assert.ok(ui.doc.querySelector('.flashcard.front'));
   ui.click(value);await wait(5);
   assert.equal(ui.doc.querySelector('h1').textContent,terms[1].term);
   assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).ratings[terms[0].id],value);
  }finally{ui.close();}
 }
});
test('logo returns home after completing ten cards even when URL is already home',async()=>{
 const ui=await setup({cards:terms.slice(0,10),hash:'#/'});try{
  assert.equal(ui.doc.querySelector('#home-link'),null);
  ui.click('start');for(let i=0;i<10;i++){ui.click('known');await wait(5);}
  assert.ok(ui.doc.querySelector('.complete-panel'));
  ui.doc.querySelector('.brand-mark').click();await wait(35);
  assert.ok(ui.doc.querySelector('.start-panel'));assert.equal(ui.doc.querySelector('.complete-panel'),null);
  assert.equal(JSON.parse(ui.win.localStorage.getItem(core.STORE_KEY)).completed['전체'].length,10);
 }finally{ui.close();}
});
test('logo navigates home even when default link navigation is intercepted',async()=>{
 for(const selector of ['.brand'])for(const hash of ['', '#/']){
  const ui=await setup({hash});try{
   ui.click('start');ui.click('flip');
   const link=ui.doc.querySelector(selector);
   link.addEventListener('click',event=>event.preventDefault());
   link.querySelector('span').click();await wait(35);
   assert.ok(ui.doc.querySelector('.start-panel'),`${selector} with ${hash||'empty hash'}`);
   assert.equal(ui.doc.querySelector('.flashcard'),null);
  }finally{ui.close();}
 }
});
test('header navigation works with absolute same-site URLs',async()=>{
 const ui=await setup({hash:'#/'});try{
  ui.click('start');const link=ui.doc.querySelector('.brand');link.setAttribute('href','http://localhost:5174/#/');
  link.click();await wait(35);assert.ok(ui.doc.querySelector('.start-panel'));
 }finally{ui.close();}
});
test('dedicated logo home control does not depend on hosting-rewritten hrefs',async()=>{
 for(const selector of ['.brand']){
  const ui=await setup();try{
   ui.click('start');ui.doc.querySelector(selector).href='https://example.com/embedded/#/';
   ui.doc.querySelector(selector).click();await wait(35);
   assert.ok(ui.doc.querySelector('.start-panel'));assert.equal(ui.doc.querySelector('.flashcard'),null);
  }finally{ui.close();}
 }
});
