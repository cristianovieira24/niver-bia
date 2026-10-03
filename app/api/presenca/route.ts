import { env } from 'cloudflare:workers';
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
  if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido.'},{status:415});
  const raw=await request.text();if(raw.length>8192)return Response.json({error:'Dados muito longos.'},{status:413});
  let data;try{data=JSON.parse(raw)}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
  if(!data||typeof data!=='object')return Response.json({error:'Dados inválidos.'},{status:400});
  const submitted=Array.isArray(data.names)?data.names:typeof data.name==='string'?[data.name]:null;
  if(!submitted||submitted.length<1||submitted.length>20)return Response.json({error:'Informe de 1 a 20 pessoas.'},{status:400});
  if(data.count!==undefined&&data.count!==submitted.length)return Response.json({error:'Preencha o nome de todas as pessoas.'},{status:400});
  const names=submitted.map((name:unknown)=>typeof name==='string'?name.trim().replace(/\s+/g,' '):'');
  if(names.some((name:string)=>name.length<2||name.length>80||/[\u0000-\u001f<>]/.test(name)))return Response.json({error:'Preencha cada nome com 2 a 80 caracteres.'},{status:400});
  if(typeof data.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.requestId))return Response.json({error:'Abra o formulário novamente.'},{status:400});
  const database=env.DB;if(!database)throw new Error('DB unavailable');
  const created=new Date().toISOString();
  const statements=names.map((name:string,index:number)=>database.prepare('INSERT INTO attendance (id, name, event_date, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING').bind(index===0?data.requestId:`${data.requestId}:${index}`,name,'2026-12-19T14:00:00-03:00',created));
  await database.batch(statements);
  return Response.json({ok:true,count:names.length},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Attendance save failed',error);return Response.json({error:'Não foi possível confirmar agora. Os nomes continuam aqui; tente novamente.'},{status:503});}
}
