import {Window} from 'happy-dom';

export function linkArticleTerms(html,terms){
 const aliases=new Map();
 for(const term of terms){
  for(const raw of [term.term,term.englishTerm]){
   const label=raw?.trim();
   if(label&&label.length>=2&&!aliases.has(label.toLowerCase()))aliases.set(label.toLowerCase(),term.id);
  }
 }
 if(!aliases.size)return html;
 const escapePattern=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp([...aliases.keys()].sort((a,b)=>b.length-a.length).map(escapePattern).join('|'),'giu');
 const win=new Window();
 try{
  win.document.write(html);
  const root=win.document.querySelector('.article-body');
  if(!root)return html;
  const walker=win.document.createTreeWalker(root,4),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
   if(node.parentElement.closest('a,code,pre,h1,h2,h3,h4,h5,h6,button,script,style'))continue;
   const value=node.textContent,fragment=win.document.createDocumentFragment();
   let cursor=0,changed=false;
   for(const match of value.matchAll(pattern)){
    const label=match[0],start=match.index,end=start+label.length;
    // Avoid matching English abbreviations inside longer words.
    if((/^[a-z0-9]/i.test(label)&&/[a-z0-9]/i.test(value[start-1]||''))||(/[a-z0-9]$/i.test(label)&&/[a-z0-9]/i.test(value[end]||'')))continue;
    fragment.append(value.slice(cursor,start));
    const link=win.document.createElement('a');
    link.className='article-term-link';
    link.href=`./#/term/${encodeURIComponent(aliases.get(label.toLowerCase()))}`;
    link.target='_blank';link.rel='noopener noreferrer';
    link.setAttribute('aria-label',`${label} 뜻 보기 (새 탭)`);
    link.textContent=label;
    fragment.append(link);cursor=end;changed=true;
   }
   if(changed){fragment.append(value.slice(cursor));node.replaceWith(fragment);}
  }
  return '<!doctype html>\n'+win.document.documentElement.outerHTML;
 }finally{win.close();}
}
