export function createProcessor({db,check,required,renderCard,fetch}) { return async function processMessage(message,settings){
 let posting=false,metaId=null;
 try{
  const claimed=check(await db.from('birthday_messages').update({status:'sending',updated_at:new Date().toISOString()}).eq('id',message.id).eq('status','pending').select().maybeSingle());if(!claimed)return;
  if(message.kind==='birthday'&&!message.client_id)throw new Error('El cliente fue eliminado');
  if(message.client_id){
   const client=check(await db.from('clients').select('*').eq('id',message.client_id).single());
   if(!client.active||!client.whatsapp_consent||client.phone!==message.phone)throw new Error('Cliente inactivo, sin consentimiento o teléfono modificado');
   if(message.kind==='birthday'){
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    if(!settings.automation_enabled||client.birthday.slice(5)!==date.slice(5)||message.birthday_year!==Number(date.slice(0,4)))throw new Error('El cumpleaños ya no corresponde a hoy o la automatización está pausada');
   }
  }
  if(!settings.template_name)throw new Error('Configura la plantilla aprobada');
  const token=required('WHATSAPP_ACCESS_TOKEN'),phoneId=required('WHATSAPP_PHONE_NUMBER_ID'),version=required('META_GRAPH_VERSION');
  if(!/^v\d+\.\d+$/.test(version))throw new Error('Versión Graph inválida');
  const png=await renderCard(settings,message.client_name);const path=`${message.id}.png`;
  check(await db.storage.from('birthday-cards').upload(path,png,{contentType:'image/png',upsert:true}));
  const signed=check(await db.storage.from('birthday-cards').createSignedUrl(path,7*86400));if(!signed)throw new Error('No se pudo firmar la imagen');
  check(await db.from('birthday_messages').update({image_path:path,image_url:signed.signedUrl}).eq('id',message.id));
  const payload={messaging_product:'whatsapp',to:message.phone.replace('+',''),type:'template',template:{name:settings.template_name,language:{code:settings.template_language},components:[{type:'header',parameters:[{type:'image',image:{link:signed.signedUrl}}]},{type:'body',parameters:[{type:'text',text:message.client_name}]}]}};
  posting=true;
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
  const result=await response.json();
  if(!response.ok){if(response.status<500)posting=false;throw new Error(`Meta ${response.status}: ${result.error?.message || 'Error de envío'}`);}
  if(!result.messages?.[0]?.id)throw new Error('Meta no devolvió ID; revisar antes de reenviar');
  metaId=result.messages[0].id;
  check(await db.rpc('finish_message',{message_id:message.id,meta_id:metaId}));
 }catch(error){
  const messageText=error instanceof Error?error.message:JSON.stringify(error);
  check(await db.from('birthday_messages').update({status:posting?'unknown':'failed',whatsapp_message_id:metaId,error_message:messageText.slice(0,1500),updated_at:new Date().toISOString()}).eq('id',message.id).eq('status','sending'));
 }
}

}
