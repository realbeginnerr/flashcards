export function initHeader({document,window,getTerms,loadTerms,e,bilingual}){
 if(document.querySelector('.header-search'))return;
 const exampleBlock=(value,label)=>{if(!value)return '';const prefix=`(${label})`,text=value.startsWith(prefix)?value.slice(prefix.length).trim():value;return `<section class="definition-example"><h2>${e(label)}</h2><p class="preserve">${e(text)}</p></section>`;};
async function updateHomeSearch(){
 const input=document.querySelector('#home-term-search'),results=document.querySelector('#home-search-results'),status=document.querySelector('#home-search-status');
 if(!input||!results)return;
 const query=input.value.trim().normalize('NFKC').toLocaleLowerCase();
 const panel=document.querySelector('#header-search-panel');
 panel.hidden=!query;input.setAttribute('aria-expanded',String(Boolean(query)));
 if(!query){results.innerHTML='';status.textContent='';return;}
 let terms=getTerms();
 if(!terms){
  results.innerHTML='';status.textContent='용어를 불러오는 중이에요.';
  try{terms=await loadTerms();}
  catch{if(!panel.hidden&&input.value.trim().normalize('NFKC').toLocaleLowerCase()===query)status.textContent='용어를 불러오지 못했어요. 다시 검색해주세요.';return;}
  if(panel.hidden||input.value.trim().normalize('NFKC').toLocaleLowerCase()!==query)return;
 }
 const found=terms.filter(term=>[term.term,term.englishTerm,term.synonyms].some(value=>String(value||'').normalize('NFKC').toLocaleLowerCase().includes(query)));
 status.textContent=found.length?`${found.length}개의 용어를 찾았어요.`:'검색 결과가 없어요. 다른 단어로 검색해보세요.';
 results.innerHTML=found.map(term=>`<details class="home-search-result"><summary><span>${e(term.term)}</span>${bilingual(term)?`<span class="search-english">${e(bilingual(term))}</span>`:''}</summary><div class="search-definition"><p class="preserve">${e(term.definition)}</p>${exampleBlock(term.explanation,'업무 관련 예시')}${exampleBlock(term.example,'상황 예시')}</div></details>`).join('');
}
const headerSearch=document.querySelector('.header-admin');
headerSearch.insertAdjacentHTML('beforebegin',`<div class="header-search"><button class="header-search-toggle" type="button" aria-label="용어 검색 열기" aria-controls="home-search-form" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button><form id="home-search-form" role="search" aria-label="용어 검색"><label class="sr-only" for="home-term-search">저장된 용어 검색</label><input id="home-term-search" type="search" placeholder="용어 검색" autocomplete="off" aria-controls="header-search-panel" aria-expanded="false"><button type="submit" aria-label="용어 검색"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg></button></form><section id="header-search-panel" class="header-search-panel" aria-label="용어 검색 결과" hidden><p id="home-search-status" role="status"></p><div id="home-search-results"></div></section></div>`);
document.querySelector('#home-term-search').addEventListener('input',updateHomeSearch);
document.querySelector('#home-term-search').addEventListener('focus',updateHomeSearch);
document.querySelector('#home-search-form').addEventListener('submit',ev=>{ev.preventDefault();updateHomeSearch();});
function closeHeaderSearch(){document.querySelector('#header-search-panel').hidden=true;document.querySelector('#home-term-search').setAttribute('aria-expanded','false');document.querySelector('.header-search').classList.remove('is-open');document.querySelector('.header-search-toggle').setAttribute('aria-expanded','false');}
document.addEventListener('click',ev=>{if(!ev.target.closest('.header-search'))closeHeaderSearch();});
document.querySelector('.header-search-toggle').addEventListener('click',()=>{const wrapper=document.querySelector('.header-search'),toggle=wrapper.querySelector('.header-search-toggle');if(wrapper.classList.contains('is-open')){closeHeaderSearch();return;}wrapper.classList.add('is-open');toggle.setAttribute('aria-expanded','true');wrapper.querySelector('input').focus();});
document.querySelector('.header-search').addEventListener('keydown',ev=>{if(ev.key==='Escape'){closeHeaderSearch();document.querySelector(window.matchMedia('(max-width:760px)').matches?'.header-search-toggle':'#home-term-search').focus();closeHeaderSearch();}});
document.querySelector('.header-search').addEventListener('focusout',ev=>{if(!ev.currentTarget.contains(ev.relatedTarget))closeHeaderSearch();});

}
