import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {db,check,required,cors,json} from '../_shared/runtime.ts';

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Método no permitido'},405);
 try {
  const origin=req.headers.get('origin');
  if(origin && origin!==required('ALLOWED_ORIGIN'))return json({error:'Origen no permitido'},403);
  if(Number(req.headers.get('content-length')||0)>256)return json({error:'Solicitud inválida'},400);
  const text=await req.text();if(text.length>256)return json({error:'Solicitud inválida'},400);
  const {pin}=JSON.parse(text);
  if(typeof pin!=='string'||!/^\d{4}$/.test(pin))return json({error:'Introduce los cuatro dígitos'},400);
  if(!check(await db.rpc('reserve_pin_attempt')))return json({error:'Demasiados intentos. Espera 15 minutos; el límite diario es de 20 intentos.'},429);
  const input=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(required('PANEL_PIN_SALT')+':'+pin)));
  const expected=required('PANEL_PIN_HASH');let difference=0;
  const actual=Array.from(input,b=>b.toString(16).padStart(2,'0')).join('');
  for(let i=0;i<64;i++)difference|=actual.charCodeAt(i)^(expected.charCodeAt(i)||0);
  if(difference!==0||expected.length!==64)return json({error:'Código incorrecto'},401);
  const admin=check(await db.from('admin_user').select('user_id').single());
  if(!admin)throw new Error('Administrador no configurado');
  const {data:account,error:accountError}=await db.auth.admin.getUserById(admin.user_id);
  if(accountError)throw accountError;
  if(!account.user?.email)throw new Error('Administrador no configurado');
  // generateLink creates a one-time token but sends no email.
  const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email:account.user.email});
  if(linkError)throw linkError;
  const token=link.properties?.hashed_token;if(!token)throw new Error('No se pudo iniciar sesión');
  const auth=createClient(required('SUPABASE_URL'),required('SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const verified=check(await auth.auth.verifyOtp({token_hash:token,type:'magiclink'}));
  if(!verified.session||verified.user?.id!==admin.user_id)throw new Error('Sesión inválida');
  return new Response(JSON.stringify({access_token:verified.session.access_token,refresh_token:verified.session.refresh_token}),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch {return json({error:'No se pudo iniciar sesión. Intenta más tarde.'},500);}
});
