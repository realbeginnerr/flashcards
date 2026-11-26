export function initArticleCopy({document,navigator}){
 const timers=new Map();
 document.querySelector('.article-body')?.addEventListener('click',async event=>{
  const button=event.target.closest('.code-copy');if(!button||button.disabled)return;
  const block=button.closest('.code-block'),status=block.querySelector('.code-copy-status');
  clearTimeout(timers.get(button));button.disabled=true;
  try{
   await navigator.clipboard.writeText(block.querySelector('pre code').textContent);
   button.classList.add('is-copied');button.title='복사 완료';button.setAttribute('aria-label','복사 완료');status.textContent='복사했어요.';
   timers.set(button,setTimeout(()=>{button.classList.remove('is-copied');button.title='복사';button.setAttribute('aria-label','박스 내용 복사');status.textContent='';timers.delete(button);},2000));
  }catch{
   button.classList.remove('is-copied');button.title='다시 복사하기';button.setAttribute('aria-label','박스 내용 다시 복사');status.textContent='복사하지 못했어요. 텍스트를 선택해 복사해주세요.';
  }finally{button.disabled=false;}
 });
 document.defaultView.addEventListener('pagehide',()=>{for(const timer of timers.values())clearTimeout(timer);timers.clear();});
}
