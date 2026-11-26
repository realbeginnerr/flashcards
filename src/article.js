import {initHeader} from './header.js';
import {loadCatalog} from './cloud.js';
import {escapeHtml as e,bilingual} from './core.js';
import {initArticleCopy} from './article-copy.js';
import {initArticleToc} from './article-toc.js';
import {initReadingBar} from './article-reading-bar.js';

initArticleCopy({document,navigator});
initArticleToc({document,window});
initReadingBar({document,window});

let terms=null,request=null;
initHeader({document,window,e,bilingual,getTerms:()=>terms,loadTerms:()=>request??=(async()=>{
 try{terms=await loadCatalog();return terms;}
 finally{request=null;}
})()});
