export const CATEGORIES=['UX/UI 디자인','피그마','개발','AI 툴','마케팅'];
export const STORE_KEY='boongeok.study.v1';
export const emptyState=()=>({version:1,ratings:{},completed:{}});
const unique=a=>[...new Set(a)];
export function parseState(raw){
 if(!raw)return emptyState();
 const obj=JSON.parse(raw);
 if(!obj||obj.version!==1||!obj.ratings||!obj.completed||Array.isArray(obj.ratings)||Array.isArray(obj.completed))throw new Error('기록 형식을 읽을 수 없습니다.');
 const ratings=Object.fromEntries(Object.entries(obj.ratings).filter(([id,v])=>id&&['known','unknown'].includes(v)));
 const completed=Object.fromEntries(Object.entries(obj.completed).filter(([scope,ids])=>['전체',...CATEGORIES].includes(scope)&&Array.isArray(ids)).map(([scope,ids])=>[scope,unique(ids.filter(x=>typeof x==='string'))]));
 return {version:1,ratings,completed};
}
export function loadState(storage){try{return {state:parseState(storage.getItem(STORE_KEY)),error:null};}catch(error){return {state:emptyState(),error};}}
export function saveState(storage,state){try{storage.setItem(STORE_KEY,JSON.stringify(state));return null;}catch(error){return error;}}
export function eligible(terms,scope='전체'){return terms.filter(c=>scope==='전체'||c.categories.includes(scope));}
export function unknownCards(terms,state){return terms.filter(c=>state.ratings[c.id]==='unknown');}
export function nextBatch(terms,state,scope='전체'){
 const done=new Set(state.completed[scope]||[]);
 return eligible(terms,scope).filter(c=>!done.has(c.id)).slice(0,10);
}
export function rate(state,id,value){if(!['known','unknown'].includes(value))throw new Error('이해도 값이 올바르지 않습니다.');return {...state,ratings:{...state.ratings,[id]:value}};}
export function completeBatch(state,scope,ids){return {...state,completed:{...state.completed,[scope]:unique([...(state.completed[scope]||[]),...ids])}};}
export function resetScope(state,scope){return {...state,completed:{...state.completed,[scope]:[]}};}
export function normalizeTerm(term){
 if(!term||typeof term!=='object'||Array.isArray(term))throw new Error('용어 형식이 올바르지 않습니다.');
 const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 const categories=unique((Array.isArray(term.categories)?term.categories:[]).filter(c=>CATEGORIES.includes(c)));
 const result={id:text(term.id,160),term:text(term.term,200),englishTerm:text(term.englishTerm,500),definition:text(term.definition,20000),explanation:text(term.explanation,20000),example:text(term.example,20000),categories,sources:[]};
 if(!result.id||!result.term||!result.definition||!categories.length)throw new Error('용어명, 뜻, 분야를 확인해주세요.');
 result.sources=(Array.isArray(term.sources)?term.sources:[]).filter(s=>s&&typeof s.url==='string'&&/^https?:\/\//i.test(s.url)).map(s=>({title:text(s.title,300)||'참고 자료',url:s.url})).slice(0,20);
 return result;
}
export function normalizeCatalog(data){
 if(!Array.isArray(data))throw new Error('용어 데이터를 읽을 수 없습니다.');
 const seen=new Set();return data.map(normalizeTerm).filter(t=>{if(seen.has(t.id))throw new Error('중복된 카드 ID가 있습니다.');seen.add(t.id);return true;});
}
export function bilingual(term){return term.englishTerm&&term.term.toLocaleLowerCase().trim()!==term.englishTerm.toLocaleLowerCase().trim()?term.englishTerm:'';}
export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
