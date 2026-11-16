import {CATEGORIES,loadState,saveState,eligible,unknownCards,nextBatch,rate,completeBatch,resetScope,bilingual,escapeHtml as e} from './core.js';
import {loadCatalog,configured,currentAdmin,login,logout,writeTerm,deleteTerm,seedCatalog} from './cloud.js';
const main=document.querySelector('#main'),notice=document.querySelector('#notice');
let storage;
try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('저장소 접근 불가');},setItem(){throw new Error('저장소 접근 불가');}};}
const loaded=loadState(storage);let state=loaded.state,storageBlocked=Boolean(loaded.error),terms=[],scope='전체',session=null,busy=false,editing=null,dirty=false,search='';
const selected=(v,target)=>v===target?' checked':'';
const button=(text,action,style='primary',extra='')=>`<button class="btn ${style}" type="button" data-action="${action}" ${extra}>${text}</button>`;
const tags=t=>`<div class="tags">${t.categories.map(c=>`<span>${e(c)}</span>`).join('')}</div>`;
const arrow='<span aria-hidden="true">↗</span>';
function focusTitle(){requestAnimationFrame(()=>{main.querySelector('h1')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});}
function message(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('visible');clearTimeout(message.timer);message.timer=setTimeout(()=>el.classList.remove('visible'),3500);}
function banner(text){notice.innerHTML=`<div class="notice" role="alert">${e(text)}</div>`;}
if(storageBlocked)banner('저장된 기록을 읽을 수 없어요. 기존 기록은 보존하고, 지금 학습은 임시로 진행할게요.');
function persist(){if(storageBlocked)return;const error=saveState(storage,state);if(error)banner('학습은 계속할 수 있지만, 기록을 이 브라우저에 저장하지 못했어요. 브라우저 저장 설정을 확인해주세요.');}
function render(content,{wide=false}={}){main.className=wide?'wide':'';main.innerHTML=content;document.querySelector('.site-footer').hidden=Boolean(session&&!session.done);focusTitle();}
function home(){
 session=null;dirty=false;editing=null;
 const total=eligible(terms,scope),done=new Set(state.completed[scope]||[]),remaining=total.filter(t=>!done.has(t.id)).length;
 const unknown=unknownCards(terms,state).length;
 render(`<section class="home-grid"><div class="home-intro"><p class="eyebrow">하루 열 장, 새로운 지식 한 조각</p><h1 tabindex="-1">알 듯 말 듯한 용어,<br><span>기억에 남도록.</span></h1><p class="intro-copy">디자인부터 AI까지.<br>뜻을 떠올리고, 확인하고, 다시 만나세요.</p><div class="intro-note"><span class="note-line"></span><p>가입 없이 가볍게 시작하는<br>나만의 실무 용어 공부</p></div><div class="sample"><span class="eyebrow">오늘, 이런 용어는 어때요?</span><div class="sample-word">스킬 <span>Skills</span></div><p>AI에게 작업 방법을 알려주는 지침 묶음</p><span class="sample-corner" aria-hidden="true">↗</span></div></div><section class="start-panel" aria-labelledby="start-title"><div class="panel-heading"><p class="eyebrow">무엇을 공부할까요?</p><h2 id="start-title">오늘의 학습 분야</h2><p class="muted">한 번에 10장씩, 내 속도대로.</p></div><fieldset class="category-list"><legend class="sr-only">학습 분야 선택</legend>${['전체',...CATEGORIES].map((c,i)=>`<label class="category-option"><input type="radio" name="scope" value="${e(c)}"${selected(scope,c)}><span class="category-index">0${i+1}</span><span class="category-name">${e(c)}</span><span class="category-count">${eligible(terms,c).length}<span>개</span></span><span class="radio-mark" aria-hidden="true"></span></label>`).join('')}</fieldset><div class="start-actions">${button(total.length?(remaining?'학습 시작':'처음부터 다시 학습')+' '+arrow:'등록된 용어가 없어요','start','primary',!total.length?'disabled':'')}${button(`모르는 용어 복습 <span class="count">${unknown}</span>`,'review','secondary')}<p class="storage-note">기록은 이 브라우저에 저장돼요. <button type="button" class="text-button" data-action="storage-info" aria-label="기록 저장 안내">자세히</button></p></div></section></section>`,{wide:true});
}
function begin(mode='normal',queue){
 if(mode==='normal'){
  let cards=nextBatch(terms,state,scope);
  if(!cards.length&&eligible(terms,scope).length){state=resetScope(state,scope);persist();cards=nextBatch(terms,state,scope);}
  if(!cards.length)return empty('이 분야에 등록된 용어가 없어요.','다른 분야를 선택해보세요.');
  session={mode,scope,queue:cards,ids:cards.map(c=>c.id),index:0,back:false,ratings:{},done:false};
 }else{
  const cards=queue||unknownCards(terms,state);
  if(!cards.length)return empty('모르는 용어가 아직 없어요.','학습 중 몰라요로 표시한 카드를 여기서 다시 만날 수 있어요.');
  session={mode,scope:'전체',remaining:cards.slice(10),queue:cards.slice(0,10),index:0,back:false,ratings:{},done:false};
 }
 study();
}
function empty(title,description){session=null;render(`<section class="empty-state"><span class="eyebrow">가볍게, 다시 시작</span><h1 tabindex="-1">${e(title)}</h1><p>${e(description)}</p>${button('학습하러 가기','home')}</section>`);}
function study(){
 const s=session;if(!s)return home();const term=s.queue[s.index];if(!term)return finish();
 const english=bilingual(term);const name=s.mode==='normal'?s.scope+' 학습':'모르는 용어 복습';
 render(`<section class="study-shell"><div class="study-toolbar">${button('학습 종료','exit','text-button')}<span class="session-name">${e(name)}</span><span class="numeric">${s.index+1} <span class="muted">/ ${s.queue.length}</span></span></div><div class="progress" role="progressbar" aria-label="이번 회차에서 확인한 카드" aria-valuenow="${s.index}" aria-valuemin="0" aria-valuemax="${s.queue.length}"><span style="width:${s.index/s.queue.length*100}%"></span></div><article class="flashcard ${s.back?'back':'front'}">${tags(term)}<div class="term-heading"><p class="eyebrow">${s.back?'뜻을 확인해보세요':'뜻을 먼저 떠올려보세요'}</p><h1 tabindex="-1">${e(term.term)}</h1>${english?`<p class="english">${e(english)}</p>`:''}</div>${s.back?`<div class="definition"><h2>뜻</h2><p class="preserve">${e(term.definition)}</p>${term.explanation?`<p class="preserve">${e(term.explanation)}</p>`:''}${term.example?`<div class="example"><h2>이렇게 쓰여요</h2><div class="preserve ${term.example.includes('flowchart ')||term.term==='스킬'?'code-example':''}">${e(term.example)}</div></div>`:''}${term.sources.length?`<details class="references"><summary>참고 자료</summary>${term.sources.map(src=>`<a href="${e(src.url)}" target="_blank" rel="noopener noreferrer">${e(src.title)} ↗</a>`).join('')}</details>`:''}</div><div class="flip-back">${button('용어 다시 보기','flip','text-button')}</div>`:`<div class="front-bottom"><p>정확히 몰라도 괜찮아요.<br>떠오르는 뜻을 생각해본 뒤 확인하세요.</p>${button('설명 보기 '+arrow,'flip')}</div>`}</article>${s.back?`<div class="rating-dock"><p>이 용어, 이제 어느 정도 알겠나요?</p><div class="rating-buttons">${button('몰라요','unknown','secondary')}${button('알아요','known','primary')}</div></div>`:`<p class="study-caption">한 장씩 천천히, 기억에 남을 때까지.</p>`}</section>`);
}
function evaluate(value){
 if(busy||!session?.back||session.done)return;busy=true;
 const s=session,term=s.queue[s.index];state=rate(state,term.id,value);s.ratings[term.id]=value;persist();
 s.index++;s.back=false;if(s.index===s.queue.length)finish();else study();
 setTimeout(()=>busy=false,250);
}
function finish(){
 const s=session;s.done=true;
 if(s.mode==='normal'){state=completeBatch(state,s.scope,s.ids);persist();}
 const unknown=s.queue.filter(t=>s.ratings[t.id]==='unknown'),known=s.queue.length-unknown.length;
 const next=s.mode==='normal'?nextBatch(terms,state,s.scope):s.remaining;
 const allDone=s.mode==='normal'&&!next.length;
 render(`<section class="complete-panel"><div class="completion-mark" aria-hidden="true">✓</div><p class="eyebrow">오늘도 한 걸음</p><h1 tabindex="-1">${allDone?'한 바퀴 학습했어요.':'이번 학습을 마쳤어요.'}</h1><p class="muted">조금 더 익숙해진 용어가 생겼네요.</p><div class="result-stats"><div><span>확인한 카드</span><strong>${s.queue.length}<small>장</small></strong></div><div><span>알아요</span><strong>${known}<small>장</small></strong></div><div><span>몰라요</span><strong>${unknown.length}<small>장</small></strong></div></div><div class="complete-actions">${next.length?button(`${next.length<10?'남은 '+next.length+'장':'다음 10장'} 학습 ${arrow}`,'next'):allDone?button('처음부터 다시 학습','restart'):''}${unknown.length?button('이번에 모른 용어 복습','review-session',next.length||allDone?'secondary':'primary'):'<p class="muted">이번에 모른다고 표시한 용어가 없어요.</p>'}${button('처음으로','home','text-button')}</div><p class="storage-note">결과는 스스로 표시한 이해도예요.</p></section>`);
}
async function admin(){
 session=null;
 if(!configured){render(`<section class="admin-login"><p class="eyebrow">운영자 전용</p><h1 tabindex="-1">관리자 로그인</h1><p>학습 공간을 차근차근 준비하고 있어요.</p><div class="info-box">Google 관리자 로그인 연결을 준비 중이에요.<br>일반 학습과 복습은 지금 이용할 수 있어요.</div>${button('학습으로 돌아가기','home','secondary')}</section>`);return;}
 render('<p class="loading">로그인 상태를 확인하는 중이에요.</p>');
 try{const user=await currentAdmin();if(user)return adminList();render(`<section class="admin-login"><p class="eyebrow">운영자 전용</p><h1 tabindex="-1">관리자 로그인</h1><p>등록된 관리자 계정으로<br>용어를 관리할 수 있어요.</p><div id="admin-error" role="alert"></div>${button('Google로 로그인','login')}${button('학습으로 돌아가기','home','text-button')}</section>`);}catch(err){render(`<section class="empty-state"><h1 tabindex="-1">로그인을 준비하지 못했어요.</h1><p>${e(err.message)}</p>${button('다시 시도','admin')}</section>`);}
}
function adminList(){
 editing=null;dirty=false;
 render(`<section class="admin-shell"><div class="admin-heading"><div><p class="eyebrow">운영자</p><h1 tabindex="-1">용어 관리</h1></div>${button('로그아웃','logout','text-button')}</div><div class="admin-tools"><label class="sr-only" for="term-search">용어명 검색</label><input id="term-search" type="search" placeholder="용어명 또는 영문 검색" value="${e(search)}">${button('용어 추가 +','add')}</div><div id="admin-error" role="alert"></div><p class="muted" id="result-count"></p><div id="term-list"></div>${!terms.length?button('초기 용어 239개 등록','seed','secondary'):''}</section>`);filterList();
}
function filterList(){
 const found=terms.filter(t=>(t.term+' '+t.englishTerm).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const list=main.querySelector('#term-list');if(!list)return;
 main.querySelector('#result-count').textContent=`총 ${found.length}개`;
 list.innerHTML=found.length?found.map(t=>`<div class="admin-term"><div><strong>${e(t.term)}</strong>${bilingual(t)?`<span class="english">${e(t.englishTerm)}</span>`:''}${tags(t)}</div>${button('수정','edit','secondary',`data-id="${e(t.id)}"`)}</div>`).join(''):'<p class="empty-copy">검색 결과가 없어요. 다른 용어로 찾아보세요.</p>';
}
function editor(term){
 editing=term||null;dirty=false;const t=term||{term:'',englishTerm:'',definition:'',example:'',explanation:'',categories:[],sources:[]};
 render(`<section class="admin-shell editor"><p class="eyebrow">용어 관리</p><h1 tabindex="-1">${term?'용어 수정':'새 용어 추가'}</h1><form id="term-form"><label>용어명 <span class="required">필수</span><input name="term" value="${e(t.term)}" maxlength="200" required></label><label>영문·약어 <span class="optional">선택</span><input name="englishTerm" value="${e(t.englishTerm)}" maxlength="500"></label><fieldset><legend>분야 <span class="required">하나 이상 선택</span></legend><div class="check-grid">${CATEGORIES.map(c=>`<label><input type="checkbox" name="categories" value="${e(c)}" ${t.categories.includes(c)?'checked':''}>${e(c)}</label>`).join('')}</div><p class="field-error" id="category-error" aria-live="polite"></p></fieldset>${[['definition','뜻','필수'],['explanation','추가 설명','선택'],['example','예시','선택']].map(([name,label,req])=>`<label>${label} <span class="${req==='필수'?'required':'optional'}">${req}</span><textarea name="${name}" maxlength="20000" rows="${name==='definition'?6:4}" ${req==='필수'?'required':''}>${e(t[name])}</textarea></label>`).join('')}<label>참고 출처 <span class="optional">선택 · 한 줄에 URL 하나</span><textarea name="sources" rows="3">${e(t.sources.map(s=>s.url).join('\n'))}</textarea></label><div id="form-error" role="alert"></div><div class="form-actions"><button type="submit" class="btn primary">저장</button>${button('취소','cancel','secondary')}</div>${term?`<div class="delete-area">${button('이 용어 삭제','delete','danger')}</div>`:''}</form></section>`);
}
function canLeave(){return !dirty||confirm('저장하지 않은 내용이 있어요. 변경 내용을 버리고 나갈까요?');}
async function saveForm(form){
 if(busy)return;const values=new FormData(form),categories=values.getAll('categories');
 const categoryError=form.querySelector('#category-error');categoryError.textContent='';if(!categories.length){categoryError.textContent='분야를 하나 이상 선택해주세요.';form.querySelector('[name=categories]').focus();return;}
 const sources=String(values.get('sources')).split('\n').map(x=>x.trim()).filter(Boolean);
 if(sources.some(url=>!/^https?:\/\//i.test(url))){form.querySelector('#form-error').textContent='참고 출처는 https:// 또는 http://로 시작하는 URL을 입력해주세요.';return;}
 let sourceObjects;try{sourceObjects=sources.map(url=>({title:new URL(url).hostname,url}));}catch{form.querySelector('#form-error').textContent='참고 출처의 URL 형식을 확인해주세요.';return;}
 const value={id:editing?.id||'term-'+crypto.randomUUID(),...Object.fromEntries(['term','englishTerm','definition','explanation','example'].map(key=>[key,values.get(key)])),categories,sources:sourceObjects};
 busy=true;const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent='저장 중…';form.querySelector('#form-error').textContent='';
 try{await writeTerm(value,editing);dirty=false;terms=await loadCatalog();adminList();message('용어를 저장했어요.');}catch(err){form.querySelector('#form-error').textContent=err.message;}finally{busy=false;if(submit.isConnected){submit.disabled=false;submit.textContent='저장';}}
}
async function refresh(){render('<p class="loading">용어를 불러오는 중이에요.</p>');try{terms=await loadCatalog();if(location.hash.startsWith('#/admin'))await admin();else home();}catch(err){render(`<section class="empty-state"><h1 tabindex="-1">용어를 불러오지 못했어요.</h1><p>연결 상태를 확인하고 다시 시도해주세요.</p>${button('다시 시도','retry')}</section>`);}}
main.addEventListener('change',ev=>{if(ev.target.name==='scope'){scope=ev.target.value;home();}if(ev.target.closest('#term-form'))dirty=true;});
main.addEventListener('input',ev=>{if(ev.target.id==='term-search'){search=ev.target.value;filterList();}if(ev.target.closest('#term-form'))dirty=true;});
main.addEventListener('submit',ev=>{if(ev.target.id==='term-form'){ev.preventDefault();saveForm(ev.target);}});
main.addEventListener('click',async ev=>{
 const target=ev.target.closest('[data-action]');if(!target||target.disabled)return;const action=target.dataset.action;
 if(['known','unknown'].includes(action))return evaluate(action);
 if(busy)return;
 switch(action){
  case 'home':if(canLeave()){dirty=false;if(location.hash!=='#/')location.hash='#/';else home();}break;
  case 'start':begin();break;
  case 'review':begin('review');break;
  case 'flip':session.back=!session.back;study();break;
  case 'exit':session=null;home();break;
  case 'next':{const s=session;if(s.mode==='normal')begin();else begin('review',s.remaining);break;}
  case 'restart':state=resetScope(state,scope);persist();begin();break;
  case 'review-session':begin('review',session.queue.filter(t=>session.ratings[t.id]==='unknown'));break;
  case 'storage-info':alert('이해도와 완료한 학습 묶음은 현재 브라우저에 저장돼요. 다른 기기·브라우저와는 공유되지 않으며, 브라우저 데이터를 지우면 기록도 사라질 수 있어요.');break;
  case 'retry':await refresh();break;
  case 'admin':await admin();break;
  case 'login':busy=true;target.disabled=true;try{await login();await admin();}catch(err){main.querySelector('#admin-error').textContent=err.code==='auth/popup-closed-by-user'?'로그인을 취소했어요. 다시 시도할 수 있어요.':err.message;}finally{busy=false;target.disabled=false;}break;
  case 'logout':if(canLeave()){await logout();dirty=false;await admin();}break;
  case 'add':editor();break;
  case 'edit':editor(terms.find(t=>t.id===target.dataset.id));break;
  case 'cancel':if(canLeave())adminList();break;
  case 'delete':if(confirm(`‘${editing.term}’ 용어를 삭제할까요? 삭제 후에는 되돌릴 수 없어요.`)){busy=true;target.disabled=true;try{await deleteTerm(editing);dirty=false;terms=await loadCatalog();adminList();message('용어를 삭제했어요.');}catch(err){main.querySelector('#form-error').textContent=err.message;}finally{busy=false;target.disabled=false;}}break;
  case 'seed':if(confirm('검토한 초기 용어 239개를 이 프로젝트에 등록할까요?')){busy=true;target.disabled=true;try{await seedCatalog();terms=await loadCatalog();adminList();message('초기 용어를 등록했어요.');}catch(err){main.querySelector('#admin-error').textContent=err.message;}finally{busy=false;target.disabled=false;}}break;
 }
});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
window.addEventListener('hashchange',()=>{if(dirty&&!canLeave()){history.replaceState(null,'','#/admin');return;}dirty=false;location.hash.startsWith('#/admin')?admin():home();});
document.addEventListener('click',ev=>{const link=ev.target.closest('a[href^="#/"]');if(link&&dirty&&!canLeave())ev.preventDefault();});
refresh();
