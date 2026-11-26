import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {renderThreadPage,articleSource,commonClosingSource} from '../scripts/thread-article.mjs';
import {renderDetailDesignerPage,detailDesignerSource} from '../scripts/detail-designer-article.mjs';

const common=await readFile(new URL('../'+commonClosingSource,import.meta.url),'utf8');
const commonText=common.trim().split(/\r?\n/).at(-1).trim();
const commonSubheadings=[...common.matchAll(/^### (.+)$/gm)].map(match=>match[1].trim());

test('the shared 기타 section lives in one file, not in each page source',async()=>{
 for(const source of [articleSource,detailDesignerSource]){
  const markdown=await readFile(new URL('../'+source,import.meta.url),'utf8');
  assert.doesNotMatch(markdown,/^## 기타/m,source);
 }
});

test('every step page ends with the same shared 기타 section, after the final image',async()=>{
 for(const html of [await renderThreadPage(),await renderDetailDesignerPage()]){
  const win=new Window();
  try{
   win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
   const doc=win.document,article=doc.querySelector('.article-body');
   const h2s=[...article.querySelectorAll('h2')];
   assert.equal(h2s.filter(h=>h.textContent==='기타').length,1);
   const last=h2s.at(-1);
   assert.equal(last.textContent,'기타');
   for(const element of article.querySelectorAll('figure'))assert.ok(element.compareDocumentPosition(last)&4,'기타 comes after every image');
   assert.equal(article.lastElementChild.previousElementSibling.textContent.replace(/\s+/g,' ').trim(),commonText.replace(/\s+/g,' '));
   assert.deepEqual([...article.querySelectorAll('h3')].filter(h=>h.compareDocumentPosition(last)&2).map(h=>h.textContent),commonSubheadings);
   const toc=[...doc.querySelectorAll('.blog-toc a')];
   assert.equal(toc.at(-1).textContent,'기타');
   assert.equal(toc.at(-1).getAttribute('href'),'#'+last.id);
   assert.equal(new Set([...doc.querySelectorAll('[id]')].map(e=>e.id)).size,doc.querySelectorAll('[id]').length,'ids stay unique');
  }finally{win.close();}
 }
});

test('every step page title gets the decorative robot icon without changing the title text',async()=>{
 const css=await readFile(new URL('../src/article.css',import.meta.url),'utf8');
 assert.match(css,/\.article-body h1::before\{[^}]*content:"🤖" \/ ""/);
 for(const html of [await renderThreadPage(),await renderDetailDesignerPage()])assert.doesNotMatch(html.match(/<h1[^>]*>[^<]*/)[0],/🤖/);
});

test('every step page has the page-term study link at the start and end of the article, listing only its linked terms',async()=>{
 for(const html of [await renderThreadPage(),await renderDetailDesignerPage()]){
  const win=new Window();
  try{
   win.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
   const article=win.document.querySelector('.article-body');
   const links=[...article.querySelectorAll('.page-study-link')];
   assert.equal(links.length,2);
   assert.equal(article.querySelector('h1').nextElementSibling.querySelector('.page-study-link'),links[0]);
   assert.equal(article.lastElementChild.querySelector('.page-study-link'),links[1]);
   const ids=[...new Set([...article.querySelectorAll('a.article-term-link')].map(a=>decodeURIComponent(a.getAttribute('href').split('/').pop())))];
   assert.ok(ids.length>0);
   for(const link of links){
    assert.match(link.textContent,/^이 페이지에 나오는 용어 학습하기/);
    assert.equal(link.target,'_blank');
    assert.equal(link.getAttribute('href'),'./#/study/terms/'+ids.map(encodeURIComponent).join(','));
    assert.equal(link.querySelector('.article-term-link'),null);
   }
  }finally{win.close();}
 }
});
