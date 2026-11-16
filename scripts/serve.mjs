import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const preview=process.argv.includes('--preview');
if(preview) await import('./build.mjs');
const root=resolve('dist');
if(!preview) await import('./build.mjs');
const port=preview?4174:5174;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');}catch{if(!extname(pathname))file=resolve(root,'index.html');}
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(data);
 }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('페이지를 찾을 수 없습니다.');}
}).listen(port,'127.0.0.1',()=>console.log(`붕억빵: http://localhost:${port}/`)).on('error',err=>{console.error(err.code==='EADDRINUSE'?`${port} 포트가 사용 중입니다. 다른 포트로 변경하지 않았습니다.`:err);process.exitCode=1;});
