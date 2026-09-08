import { db,check,json,required } from '../_shared/runtime.ts';
import { processMessage } from '../_shared/send.ts';
Deno.serve(async req=>{
 try{
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(req.headers.get('x-cron-secret')!==required('CRON_SECRET'))return json({error:'Unauthorized'},401);
  // Never reclaim a send whose provider outcome may be ambiguous.
  check(await db.from('birthday_messages').update({status:'unknown',error_message:'Ejecución interrumpida; revisar en Meta antes de cualquier reenvío'}).eq('status','sending').lt('updated_at',new Date(Date.now()-10*60000).toISOString()));
  const settings=check(await db.from('business_settings').select('*').eq('id',1).single());
  check(await db.rpc('claim_birthdays',{batch_size:5}));
  const pending=check(await db.from('birthday_messages').select('*').eq('status','pending').order('created_at').limit(5)) || [];
  if(settings.automation_enabled)for(const message of pending)await processMessage(message,settings);
  // Remove expired images through the Storage API, never by deleting storage.objects.
  const expired=check(await db.from('birthday_messages').select('id,image_path').not('image_path','is',null).lt('created_at',new Date(Date.now()-8*86400000).toISOString()).limit(30)) || [];
  if(expired.length){check(await db.storage.from('birthday-cards').remove(expired.map(m=>m.image_path)));check(await db.from('birthday_messages').update({image_path:null,image_url:null}).in('id',expired.map(m=>m.id)));}
  return json({processed:pending.length});
 }catch(e){console.error(e);return json({error:'Error en cron. Consulta los logs del backend.'},500);}
});
