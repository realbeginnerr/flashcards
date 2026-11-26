import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {linkArticleTerms} from '../scripts/article-term-links.mjs';
import {renderThreadPage} from '../scripts/thread-article.mjs';

test('article links registered terms while preserving headings, prompts and existing links',()=>{
 const output=linkArticleTerms('<article class="article-body"><h2>스킬</h2><p>스킬과 하네스</p><pre><code>스킬</code></pre><a href="https://example.com">스킬</a></article>',[{id:'skill',term:'스킬',importance:3},{id:'harness',term:'하네스',importance:5}]);
 const win=new Window();
 try{
  win.document.write(output);
  const links=win.document.querySelectorAll('.article-term-link');
  assert.equal(links.length,2);
  assert.equal(links[0].getAttribute('href'),'./#/term/skill');
  for(const link of links){assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');}
  assert.equal(win.document.querySelectorAll('h2 a,code a,a a').length,0);
  assert.equal(win.document.querySelector('pre').textContent,'스킬');
 }finally{win.close();}
});
test('terms rated 1-2 stars are not linked',()=>{
 const output=linkArticleTerms('<article class="article-body"><p>페이지와 스킬</p></article>',[{id:'page',term:'페이지',importance:1},{id:'minor',term:'스킬',importance:2}]);
 assert.ok(!output.includes('article-term-link'));
});
test('built article glossary links all point to known catalog entries',async()=>{
 const terms=JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8'));
 const byId=new Map(terms.map(term=>[term.id,term])),win=new Window();
 try{
  win.document.write(await renderThreadPage());
  const links=[...win.document.querySelectorAll('.article-term-link')];
  assert(links.length>0);
  for(const link of links){const term=byId.get(decodeURIComponent(link.getAttribute('href').split('/term/')[1]));assert(term);assert(term.importance>=3,term.term);}
  assert.equal(links.filter(link=>link.textContent==='페이지').length,0);
 }finally{win.close();}
});
