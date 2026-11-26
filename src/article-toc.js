export function initArticleToc({document,window}){
 const entries=[...document.querySelectorAll('.blog-toc a[href^="#"]')].map(link=>({link,heading:document.getElementById(link.getAttribute('href').slice(1))})).filter(entry=>entry.heading);
 if(!entries.length)return;
 let frame=null;
 function update(){
  frame=null;
  const header=document.querySelector('.site-header');
  const readingLine=(header?.getBoundingClientRect().bottom??0)+40;
  let active=null;
  for(const entry of entries){
   if(entry.heading.getBoundingClientRect().top>readingLine)break;
   active=entry;
  }
  const root=document.documentElement;
  if(window.scrollY>0&&window.scrollY+window.innerHeight>=root.scrollHeight-2)active=entries.at(-1);
  for(const entry of entries){
   if(entry===active)entry.link.setAttribute('aria-current','location');
   else entry.link.removeAttribute('aria-current');
  }
 }
 function schedule(){if(frame===null)frame=window.requestAnimationFrame(update);}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);
 window.addEventListener('hashchange',schedule);
 window.addEventListener('load',schedule);
 document.fonts?.ready.then(schedule);
 update();
}
