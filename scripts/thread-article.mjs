import {readFile,writeFile} from 'node:fs/promises';
import {linkArticleTerms} from './article-term-links.mjs';

// The user-supplied Markdown is the sole content source; never execute its examples.
export const articleSource='AI_native_system_구축하기_실제사례_보완본 (1).md';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(value){
 const tokens=[];
 const token=html=>`\u0000${tokens.push(html)-1}\u0000`;
 let text=value.replace(/`([^`]+)`/g,(_,code)=>token(`<code>${escape(code)}</code>`));
 text=text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>token(`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`));
 return escape(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\u0000(\d+)\u0000/g,(_,index)=>tokens[Number(index)]);
}
export function renderArticle(markdown){
 const headings=[];
 let headingIndex=0;
 function blocks(input){
  const lines=input.split(/\r?\n/),out=[];
  const special=line=>/^(?:#{1,6} |```|>\s?|\s*(?:[-*] |\d+\. )|\|)/.test(line);
  for(let i=0;i<lines.length;){
   const line=lines[i];
   if(!line.trim()){i++;continue;}
   if(line.startsWith('```')){
    const code=[];i++;
    while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);
    i++;out.push(`<div class="code-block"><button class="code-copy" type="button" aria-label="박스 내용 복사" title="복사"><svg class="copy-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V4h12v13h-3M4 8h12v12H4z"/></svg><svg class="copied-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button><span class="code-copy-status" role="status"></span><pre><code>${escape(code.join('\n'))}</code></pre></div>`);continue;
   }
   const heading=line.match(/^(#{1,6}) (.+)$/);
   if(heading){
    const level=heading[1].length,title=heading[2],id=`section-${++headingIndex}`;
    if(level===2)headings.push({id,title});
    const cleanTitle=title.replace(/^📌\s*/,'');
    const icon=level===2&&/^Step\s+\d+\./.test(cleanTitle)?'<span aria-hidden="true">📌 </span>':'';
    out.push(`<h${level} id="${id}">${icon}${inline(cleanTitle)}</h${level}>`);i++;continue;
   }
   if(line.startsWith('|')){
    const rows=[];
    while(i<lines.length&&lines[i].startsWith('|'))rows.push(lines[i++].trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim()));
    const [header,...body]=rows.filter(row=>!row.every(cell=>/^:?-+:?$/.test(cell)));
    out.push(`<div class="table-scroll" role="region" aria-label="본문 표" tabindex="0"><table><thead><tr>${header.map(cell=>`<th scope="col">${inline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map(row=>`<tr>${row.map(cell=>`<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);continue;
   }
   if(line.startsWith('>')){
    const quote=[];while(i<lines.length&&lines[i].startsWith('>'))quote.push(lines[i++].replace(/^> ?/,''));
    out.push(`<blockquote>${blocks(quote.join('\n'))}</blockquote>`);continue;
   }
   const list=line.match(/^(\s*)([-*]|\d+\.) (.*)$/);
   if(list){
    const ordered=/\d/.test(list[2]),items=[];
    while(i<lines.length){
     const item=lines[i].match(/^(\s*)([-*]|\d+\.) (.*)$/);
     if(!item||/\d/.test(item[2])!==ordered)break;
     items.push(`<li>${inline(item[3])}</li>`);i++;
    }
    const tag=ordered?'ol':'ul';out.push(`<${tag}>${items.join('')}</${tag}>`);continue;
   }
   const paragraph=[line];i++;
   while(i<lines.length&&lines[i].trim()&&!special(lines[i]))paragraph.push(lines[i++]);
   out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return out.join('\n');
 }
 const body=blocks(markdown);
 return {body,headings};
}
export async function renderGuidePage({body,headings,title,description}){
 const index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const header=index.match(/<header class="site-header">[\s\S]*?<\/header>/)[0].replace(/href="#\//g,'href="./#/');
 const footer=index.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
 const fonts=index.match(/<link rel="(?:preconnect|stylesheet)"[^>]+>/g).filter(link=>!link.includes('./src/')).join('');
 const toc=headings.map(({id,title})=>{
  const cleanTitle=title.replace(/^📌\s*/,'');
  return `<li><a href="#${id}">${escape(cleanTitle)}</a></li>`;
 }).join('');
 const html=`<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#255a46"><meta name="description" content="${escape(description)}"><title>${escape(title)} — JarvisT</title><link rel="icon" href="./favicon.svg" type="image/svg+xml">${fonts}<link rel="stylesheet" href="./src/article.css"><link rel="stylesheet" href="./src/header.css"><script type="module" src="./src/article.js"></script></head>
<body><a class="skip" href="#article">본문 바로가기</a>${header}<div class="reading-bar" aria-hidden="true"><a class="reading-bar-link" href="#article" tabindex="-1"><span class="reading-title">${escape(title)}</span><span class="reading-separator" hidden>›</span><span class="reading-step"></span></a><span class="reading-progress"><span class="reading-progress-value"></span></span></div>
<div class="blog-layout"><aside class="blog-toc"><nav aria-label="글 목차"><span class="toc-label">이 글의 순서</span><ol>${toc}</ol></nav></aside><main id="article"><nav class="article-kicker" aria-label="브레드크럼"><a href="./">홈</a><span aria-hidden="true">/</span><span aria-current="page">${escape(title)}</span></nav><article class="article-body">${body}</article><footer class="article-footer"><a href="./">← 다른 AI 직원 살펴보기</a><a href="#article">맨 위로 ↑</a></footer></main></div></body></html>`;
 const terms=JSON.parse(await readFile(new URL('../public/terms.json',import.meta.url),'utf8'));
 return linkArticleTerms(html.replace('</body>',`${footer}</body>`),terms);
}
export async function renderThreadPage(){
 const markdown=await readFile(new URL('../'+articleSource,import.meta.url),'utf8');
 const pageMarkdown=markdown
  .replace(/^# AI Native System 구축하기\r?$/m,'# Threads 마케터 만들기')
  .replace(/^이 챕터에서는 반복하는 업무 하나를 골라 AI에게 맡길 수 있는 형태로 만들었다\. 직접 일하면서 판단 기준을 기록했다\. 그 기록으로 작업 순서와 가이드를 만들었다\. 이후 AI가 초안을 만드는 단계부터 시험했다\.\r?\n?/m,'')
  .replace(/^실제 사례로는 Threads 게시물 작성과 성과 평가를 사용했다\. 작성, 게시, 성과 확인을 한 번씩 따라가면 AI에게 무엇을 맡기고 어디에서 사람이 개입할지 정할 수 있다\.\r?\n?/m,'');
 const prerequisites=`### 1-1. 계정과 앱 준비하기

- Thread 계정 만들기
- Notion 계정 만들기
- ChatGPT 계정 만들기, 데스크톱용 앱 설치하기 (다른 AI여도 괜찮아요. 다만, 데스크톱용 앱이 있거나 VS Code에 설치할 수 있는 AI여야 해요.)

`;
 const rendered=renderArticle(pageMarkdown.replace(/^(## Step 1\.[^\r\n]*\r?\n)/m,'$1\n'+prerequisites)),headings=rendered.headings;
 const body=rendered.body.replace('</h1>','</h1><figure class="article-hero"><img src="./guides/threads-approval-inbox.png" width="1280" height="462" alt="Notion AI 승인 대기함 화면. 주제 선택, 게시 승인, 성과 보고 요청이 AI 권장안·상태와 함께 목록으로 정리되어 있다."></figure>');
 const page=await renderGuidePage({body,headings,title:'Threads 마케터 만들기',description:'Threads 콘텐츠 작성과 성과 평가를 사례로 배우는 AI 직원 구축 7단계 가이드'});
 return page.replaceAll('Thread 마케터 만들기','Threads 마케터 만들기');
}
export async function buildThreadArticle(){
 await writeFile('dist/thread-marketer.html',await renderThreadPage());
}
