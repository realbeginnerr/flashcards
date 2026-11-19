import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyState,parseState,loadState,saveState,STORE_KEY,eligible,nextBatch,completeBatch,rate,resetScope,unknownCards,normalizeCatalog,bilingual,escapeHtml} from '../src/core.js';
const terms=normalizeCatalog(JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8')));
test('239 valid cards, stable unique IDs, no deleted IA card',()=>{
 assert.equal(terms.length,239);assert.equal(new Set(terms.map(t=>t.id)).size,239);assert.ok(!terms.some(t=>t.id==='glossary-r151'));
 assert.equal(terms.filter(t=>t.id.startsWith('glossary-r011')).length,2);
 assert.ok(terms.every(t=>Number.isInteger(t.importance)&&t.importance>=1&&t.importance<=5));
 assert.equal(terms.filter(t=>t.imageUrl).length,21);assert.ok(terms.every(t=>!t.imageUrl||/^https?:\/\//.test(t.imageUrl)));
});
test('review workbook meaning structure and mention frequency are preserved',()=>{
 assert.equal(terms.filter(term=>term.explanation&&term.example).length,221);
 assert.equal(terms.filter(term=>term.explanation&&!term.example).length,5);
 assert.deepEqual(Object.fromEntries([1,2,3,4,5].map(score=>[score,terms.filter(term=>term.importance===score).length])),{1:19,2:30,3:69,4:77,5:44});
});
test('all terms proceed in 10-card batches, ending with 9 and no duplicates',()=>{
 let state=emptyState();const seen=[];let batch;
 while((batch=nextBatch(terms,state)).length){assert.ok(batch.length<=10);seen.push(...batch.map(t=>t.id));state=completeBatch(state,'전체',batch.map(t=>t.id));if(seen.length===239)assert.equal(batch.length,9);}
 assert.equal(seen.length,239);assert.equal(new Set(seen).size,239);assert.equal(nextBatch(terms,state).length,0);
});
test('new study cards prioritize mention frequency and randomize ties',()=>{
 const cards=[
  {id:'low',importance:1,categories:['개발']},
  {id:'high-a',importance:5,categories:['개발']},
  {id:'mid',importance:3,categories:['개발']},
  {id:'high-b',importance:5,categories:['개발']},
 ];
 const first=nextBatch(cards,emptyState(),'전체',()=>0.999999);
 const second=nextBatch(cards,emptyState(),'전체',()=>0);
 assert.deepEqual(first.map(card=>card.importance),[5,5,3,1]);
 assert.deepEqual(second.map(card=>card.importance),[5,5,3,1]);
 assert.notDeepEqual(first.slice(0,2).map(card=>card.id),second.slice(0,2).map(card=>card.id));
});
test('multi-category cards share one rating and remain unique in global catalog',()=>{
 const card=terms.find(t=>t.categories.length>1);const state=rate(emptyState(),card.id,'unknown');
 assert.equal(unknownCards(terms,state).filter(t=>t.id===card.id).length,1);
 for(const scope of card.categories)assert.ok(eligible(terms,scope).some(t=>t.id===card.id));
});
test('known card exits review, unknown stays, deleted IDs do not count',()=>{
 let s=rate(emptyState(),terms[0].id,'unknown');s=rate(s,'deleted-card','unknown');assert.equal(unknownCards(terms,s).length,1);
 s=rate(s,terms[0].id,'known');assert.equal(unknownCards(terms,s).length,0);
});
test('field batches filter correctly and field progress is independent',()=>{
 let s=completeBatch(emptyState(),'전체',terms.slice(0,10).map(t=>t.id));
 assert.equal(nextBatch(terms,s,'AI 툴').length,10);assert.ok(nextBatch(terms,s,'AI 툴').every(t=>t.categories.includes('AI 툴')));
 s=completeBatch(s,'AI 툴',nextBatch(terms,s,'AI 툴').map(t=>t.id));assert.equal(nextBatch(terms,s,'AI 툴').length,2);
});
test('ratings survive local storage roundtrip and restart',()=>{
 let s=rate(emptyState(),terms[0].id,'unknown');s=completeBatch(s,'전체',[terms[0].id]);
 const stored=new Map();const storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
 assert.equal(saveState(storage,s),null);const restored=loadState(storage).state;assert.deepEqual(restored,s);
 const restarted=resetScope(restored,'전체');assert.equal(restarted.ratings[terms[0].id],'unknown');assert.equal(nextBatch(terms,restarted)[0].importance,5);
});
test('broken storage is reported and never overwritten by load',()=>{
 let writes=0;const storage={getItem:()=>'{invalid',setItem:()=>writes++};
 assert.ok(loadState(storage).error);assert.equal(writes,0);
 assert.ok(saveState({setItem(){throw new Error('quota');}},emptyState()));
});
test('unsupported state, malformed types and bad ratings handled',()=>{
 assert.throws(()=>parseState('{"version":2,"ratings":{},"completed":{}}'));
 assert.throws(()=>parseState('{"version":1,"ratings":[],"completed":{}}'));
 assert.deepEqual(parseState('{"version":1,"ratings":{"a":"invalid"},"completed":{"전체":["a","a",2]}}').completed['전체'],['a']);
 assert.throws(()=>rate(emptyState(),'id','other'));
});
test('existing state has no effect on edited definitions or new IDs',()=>{
 const s=rate(emptyState(),terms[0].id,'known');const changed=[{...terms[0],definition:'수정한 뜻'},{...terms[1],id:'new-card'}];
 assert.equal(s.ratings[changed[0].id],'known');assert.equal(s.ratings[changed[1].id],undefined);
});
test('deleted and stale completed IDs do not skip remaining cards',()=>{
 const s=completeBatch(emptyState(),'전체',['deleted',terms[0].id]),batch=nextBatch(terms,s);
 assert.equal(batch.length,10);assert.ok(!batch.some(card=>card.id===terms[0].id||card.id==='deleted'));
});
test('duplicate IDs, missing definitions and invalid categories reject whole catalog',()=>{
 assert.throws(()=>normalizeCatalog([terms[0],terms[0]]));
 assert.throws(()=>normalizeCatalog([{...terms[0],definition:''}]));
 assert.throws(()=>normalizeCatalog([{...terms[0],categories:['other']}]));
});
test('bilingual display avoids same label twice and keeps optional English',()=>{
 assert.equal(bilingual({term:'Git',englishTerm:'git'}),'');assert.equal(bilingual({term:'용어',englishTerm:''}),'');
 assert.equal(bilingual({term:'스킬',englishTerm:'Skills'}),'Skills');
});
test('untrusted content is escaped and unsafe source URLs excluded',()=>{
 assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
 const c=normalizeCatalog([{...terms[0],sources:[{url:'javascript:alert(1)',title:'bad'},{url:'https://example.com',title:'good'}]}])[0];
 assert.equal(c.sources.length,1);assert.equal(c.sources[0].title,'good');
});
