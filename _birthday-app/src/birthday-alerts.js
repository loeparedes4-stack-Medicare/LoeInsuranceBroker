import {localDate} from './domain.js';
import {xml} from '../supabase/functions/_shared/card.js';

export function birthdaysToday(clients, now, timezone) {
  const date=localDate(now,timezone);
  return clients.filter(c=>c.active && c.birthday?.slice(5)===date.slice(5));
}
export function alertKey(clients,date){return `${date}:${clients.map(c=>c.id).sort().join(',')}`;}

export function createBirthdayAlerts({getState,prepare,refresh}) {
  let audio, muted=true, sounded='', dismissed='', busy=false, ticks=0, started=false;
  async function tone(){
    if(!audio||audio.state!=='running')return;
    const t=audio.currentTime;
    for(const [offset,freq] of [[0,660],[.22,880]]){
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.frequency.value=freq;gain.gain.setValueAtTime(0,t+offset);
      gain.gain.linearRampToValueAtTime(.12,t+offset+.02);
      gain.gain.exponentialRampToValueAtTime(.001,t+offset+.2);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t+offset);osc.stop(t+offset+.22);
      osc.onended=()=>{osc.disconnect();gain.disconnect();};
    }
  }
  function update(){
    const host=document.querySelector('#birthday-alerts');if(!host)return;
    const {clients,settings}=getState(),timezone=settings.timezone||'America/Phoenix',now=new Date();
    const due=birthdaysToday(clients,now,timezone),key=alertKey(due,localDate(now,timezone));
    host.innerHTML=`<div class="birthday-reminder"><div class="row"><strong>${due.length?`🎂 ${due.length===1?'Hoy cumple años':'Hoy cumplen años'}: ${due.map(c=>xml(c.name)).join(', ')}`:'Hoy no hay cumpleaños activos.'}</strong><button id="birthday-sound">${muted?'Activar sonido de avisos':'Silenciar avisos'}</button></div><p class="help">Avisos mientras el panel está abierto. El sonido requiere activarlo en esta sesión y puede pausarse si el teléfono suspende el navegador.</p>${due.length&&dismissed!==key?`<div class="actions" role="status">${due.map(c=>`<button class="primary" data-birthday-prepare="${xml(c.id)}">Preparar: ${xml(c.name)}</button>`).join('')}<button id="birthday-dismiss">Ocultar aviso de hoy</button></div>`:''}</div>`;
    host.querySelector('#birthday-sound').onclick=async()=>{
      if(!muted){muted=true;update();return;}
      try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error();audio??=new Audio();await audio.resume();if(audio.state!=='running')throw new Error();muted=false;sounded=key;await tone();update();}
      catch{host.querySelector('.help').textContent='El navegador no pudo activar el sonido. El aviso visual sigue disponible.';}
    };
    host.querySelector('#birthday-dismiss')?.addEventListener('click',()=>{dismissed=key;update();});
    host.querySelectorAll('[data-birthday-prepare]').forEach(b=>b.onclick=()=>{const c=getState().clients.find(c=>c.id===b.dataset.birthdayPrepare);if(c)prepare(c);});
    if(due.length&&dismissed!==key&&!muted&&sounded!==key&&audio?.state==='running'){sounded=key;void tone();}
  }
  async function tick(){
    if(!started||busy)return;busy=true;
    try{if(++ticks%5===0)await refresh();update();}catch{/* Keep the last known reminder when offline. */}finally{busy=false;}
  }
  setInterval(tick,60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&started){ticks=4;void tick();}});
  return {update(){started=true;update();},stop(){started=false;muted=true;dismissed='';sounded='';if(audio){void audio.close();audio=undefined;}}};
}
