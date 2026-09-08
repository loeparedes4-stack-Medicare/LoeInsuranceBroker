import {parsePhoneNumberFromString} from 'npm:libphonenumber-js@1.12.24';
import {db,check,json,requireAdmin,cors} from '../_shared/runtime.ts';
import {processMessage} from '../_shared/send.ts';
import {renderCard} from '../_shared/render.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  await requireAdmin(req);const body=await req.json();const settings=check(await db.from('business_settings').select('*').eq('id',1).single());let message;
  if(body.action==='preview'){
   const name=String(body.name||'Michael').trim();if(name.length>60)throw new Error('Nombre demasiado largo');
   const png=await renderCard(settings,name);
   return new Response(png.buffer as ArrayBuffer,{headers:{...cors,'Content-Type':'image/png','Cache-Control':'no-store'}});
  }else if(body.action==='retry'){
   const old=check(await db.from('birthday_messages').select('*').eq('id',body.id).single());
   if(old.kind==='birthday'&&!old.client_id)throw new Error('El cliente fue eliminado');
   message=check(await db.from('birthday_messages').update({status:'pending',error_message:null,updated_at:new Date().toISOString()}).eq('id',body.id).eq('status','failed').select().maybeSingle());
   if(!message)throw new Error('Solo se pueden reintentar fallos confirmados');
  }else if(body.action==='test'||body.action==='simulate'){
   if(!body.consent)throw new Error('Confirma autorización del teléfono de prueba');
   const phone=parsePhoneNumberFromString(String(body.phone),settings.default_country);if(!phone?.isValid())throw new Error('Teléfono de prueba inválido');
   let name=String(body.name||'').trim();let clientId=null;
   if(body.action==='simulate'){const c=check(await db.from('clients').select('*').eq('id',body.client_id).single());if(!c.active||!c.whatsapp_consent)throw new Error('El cliente debe estar activo y autorizado');name=c.name;clientId=c.id;}
   if(!name||name.length>60)throw new Error('Nombre requerido (máximo 60 caracteres)');
   // UUID from the browser is an idempotency key for accidental double submits.
   if(!/^[0-9a-f-]{36}$/i.test(body.request_id||''))throw new Error('ID de prueba inválido');
   const result=await db.from('birthday_messages').insert({id:body.request_id,client_id:null,client_name:name,phone:phone.number,birthday_year:new Date().getUTCFullYear(),kind:'test'}).select().single();
   if(result.error?.code==='23505')return json({message:check(await db.from('birthday_messages').select('*').eq('id',body.request_id).single())});
   message=check(result);
  }else throw new Error('Acción inválida');
  await processMessage(message,settings);return json({message:check(await db.from('birthday_messages').select('*').eq('id',message.id).single())});
 }catch(e){return json({error:e instanceof Error?e.message:'No se pudo completar la acción'},e instanceof Error&&e.message==='Unauthorized'?401:400);}
});
