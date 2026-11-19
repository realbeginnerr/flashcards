// Administrator setup helper. OAuth access token arrives via stdin and is never persisted.
import {readFile} from 'node:fs/promises';
let token='';for await(const chunk of process.stdin)token+=chunk;token=token.trim();
if(!token)throw new Error('A Google Cloud access token is required on stdin.');
const project='flashcars-294bc',base=`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}`;
async function api(url,options={}){
 const res=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Goog-User-Project':project,...options.headers}});
 const json=await res.json();if(!res.ok)throw new Error(`${res.status}: ${json.error?.message||'request failed'}`);return json;
}
const mode=process.argv[2]||'inspect';
if(mode==='inspect'){
 for(const endpoint of ['config','defaultSupportedIdpConfigs/google.com']){
  try{const result=await api(`${base}/${endpoint}`);console.log(JSON.stringify(endpoint==='config'?{resource:'auth',initialized:true,authorizedDomains:result.authorizedDomains,hasOAuthClient:Boolean(result.client?.apiKey),displayName:result.notification?.sendEmail?.callbackUri}:{resource:'google',enabled:result.enabled,hasClientId:Boolean(result.clientId),hasClientSecret:Boolean(result.clientSecret)}));}
  catch(err){console.log(JSON.stringify({resource:endpoint,error:err.message}));}
 }
}else if(mode==='domains'){
 const config=await api(`${base}/config`);
 const authorizedDomains=[...new Set([...(config.authorizedDomains||[]),'localhost','boongeok-study-cards.hijmjo.chatgpt.site'])];
 const result=await api(`${base}/config?updateMask=authorizedDomains`,{method:'PATCH',body:JSON.stringify({authorizedDomains})});
 console.log(JSON.stringify({authorizedDomains:result.authorizedDomains}));
}else if(mode==='google'){
 const result=await api(`${base}/defaultSupportedIdpConfigs/google.com?updateMask=enabled`,{method:'PATCH',body:JSON.stringify({enabled:true})});
 console.log(JSON.stringify({googleEnabled:result.enabled,hasClientId:Boolean(result.clientId)}));
}else if(mode==='seed'){
 const terms=JSON.parse(await readFile('public/terms.json','utf8'));
 const value=v=>typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:Array.isArray(v)?{arrayValue:{values:v.map(value)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
 const writes=terms.map((t,i)=>({update:{name:`projects/${project}/databases/(default)/documents/terms/${t.id}`,fields:Object.fromEntries(Object.entries({...t,position:i,revision:1}).map(([k,v])=>[k,value(v)]))},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:false}}));
 const result=await api(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',body:JSON.stringify({writes})});
 console.log(JSON.stringify({created:result.writeResults.length,commitTime:result.commitTime}));
}else if(mode==='sync-figma'){
 const terms=JSON.parse(await readFile('public/terms.json','utf8')).filter(term=>term.categories.includes('피그마'));
 const writes=terms.map(term=>({
  update:{name:`projects/${project}/databases/(default)/documents/terms/${term.id}`,fields:{categories:{arrayValue:{values:term.categories.map(category=>({stringValue:category}))}}}},
  updateMask:{fieldPaths:['categories']},
  updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],
  currentDocument:{exists:true}
 }));
 const result=await api(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',body:JSON.stringify({writes})});
 console.log(JSON.stringify({updated:result.writeResults.length,commitTime:result.commitTime}));
}else if(mode==='sync-catalog'){
 const terms=JSON.parse(await readFile('public/terms.json','utf8'));
 if(terms.length!==239||terms.some(term=>!Number.isInteger(term.importance)||term.importance<1||term.importance>5))throw new Error('Catalog validation failed.');
 const docs=[];let pageToken='';
 do{
  const query=new URLSearchParams({pageSize:'300', ...(pageToken?{pageToken}:{})});
  const page=await api(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/terms?${query}`);
  docs.push(...(page.documents||[]));pageToken=page.nextPageToken||'';
 }while(pageToken);
 const existing=new Map(docs.map(doc=>[doc.name.split('/').at(-1),doc]));
 if(existing.size!==terms.length||terms.some(term=>!existing.has(term.id)))throw new Error(`Live catalog mismatch: expected ${terms.length}, found ${existing.size}.`);
 const value=v=>typeof v==='string'?{stringValue:v}:typeof v==='number'?{integerValue:String(v)}:Array.isArray(v)?{arrayValue:{values:v.map(value)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
 const fields=['id','term','englishTerm','definition','explanation','example','categories','importance','sources','position','revision'];
 const writes=terms.map((term,index)=>{
  const old=existing.get(term.id).fields||{};
  const position=Number(old.position?.integerValue??index);
  const revision=Number(old.revision?.integerValue??0)+1;
  const data={...term,position,revision};
  return {update:{name:`projects/${project}/databases/(default)/documents/terms/${term.id}`,fields:Object.fromEntries(Object.entries(data).map(([key,item])=>[key,value(item)]))},updateMask:{fieldPaths:fields},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:{exists:true}};
 });
 const result=await api(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:commit`,{method:'POST',body:JSON.stringify({writes})});
 console.log(JSON.stringify({updated:result.writeResults.length,mentionFrequencyUpdated:terms.length,commitTime:result.commitTime}));
}else throw new Error('Unknown setup mode.');
