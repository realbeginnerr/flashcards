import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {initReadingBar} from '../src/article-reading-bar.js';
import {renderThreadPage} from '../scripts/thread-article.mjs';

test('guide pages render the reading bar with the page title',async()=>{
 const html=await renderThreadPage();
 const win=new Window();
 try{
  win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
  const bar=win.document.querySelector('.reading-bar');
  assert.ok(bar);
  assert.equal(bar.getAttribute('aria-hidden'),'true');
  assert.equal(bar.querySelector('.reading-title').textContent,'Threads 마케터 만들기');
  assert.equal(bar.previousElementSibling.className,'site-header');
 }finally{win.close();}
});

test('reading bar appears after the title scrolls away and shows the current step and progress',()=>{
 const win=new Window();
 try{
  const doc=win.document;
  doc.body.innerHTML='<header class="site-header"></header><div class="reading-bar" aria-hidden="true"><a class="reading-bar-link" href="#article" tabindex="-1"><span class="reading-title">가이드</span><span class="reading-separator" hidden>›</span><span class="reading-step"></span></a><span class="reading-progress"><span class="reading-progress-value"></span></span></div><nav class="blog-toc"><a href="#a">Step 1. 준비</a><a href="#b">Step 2. 기록</a></nav><article class="article-body"><h1>가이드</h1></article>';
  let y=0;
  Object.defineProperty(win,'innerHeight',{get:()=>900});
  doc.querySelector('.site-header').getBoundingClientRect=()=>({bottom:80});
  doc.querySelector('h1').getBoundingClientRect=()=>({bottom:300-y});
  doc.querySelector('.article-body').getBoundingClientRect=()=>({top:200-y,height:2820});
  let pending=null;
  win.requestAnimationFrame=fn=>{pending=fn;return 1;};
  let scrolledTo=null;win.scrollTo=options=>{scrolledTo=options;};
  const scroll=next=>{y=next;win.dispatchEvent(new win.Event('scroll'));pending?.();pending=null;};
  const bar=doc.querySelector('.reading-bar'),progress=()=>doc.querySelector('.reading-progress-value').style.transform;
  initReadingBar({document:doc,window:win});
  assert.equal(bar.classList.contains('is-visible'),false);
  assert.equal(doc.querySelector('.reading-separator').hidden,true);
  assert.equal(progress(),'scaleX(0)');
  doc.querySelector('[href="#b"]').setAttribute('aria-current','location');
  scroll(220);
  assert.equal(bar.classList.contains('is-visible'),true);
  assert.equal(doc.querySelector('.reading-step').textContent,'Step 2. 기록');
  assert.equal(doc.querySelector('.reading-separator').hidden,false);
  scroll(2120);
  assert.equal(progress(),'scaleX(1)');
  scroll(100);
  assert.equal(bar.classList.contains('is-visible'),false);
  doc.querySelector('.reading-bar-link').click();
  assert.equal(scrolledTo.top,0);
 }finally{win.close();}
});
