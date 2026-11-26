import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {renderThreadPage} from '../scripts/thread-article.mjs';
import {initHeader} from '../src/header.js';
import {initArticleCopy} from '../src/article-copy.js';
import {initArticleToc} from '../src/article-toc.js';
import {escapeHtml as e,bilingual,normalizeCatalog} from '../src/core.js';

const [home,article,homeCSS,articleCSS,headerCSS,raw,footerCSS]=await Promise.all([
 readFile(new URL('../public/index.html',import.meta.url),'utf8'),renderThreadPage(),
 readFile(new URL('../src/style.css',import.meta.url),'utf8'),
 readFile(new URL('../src/article.css',import.meta.url),'utf8'),
 readFile(new URL('../src/header.css',import.meta.url),'utf8'),
 readFile(new URL('../public/terms.json',import.meta.url),'utf8'),
 readFile(new URL('../src/footer.css',import.meta.url),'utf8')
]);
test('article outline follows reading position in both directions and at the page bottom',()=>{
 const win=new Window();
 try{
  win.document.body.innerHTML='<header class="site-header"></header><nav class="blog-toc"><a href="#a">Step 4</a><a href="#b">Step 5</a><a href="#c">その他</a></nav><h2 id="a"></h2><h2 id="b"></h2><h2 id="c"></h2>';
  let y=0;
  Object.defineProperty(win,'scrollY',{get:()=>y});
  Object.defineProperty(win.document.documentElement,'scrollHeight',{get:()=>3000});
  Object.defineProperty(win,'innerHeight',{get:()=>900});
  win.document.querySelector('header').getBoundingClientRect=()=>({bottom:80});
  ['a','b','c'].forEach((id,index)=>{win.document.getElementById(id).getBoundingClientRect=()=>({top:200+index*1000-y});});
  let pending;
  win.requestAnimationFrame=fn=>{pending=fn;return 1;};
  const scroll=next=>{y=next;win.dispatchEvent(new win.Event('scroll'));pending();};
  const current=()=>win.document.querySelector('[aria-current="location"]')?.getAttribute('href');
  initArticleToc({document:win.document,window:win});
  assert.equal(current(),undefined);
  scroll(100);assert.equal(current(),'#a');
  scroll(1100);assert.equal(current(),'#b');
  scroll(100);assert.equal(current(),'#a');
  scroll(2100);assert.equal(current(),'#c');
  assert.equal(win.document.querySelectorAll('[aria-current]').length,1);
 }finally{win.close();}
});
function page(html,css,width=1280){
 const win=new Window({url:'https://example.com/flashcards/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 win.happyDOM.setWindowSize({width,height:900});
 win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 const style=win.document.createElement('style');style.textContent=css+'\n'+headerCSS.replace(/^@import[^;]*;/m,'')+'\n'+footerCSS;win.document.head.append(style);
 let loads=0,terms=null;
 initHeader({document:win.document,window:win,e,bilingual,getTerms:()=>terms,loadTerms:async()=>{loads++;return terms=normalizeCatalog(JSON.parse(raw));}});
 return {win,doc:win.document,loads:()=>loads};
}
test('home and article share one footer outside the article at desktop and mobile widths',()=>{
 for(const width of [1280,375]){
  const a=page(home,homeCSS,width),b=page(article,articleCSS,width);
  try{
   const left=a.doc.querySelector('.site-footer'),right=b.doc.querySelector('.site-footer');
   assert.equal(left.outerHTML,right.outerHTML);
   assert.equal(b.doc.querySelectorAll('.site-footer').length,1);
   assert.equal(right.parentElement,b.doc.body);
   for(const selector of ['.site-footer','.site-footer>a','.site-footer .copyright']){
    const l=a.win.getComputedStyle(a.doc.querySelector(selector)),r=b.win.getComputedStyle(b.doc.querySelector(selector));
    for(const key of ['display','padding','gap','color','font-family','font-size','line-height','letter-spacing','max-width','border-top-color'])assert.equal(l.getPropertyValue(key),r.getPropertyValue(key),`${selector}: ${key}`);
   }
  }finally{a.win.close();b.win.close();}
 }
});
test('home and detail pages share the same navigation markup, destinations and desktop appearance',()=>{
 const a=page(home,homeCSS),b=page(article,articleCSS);
 try{
  const nav=ui=>ui.doc.querySelector('.site-header');
  assert.equal(nav(a).outerHTML.replaceAll('href="#/','href="./#/'),nav(b).outerHTML);
  assert.equal(b.doc.querySelector('.blog-header'),null);
  for(const selector of ['.site-header','.brand','.brand-mark','.header-actions','.header-search','#home-search-form','#home-term-search','.header-admin','.header-login']){
   const left=a.win.getComputedStyle(a.doc.querySelector(selector)),right=b.win.getComputedStyle(b.doc.querySelector(selector));
   for(const property of ['height','position','top','background-color','color','font-family','font-size','padding-left','padding-right','flex-wrap'])assert.equal(left.getPropertyValue(property),right.getPropertyValue(property),`${selector}: ${property}`);
  }
  assert.equal(a.win.getComputedStyle(nav(a)).height,'80px');
  assert.equal(a.win.getComputedStyle(nav(a)).position,'sticky');
  assert.deepEqual([...nav(a).querySelectorAll('a')].map(link=>link.href),[...nav(b).querySelectorAll('a')].map(link=>link.href));
  assert.equal(a.loads(),0);assert.equal(b.loads(),0);
 }finally{a.win.close();b.win.close();}
});
test('navigation stays identical and on one row at mobile widths',()=>{
 for(const width of [320,375,760]){
  const a=page(home,homeCSS,width),b=page(article,articleCSS,width);
  try{
   for(const ui of [a,b]){
    const computed=selector=>ui.win.getComputedStyle(ui.doc.querySelector(selector));
    assert.equal(computed('.site-header').height,'60px');
    assert.equal(computed('.site-header').flexWrap,'nowrap');
    assert.equal(computed('.header-actions').flexWrap,'nowrap');
    assert.equal(computed('.header-search-toggle').display,'grid');
    assert.equal(computed('.header-search-sheet').visibility,'hidden');
    assert.equal(computed('.header-search-sheet').position,'fixed');
    ui.doc.querySelector('.header-search-toggle').click();
    assert.equal(computed('.header-search-sheet').visibility,'visible');
    assert.equal(computed('.header-search-back').display,'grid');
    assert.equal(computed('#home-search-form').display,'flex');
    assert.ok(ui.doc.documentElement.classList.contains('header-search-active'));
    ui.doc.querySelector('.header-search-back').click();
    assert.equal(computed('.header-search-sheet').visibility,'hidden');
    assert.equal(ui.doc.querySelector('.header-search-toggle').getAttribute('aria-expanded'),'false');
    assert.ok(!ui.doc.documentElement.classList.contains('header-search-active'));
   }
  }finally{a.win.close();b.win.close();}
 }
});

test('detail navigation supports mobile search and lazy lookup without replacing the article',async()=>{
 const ui=page(article,articleCSS);
 try{
  ui.win.matchMedia=()=>({matches:true});
  const toggle=ui.doc.querySelector('.header-search-toggle');toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  assert.equal(ui.doc.activeElement.id,'home-term-search');
  assert.equal(ui.loads(),0);
  const input=ui.doc.activeElement;input.value=normalizeCatalog(JSON.parse(raw))[0].term;
  input.dispatchEvent(new ui.win.Event('input',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(ui.loads(),1);assert.ok(ui.doc.querySelector('.home-search-result'));
  assert.equal(ui.doc.querySelector('article h1').textContent,'Threads 마케터 만들기');
  input.dispatchEvent(new ui.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(ui.doc.querySelector('#header-search-panel').hidden,true);
 }finally{ui.win.close();}
});

test('every prompt box copies only its own exact text and reports clipboard errors',async()=>{
 const ui=page(article,articleCSS),copied=[];
 try{
  let fail=false;
  const navigator={clipboard:{writeText:async text=>{if(fail)throw new Error('Denied');copied.push(text);}}};
  initArticleCopy({document:ui.doc,navigator});
  const blocks=[...ui.doc.querySelectorAll('.code-block')];
  assert.equal(blocks.length,ui.doc.querySelectorAll('pre').length);
  assert.ok(blocks.length>1);
  for(const block of blocks){
   block.querySelector('button svg').dispatchEvent(new ui.win.MouseEvent('click',{bubbles:true}));
   await Promise.resolve();
   assert.equal(copied.at(-1),block.querySelector('pre code').textContent);
   assert.ok(block.querySelector('button').classList.contains('is-copied'));
  }
  fail=true;blocks[0].querySelector('button').click();await Promise.resolve();
  assert.equal(blocks[0].querySelector('button').disabled,false);
  assert.equal(blocks[0].querySelector('button').classList.contains('is-copied'),false);
  assert.ok(blocks[0].querySelector('[role=status]').textContent);
 }finally{ui.win.dispatchEvent(new ui.win.Event('pagehide'));ui.win.close();}
});
