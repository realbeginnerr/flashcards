import {readFile,writeFile} from 'node:fs/promises';
import {renderArticle,renderGuidePage} from './thread-article.mjs';

export const uxuiDesignerSource='웹앱_UXUI_디자이너_만들기.md';
export async function renderUxuiDesignerPage(){
 const markdown=await readFile(new URL('../'+uxuiDesignerSource,import.meta.url),'utf8');
 const {body,headings}=renderArticle(markdown.trimEnd());
 return renderGuidePage({body,headings,title:'웹/앱 UXUI 디자이너 만들기',description:'PRD 작성부터 런칭, 런칭 후 데이터로 계속 개선하기까지 AI와 함께 웹사이트를 만드는 10단계 가이드'});
}
export async function buildUxuiDesignerArticle(){
 await writeFile('dist/uxui-designer.html',await renderUxuiDesignerPage());
}
