// Slim bar under the site header that keeps the guide title and the current step visible once the page title scrolls away.
// No scroll-progress indicator on purpose: motion in peripheral vision distracts from reading.
export function initReadingBar({document,window}){
 const bar=document.querySelector('.reading-bar'),title=document.querySelector('.article-body h1');
 if(!bar||!title)return;
 const step=bar.querySelector('.reading-step'),separator=bar.querySelector('.reading-separator');
 let frame=null;
 function setStep(){
  const current=document.querySelector('.blog-toc a[aria-current="location"]');
  const text=current?.textContent.trim()??'';
  step.textContent=text;
  separator.hidden=!text;
 }
 function update(){
  frame=null;
  const header=document.querySelector('.site-header');
  const headerBottom=header?.getBoundingClientRect().bottom??0;
  bar.classList.toggle('is-visible',title.getBoundingClientRect().bottom<=headerBottom);
  setStep();
 }
 function schedule(){if(frame===null)frame=window.requestAnimationFrame(update);}
 const toc=document.querySelector('.blog-toc');
 if(toc&&window.MutationObserver)new window.MutationObserver(setStep).observe(toc,{subtree:true,attributes:true,attributeFilter:['aria-current']});
 bar.querySelector('.reading-bar-link').addEventListener('click',event=>{
  event.preventDefault();
  window.scrollTo({top:0,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 });
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);
 window.addEventListener('load',schedule);
 update();
}
