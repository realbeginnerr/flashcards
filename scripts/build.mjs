import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('src','dist/src',{recursive:true});
const data=JSON.parse(await readFile('public/terms.json','utf8'));
if(!Array.isArray(data)||!data.length)throw new Error('초기 용어 데이터가 없습니다.');
console.log(`Build complete: ${data.length} cards`);
