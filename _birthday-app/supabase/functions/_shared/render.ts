import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';
import { cardSvg } from './card.js';
import {wasmBytes,fontBytes} from './runtime-assets.ts';

let ready:Promise<void>;
let template:Promise<string>;

function templateDataUrl(){
 template ??= fetch('https://loeinsurancebroker.com/cumpleanos/birthday-template.jpg').then(async response=>{
  if(!response.ok)throw new Error('No se pudo cargar la plantilla de cumpleaños');
  const bytes=new Uint8Array(await response.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return `data:image/jpeg;base64,${btoa(binary)}`;
 });
 return template;
}

export async function renderCard(settings:any,name:string){
 ready ??= initWasm(wasmBytes());await ready;
 const renderer=new Resvg(cardSvg(settings,name,await templateDataUrl()),{font:{fontBuffers:[await fontBytes()],loadSystemFonts:false,defaultFontFamily:'Inter'}});
 try {return renderer.render().asPng();}finally{renderer.free();}
}
