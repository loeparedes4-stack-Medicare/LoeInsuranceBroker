// Tests the actual Deno renderer and Storage download adapter; no network or Meta calls.
Deno.test('Deno renderer embeds downloaded owner photo and logo in real PNG',async()=>{
 Deno.env.set('SUPABASE_URL','https://test.supabase.co');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-service-key');
 const fixture=await Deno.readFile('tests/output/card-preview.png');
 const actualFetch=globalThis.fetch;let downloaded=0;
 globalThis.fetch=async (input)=>{const url=String(input instanceof Request?input.url:input);if(!url.includes('/storage/v1/object/brand/'))throw new Error('Unexpected network '+url);downloaded++;return new Response(fixture.buffer as ArrayBuffer,{headers:{'Content-Type':'image/png'}});};
 try {
  const {renderCard}=await import('../supabase/functions/_shared/render.ts');
  const png=await renderCard({photo_path:'owner.png',logo_path:'logo.png',business_name:'Example',owner_name:'Alex',greeting_text:'Happy Birthday, {{name}}!'},'María & José');
  if(downloaded!==2)throw new Error('Expected photo and logo downloads');
  const view=new DataView(png.buffer,png.byteOffset,png.byteLength);
  if(view.getUint32(16)!==1080||view.getUint32(20)!==1080)throw new Error('Invalid PNG dimensions');
 } finally {globalThis.fetch=actualFetch;}
});
