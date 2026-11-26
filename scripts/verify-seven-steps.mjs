import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {renderThreadPage} from './thread-article.mjs';
const html=await renderThreadPage();
const win=new Window();
win.document.body.innerHTML=html;
const titles=[...win.document.querySelectorAll('.article-body h2')].map(e=>e.textContent.replace(/^📌\s*/,''));
assert.deepEqual(titles.filter(t=>t.startsWith('Step ')),[
 'Step 1. 준비사항',
 'Step 2. 업무 하나를 직접 하면서 기록하기',
 'Step 3. 워크플로우 만들라고 하기',
 'Step 4. 업무 가이드, 기록 양식 만들기',
 'Step 5. 스킬, 하네스 만들기',
 'Step 6. 정해진 시간에 업무시작 설정',
 'Step 7. 게시, 성과 측정, 개선하기'
]);
assert(!titles.includes('준비사항'));
assert.equal(win.document.querySelectorAll('.blog-toc a').length,titles.length);
assert.equal(win.document.querySelector('.article-body h3').textContent,'1-1. 계정과 앱 준비하기');
for(const heading of win.document.querySelectorAll('.article-body h1,.article-body h2,.article-body h3,.article-body h4')){
 const text=heading.textContent;
 const isStep=/^Step\s+\d+\./.test(text.replace(/^📌\s*/,''));
 assert.equal(text.startsWith('📌 '),isStep);
}
for(const link of win.document.querySelectorAll('.blog-toc a'))assert(!link.textContent.includes('📌'));
assert(!/Step [89]\./.test(html));
assert(html.includes('7단계 가이드'));
console.log('7단계 구성·목차·준비사항·메타 설명 검증 통과');
win.close();
