import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
export const db = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
export function required(name:string){const value=Deno.env.get(name);if(!value)throw new Error('Falta secreto '+name);return value;}
export function check<T>(result:{data:T,error:unknown}):T{if(result.error)throw result.error;return result.data;}
export const cors={'Access-Control-Allow-Origin':Deno.env.get('ALLOWED_ORIGIN') || 'http://127.0.0.1:5173','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
export function json(data:unknown,status=200){return Response.json(data,{status,headers:cors});}
export async function requireAdmin(req:Request){const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)throw new Error('Unauthorized');const {data,error}=await db.auth.getUser(token);if(error||!data.user)throw new Error('Unauthorized');const row=check(await db.from('admin_user').select('user_id').eq('user_id',data.user.id).maybeSingle());if(!row)throw new Error('Unauthorized');}
