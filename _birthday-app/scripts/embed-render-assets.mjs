import fs from 'node:fs';
const root='supabase/functions/_shared/';
const wasm=fs.readFileSync(root+'assets/index_bg.wasm').toString('base64');
const font=fs.readFileSync(root+'assets/Inter.ttf').toString('base64');
fs.writeFileSync(root+'runtime-assets.ts', '// Generated from the pinned resvg WASM and OFL-licensed Inter font.\nconst decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));\nexport const wasmBytes=()=>decode('+JSON.stringify(wasm)+');\nexport const fontBytes=()=>decode('+JSON.stringify(font)+');\n');
console.log('Renderer assets embedded for server-side deployment.');
