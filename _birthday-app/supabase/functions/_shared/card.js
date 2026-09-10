export const xml = value => String(value ?? '').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));

function nameLines(value) {
 const clean=String(value||'').trim().replace(/!+$/,''),words=(clean+'!').split(/\s+/).filter(Boolean),lines=[];
 for(const word of words){const current=lines.at(-1)||'';if(!current||current.length+1+word.length>15)lines.push(word);else lines[lines.length-1]=current+' '+word;}
 if(lines.length>3)lines.splice(2,lines.length-2,lines.slice(2).join(' '));
 return lines.length?lines:[''];
}

export function cardSvg(_settings, name, template='') {
 const lines=nameLines(name),longest=Math.max(1,...lines.map(line=>line.length));
 const size=Math.max(44,Math.min(lines.length===1?112:lines.length===2?82:60,Math.floor(900/longest)));
 const gap=Math.round(size*1.02),startY=705-Math.round((lines.length-1)*gap/2);
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1287" viewBox="0 0 1149 1369"><rect width="1149" height="1369" fill="#f6ead7"/>${template?`<image x="0" y="0" width="1149" height="1369" preserveAspectRatio="none" xlink:href="${xml(template)}"/>`:''}<g font-family="Inter" font-weight="700" text-anchor="middle" fill="#102746">${lines.map((line,index)=>`<text x="330" y="${startY+index*gap}" font-size="${size}" letter-spacing="-1">${xml(line)}</text>`).join('')}</g></svg>`;
}
