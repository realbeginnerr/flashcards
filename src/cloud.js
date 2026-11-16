import { firebaseConfig,adminEmail } from '../config.js';
import { normalizeCatalog,normalizeTerm } from './core.js';
export const configured=Boolean(firebaseConfig?.apiKey&&firebaseConfig?.projectId&&firebaseConfig?.authDomain);
let cloudPromise;
export function cloud(){
 if(!configured)throw new Error('관리자 연결을 준비 중이에요. 학습 기능은 바로 이용할 수 있어요.');
 return cloudPromise??=(async()=>{
  const [app,authSDK,fs]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js')]);
  const instance=app.initializeApp(firebaseConfig);const auth=authSDK.getAuth(instance);auth.languageCode='ko';
  return {auth,authSDK,db:fs.getFirestore(instance),fs};
 })().catch(err=>{cloudPromise=null;throw err;});
}
export async function loadCatalog(){
 if(!configured){const response=await fetch(new URL('../terms.json',import.meta.url));if(!response.ok)throw new Error('용어를 불러오지 못했어요.');return normalizeCatalog(await response.json());}
 const {db,fs}=await cloud();const snap=await fs.getDocs(fs.collection(db,'terms'));
 const raw=snap.docs.map(doc=>({...doc.data(),id:doc.id})).sort((a,b)=>(a.position??1e9)-(b.position??1e9)||a.term.localeCompare(b.term,'ko'));
 const terms=normalizeCatalog(raw);return terms.map((t,i)=>({...t,revision:raw[i].revision??0,position:raw[i].position??1e9}));
}
export async function currentAdmin(){
 const c=await cloud();await c.auth.authStateReady();
 const u=c.auth.currentUser;
 return u&&u.emailVerified&&u.email?.toLowerCase()===adminEmail.toLowerCase()?u:null;
}
export async function login(){
 const {auth,authSDK}=await cloud();const provider=new authSDK.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 await authSDK.signInWithPopup(auth,provider);
 if(!await currentAdmin()){await authSDK.signOut(auth);throw new Error('이 계정에는 관리 권한이 없어요. 관리자 계정으로 다시 로그인해주세요.');}
}
export async function logout(){const {auth,authSDK}=await cloud();await authSDK.signOut(auth);}
export async function writeTerm(value,previous){
 if(!await currentAdmin())throw new Error('로그인 상태를 확인해주세요. 작성한 내용은 그대로 유지됩니다.');
 const clean=normalizeTerm(value);const {db,fs}=await cloud();const ref=fs.doc(db,'terms',clean.id);
 await fs.runTransaction(db,async tx=>{
  const doc=await tx.get(ref);
  if(previous&&(!doc.exists()||(doc.data().revision??0)!==previous.revision))throw new Error('다른 화면에서 수정되었거나 삭제된 용어예요. 입력 내용을 복사해 둔 뒤 최신 목록을 다시 확인해주세요.');
  if(!previous&&doc.exists())throw new Error('이미 존재하는 용어 ID예요. 다시 시도해주세요.');
  const revision=(previous?.revision??0)+1;
  tx.set(ref,{...clean,revision,position:previous?.position??Date.now(),updatedAt:fs.serverTimestamp()});
 });
}
export async function deleteTerm(previous){
 if(!await currentAdmin())throw new Error('관리자 로그인이 필요해요.');
 const {db,fs}=await cloud();const ref=fs.doc(db,'terms',previous.id);
 await fs.runTransaction(db,async tx=>{
  const doc=await tx.get(ref);
  if(!doc.exists()||(doc.data().revision??0)!==previous.revision)throw new Error('용어가 변경되었어요. 최신 목록을 확인한 뒤 다시 시도해주세요.');
  tx.delete(ref);
 });
}
export async function seedCatalog(){
 if(!await currentAdmin())throw new Error('관리자 로그인이 필요해요.');
 const response=await fetch(new URL('../terms.json',import.meta.url));if(!response.ok)throw new Error('초기 데이터를 읽지 못했어요.');
 const terms=normalizeCatalog(await response.json());const {db,fs}=await cloud();
 await fs.runTransaction(db,async tx=>{
  const refs=terms.map(t=>fs.doc(db,'terms',t.id));const snaps=await Promise.all(refs.map(ref=>tx.get(ref)));
  if(snaps.some(doc=>doc.exists()))throw new Error('이미 등록된 용어가 있어 초기 등록을 중단했어요. 기존 데이터를 변경하지 않았습니다.');
  terms.forEach((term,i)=>tx.set(refs[i],{...term,position:i,revision:1,updatedAt:fs.serverTimestamp()}));
 });
}
