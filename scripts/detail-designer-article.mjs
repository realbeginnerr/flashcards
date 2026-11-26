import {readFile,writeFile} from 'node:fs/promises';
import {renderArticle,renderGuidePage} from './thread-article.mjs';

export const detailDesignerSource='상세페이지_디자이너_만들기_실제사례.md';
export async function renderDetailDesignerPage(){
 const markdown=await readFile(new URL('../'+detailDesignerSource,import.meta.url),'utf8');
 const rendered=renderArticle(markdown.trimEnd()+'\n\n## 완성 이미지\n'),headings=rendered.headings;
 const hero='<figure class="article-hero"><img src="./guides/detail-designer-workspace.png" width="739" height="755" alt="상세 페이지 작업 화면. 온풍기 상세 페이지의 섹션 시안 여러 벌과 상품 사진, 색상 견본이 한 화면에 펼쳐져 있다."></figure>';
 const finalImage='<figure class="article-final"><img src="./guides/detail-designer-final.png" width="780" height="10334" loading="lazy" decoding="async" alt="완성된 PTC 타워 리모컨 온풍기 상세 페이지 전체. 첫 화면, 사용 장면, 기능 설명, 제품 정보 순서로 이어진다."></figure>';
 const body=rendered.body.replace('</h1>','</h1>'+hero)+finalImage;
 return renderGuidePage({body,headings,title:'상세 페이지 디자이너 만들기',description:'상품 하나를 직접 만들며 기록한 기준으로 상세 페이지 제작을 AI에게 맡기는 7단계 가이드'});
}
export async function buildDetailDesignerArticle(){
 await writeFile('dist/detail-page-designer.html',await renderDetailDesignerPage());
}
