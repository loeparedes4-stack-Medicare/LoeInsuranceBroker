import {phoneE164} from './domain.js';

export function personalMessage(template, name) {
  return String(template || 'Happy Birthday, {{name}}!').replaceAll('{{name}}', name);
}
export function chatUrl(phone, message, country = 'US') {
  return `https://wa.me/${phoneE164(phone, country).slice(1)}?text=${encodeURIComponent(message)}`;
}

// A prepared card is not evidence that the user sent it in WhatsApp.
export function bindManualDialog(d, {client, settings, preview}) {
  const form=d.querySelector('form'), result=d.querySelector('.manual-result');
  let imageUrl;
  const cleanup=()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=undefined;};
  d.addEventListener('close',cleanup,{once:true});
  form.onsubmit=async e=>{
    e.preventDefault();cleanup();result.replaceChildren();
    const button=form.querySelector('button');button.disabled=true;
    const status=d.querySelector('.manual-status');status.textContent='Generando tarjeta…';
    try {
      const name=new FormData(form).get('name').trim();
      if(!name||name.length>60)throw new Error('Escribe un nombre de hasta 60 caracteres.');
      const blob=await preview(name);
      if(!d.open)return;
      imageUrl=URL.createObjectURL(blob);
      const file=new File([blob],`cumpleanos-${name.replace(/[^\p{L}\p{N}]+/gu,'-')}.png`,{type:'image/png'});
      const img=document.createElement('img');img.src=imageUrl;img.alt=`Tarjeta de cumpleaños para ${name}`;img.className='card-preview';result.append(img);
      const label=document.createElement('label');label.textContent='Mensaje para WhatsApp';
      const text=document.createElement('textarea');text.value=personalMessage(settings.whatsapp_message,name);label.append(text);result.append(label);
      const download=document.createElement('a');download.href=imageUrl;download.download=file.name;download.textContent='1. Descargar tarjeta';download.className='button-link';result.append(download);
      const help=document.createElement('p');help.className='help';help.textContent='2. Abre el chat, adjunta la tarjeta descargada y pulsa Enviar en WhatsApp Business. El enlace prepara el texto; no adjunta la imagen automáticamente. Usa WhatsApp Business con el número +1 480 504 9855.';result.append(help);
      const consent=document.createElement('label');consent.className='check';
      const box=document.createElement('input');box.type='checkbox';consent.append(box,document.createTextNode('Tengo autorización para felicitar a esta persona por WhatsApp.'));result.append(consent);
      const actions=document.createElement('div');actions.className='actions';
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar mensaje';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text.value);status.textContent='Mensaje copiado.';}catch{status.textContent='Selecciona el mensaje y cópialo manualmente.';text.focus();text.select();}};actions.append(copy);
      if(client?.phone){
        const open=document.createElement('a');open.className='button-link primary';open.textContent='2. Abrir chat en WhatsApp';open.target='_blank';open.rel='noopener noreferrer';open.setAttribute('aria-disabled','true');
        const update=()=>{if(box.checked){open.href=chatUrl(client.phone,text.value,settings.default_country);open.removeAttribute('aria-disabled');}else{open.removeAttribute('href');open.setAttribute('aria-disabled','true');}};
        box.addEventListener('change',update);text.addEventListener('input',update);actions.append(open);
      }
      if(navigator.canShare?.({files:[file]})){
        const share=document.createElement('button');share.type='button';share.textContent='Compartir tarjeta y mensaje';share.disabled=true;box.addEventListener('change',()=>share.disabled=!box.checked);
        share.onclick=async()=>{try{await navigator.share({files:[file],text:text.value});status.textContent='Comprueba el destinatario y completa el envío en WhatsApp Business.';}catch(e){if(e.name!=='AbortError')status.textContent='Descarga la tarjeta y adjúntala desde WhatsApp Business.';}};actions.append(share);
      }
      result.append(actions);status.textContent='Tarjeta lista. Todavía no se ha enviado ningún mensaje.';
    }catch(e){if(d.open)status.textContent=e.message||'No se pudo generar la tarjeta.';}
    finally{button.disabled=false;}
  };
}
