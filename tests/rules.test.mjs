import {before,after,test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-boongeok',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await env?.cleanup();});
const value=(id,revision=1)=>({id,term:'권한 테스트',englishTerm:'Test',definition:'테스트용 뜻',explanation:'',example:'',categories:['개발'],sources:[],position:0,revision,updatedAt:serverTimestamp()});
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
 await assertFails(setDoc(doc(db,'terms','invalid-probe'),value('different-id')));
});
