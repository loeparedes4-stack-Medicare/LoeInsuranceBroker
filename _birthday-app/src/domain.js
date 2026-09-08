import { parsePhoneNumberFromString } from 'libphonenumber-js';
export function phoneE164(value, country = 'US') {
  const phone = parsePhoneNumberFromString(String(value).trim(), country);
  if (!phone?.isValid()) throw new Error('Teléfono inválido: ' + value);
  return phone.number;
}
export function validBirthday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value + 'T12:00:00Z').toISOString().slice(0,10) !== value || value > new Date().toISOString().slice(0,10)) throw new Error('Fecha inválida; usa YYYY-MM-DD');
  return value;
}
export function localDate(now, timeZone) { return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function daysUntil(birthday, today) {
  const base = new Date(today+'T12:00:00Z'); let year=base.getUTCFullYear();
  let next=new Date(`${year}-${birthday.slice(5)}T12:00:00Z`);
  // Leap-day birthdays are observed only on February 29.
  while(next < base || next.toISOString().slice(5,10)!==birthday.slice(5)) next=new Date(`${++year}-${birthday.slice(5)}T12:00:00Z`);
  return Math.round((next-base)/86400000);
}
