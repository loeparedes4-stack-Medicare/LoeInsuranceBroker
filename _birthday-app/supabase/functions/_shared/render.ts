import { Resvg, initWasm } from 'npm:@resvg/resvg-wasm@2.6.2';
import { cardSvg } from './card.js';
import { db,check } from './runtime.ts';
import {wasmBytes,fontBytes} from './runtime-assets.ts';
let ready:Promise<void>;
async function brand(path:string){
 const blob=check(await db.storage.from('brand').download(path));if(!blob)throw new Error('Imagen no encontrada');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 // Some existing brand files have a JPEG extension but contain PNG bytes.
 const mime=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':bytes[0]===255&&bytes[1]===216?'image/jpeg':blob.type;
 let binary='';for(const b of bytes)binary+=String.fromCharCode(b);return `data:${mime};base64,${btoa(binary)}`;
}
export async function renderCard(settings:any,name:string){
 ready ??= initWasm(wasmBytes());await ready;
 if(!settings.photo_path || !settings.logo_path)throw new Error('Configura la foto del propietario y el logo');
 const [photo,logo,font]=await Promise.all([brand(settings.photo_path),brand(settings.logo_path),fontBytes()]);
 const renderer=new Resvg(cardSvg(settings,name,photo,logo),{font:{fontBuffers:[font],loadSystemFonts:false,defaultFontFamily:'Inter'}});
 try {return renderer.render().asPng();}finally{renderer.free();}
}
