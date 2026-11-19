import {before,after,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-boongeok',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
const value=(id,revision=1)=>({id,term:'권한 테스트',englishTerm:'Test',imageUrl:'',definition:'테스트용 뜻',explanation:'',example:'',categories:['개발'],importance:3,sources:[],position:0,revision,updatedAt:serverTimestamp()});
test('anonymous visitor can read but cannot create or delete',async()=>{
 const db=env.unauthenticatedContext().firestore();
 await assertSucceeds(getDoc(doc(db,'terms','anonymous-probe')));
 await assertFails(setDoc(doc(db,'terms','anonymous-probe'),value('anonymous-probe')));
 await assertFails(deleteDoc(doc(db,'terms','anonymous-probe')));
});
test('different Google account cannot write',async()=>{
 const db=env.authenticatedContext('other-user',{email:'someone@example.com',email_verified:true}).firestore();
 await assertFails(setDoc(doc(db,'terms','other-probe'),value('other-probe')));
});
test('admin email without verified identity cannot write',async()=>{
 const db=env.authenticatedContext('unverified-user',{email:'hijmjo@gmail.com',email_verified:false}).firestore();
 await assertFails(setDoc(doc(db,'terms','unverified-probe'),value('unverified-probe')));
});
test('verified administrator can create, update and delete',async()=>{
 const db=env.authenticatedContext('admin-user',{email:'hijmjo@gmail.com',email_verified:true}).firestore();const ref=doc(db,'terms','admin-probe');
 await assertSucceeds(setDoc(ref,value('admin-probe')));
 await assertSucceeds(setDoc(ref,{...value('admin-probe',2),term:'수정한 용어'}));
 await assertFails(setDoc(ref,{...value('admin-probe',2),term:'오래된 버전'}));
 await assertSucceeds(deleteDoc(ref));
});
test('administrator still cannot save missing definition, invalid category or mismatched ID',async()=>{
 const db=env.authenticatedContext('admin-user',{email:'hijmjo@gmail.com',email_verified:true}).firestore();
 await assertFails(setDoc(doc(db,'terms','invalid-probe'),{...value('invalid-probe'),definition:''}));
 await assertFails(setDoc(doc(db,'terms','invalid-probe'),{...value('invalid-probe'),categories:['other']}));
 await assertFails(setDoc(doc(db,'terms','invalid-importance'),{...value('invalid-importance'),importance:6}));
 await assertFails(setDoc(doc(db,'terms','invalid-image'),{...value('invalid-image'),imageUrl:'javascript:alert(1)'}));
 await assertFails(setDoc(doc(db,'terms','invalid-probe'),value('different-id')));
});
test('verified user can store only their own study state',async()=>{
 const own=env.authenticatedContext('study-user',{email:'learner@example.com',email_verified:true}).firestore();
 const other=env.authenticatedContext('other-user',{email:'other@example.com',email_verified:true}).firestore();
 const ref=doc(own,'users','study-user','study','state');
 await assertSucceeds(setDoc(ref,{state:{version:1,ratings:{card:'known'},completed:{}},updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(ref));
 await assertFails(getDoc(doc(other,'users','study-user','study','state')));
 await assertFails(setDoc(doc(other,'users','study-user','study','state'),{state:{version:1,ratings:{},completed:{}},updatedAt:serverTimestamp()}));
 await assertFails(deleteDoc(ref));
});
test('verified user can create one fixed account deletion request only for themself',async()=>{
 const email='learner@example.com';
 const db=env.authenticatedContext('delete-user',{email,email_verified:true}).firestore();
 const request={requesterEmail:email,to:['hijmjo@gmail.com'],status:'requested',requestedAt:serverTimestamp(),message:{subject:'[붕억빵] 계정 삭제 요청',text:`${email} 사용자가 계정 삭제를 요청했습니다. Firebase Authentication과 해당 사용자의 학습 기록을 확인한 뒤 삭제해주세요.`}};
 await assertSucceeds(setDoc(doc(db,'accountDeletionRequests','delete-user'),request));
 await assertFails(setDoc(doc(db,'accountDeletionRequests','another-user'),request));
 await assertFails(setDoc(doc(db,'accountDeletionRequests','delete-user'),{...request,to:['attacker@example.com']}));
 await assertFails(deleteDoc(doc(db,'accountDeletionRequests','delete-user')));
});
