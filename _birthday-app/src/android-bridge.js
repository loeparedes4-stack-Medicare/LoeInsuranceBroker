const pending=new Map();
export const inLib=()=>!!window.LibBirthdaysNative?.postMessage;
export function nativeRequest(type,details={}) {
  const bridge=window.LibBirthdaysNative;
  if(!bridge?.postMessage)return Promise.resolve(null);
  bridge.onmessage=event=>{
    try{const reply=JSON.parse(event.data),request=pending.get(reply.requestId);if(!request)return;
      clearTimeout(request.timer);pending.delete(reply.requestId);
      if(reply.error)request.reject(new Error(reply.error));else request.resolve(reply.result);
    }catch{/* Ignore invalid replies. */}
  };
  return new Promise((resolve,reject)=>{
    const requestId=crypto.randomUUID();
    const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('LIB no respondió. Vuelve a abrir Cumpleaños.'));},15000);
    pending.set(requestId,{resolve,reject,timer});
    try{bridge.postMessage(JSON.stringify({type,requestId,...details}));}catch(e){clearTimeout(timer);pending.delete(requestId);reject(e);}
  });
}
export function syncAndroidBirthdays(clients,settings) {
  if(!inLib())return;
  void nativeRequest('sync',{snapshot:{
    clients:clients.map(({id,name,birthday,active})=>({id,name,birthday,active})),
    timezone:settings.timezone||'America/Phoenix',send_time:settings.send_time||'09:00'
  }}).catch(()=>{});
}
export function clearAndroidBirthdays(){if(inLib())void nativeRequest('clear').catch(()=>{});}
export async function shareAndroidCard(blob,text){
  const png=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo preparar la imagen.'));reader.readAsDataURL(blob);});
  return nativeRequest('share',{png,text});
}
