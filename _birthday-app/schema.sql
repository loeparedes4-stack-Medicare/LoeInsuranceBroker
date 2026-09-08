-- Run once in a new Supabase project (SQL Editor).
create table public.admin_user (singleton boolean primary key default true check(singleton), user_id uuid not null unique references auth.users(id));
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from admin_user where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
alter table public.admin_user enable row level security;
create policy admin_read on public.admin_user for select to authenticated using(public.is_admin());
create table public.business_settings (
 id integer primary key default 1 check(id=1), business_name text not null default 'Mi negocio' check(length(business_name)<=60), owner_name text not null default '' check(length(owner_name)<=60),
 photo_path text, logo_path text, greeting_text text not null default 'Happy Birthday, {{name}}!' check(length(greeting_text)<=80),
 whatsapp_message text not null default 'Happy Birthday, {{name}}! Wishing you an amazing day filled with happiness. Thank you for trusting us.' check(length(whatsapp_message)<=1024),
 timezone text not null default 'America/Phoenix', send_time time not null default '09:00', default_country text not null default 'US',
 template_name text not null default '', template_language text not null default 'en_US', automation_enabled boolean not null default false
);
insert into public.business_settings(id) values(1);
create function public.validate_settings() returns trigger language plpgsql set search_path=public as $$ begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Invalid timezone'; end if;
 return new; end $$;
create trigger validate_settings before insert or update on public.business_settings for each row execute function public.validate_settings();
create table public.clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 60), phone text not null unique check(phone ~ '^\+[1-9][0-9]{6,14}$'),
 birthday date not null check(birthday <= current_date), active boolean not null default true, whatsapp_consent boolean not null default false,
 consent_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_birthday_sent_year integer
);
create function public.touch_client() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger touch_client before update on public.clients for each row execute function public.touch_client();
create table public.birthday_messages (
 id uuid primary key default gen_random_uuid(), client_id uuid references public.clients(id) on delete set null, client_name text not null, phone text not null,
 birthday_year integer not null, status text not null default 'pending' check(status in ('pending','sending','sent','failed','unknown')),
 kind text not null default 'birthday' check(kind in ('birthday','test')), whatsapp_message_id text, image_url text, image_path text,
 error_message text, created_at timestamptz not null default now(), sent_at timestamptz, updated_at timestamptz not null default now()
);
-- Phone reservation survives client deletion/recreation. Tests never consume a birthday.
create unique index birthday_once on public.birthday_messages(phone,birthday_year) where kind='birthday';
create index message_date on public.birthday_messages(created_at desc);
alter table public.business_settings enable row level security;
alter table public.clients enable row level security;
alter table public.birthday_messages enable row level security;
create policy settings_admin on public.business_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy clients_admin on public.clients for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy messages_read on public.birthday_messages for select to authenticated using(public.is_admin());
-- Supabase may install broad default grants; reset them explicitly.
revoke all on public.admin_user,public.business_settings,public.clients,public.birthday_messages from anon,authenticated;
grant all on public.admin_user,public.business_settings,public.clients,public.birthday_messages to service_role;
grant select on public.admin_user,public.birthday_messages to authenticated;
grant select,update on public.business_settings to authenticated;
grant select,delete on public.clients to authenticated;
grant insert(name,phone,birthday,active,whatsapp_consent,consent_note) on public.clients to authenticated;
grant update(name,phone,birthday,active,whatsapp_consent,consent_note) on public.clients to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('brand','brand',false,2097152,array['image/png','image/jpeg']),('birthday-cards','birthday-cards',false,5242880,array['image/png']);
create policy brand_admin on storage.objects for all to authenticated using(bucket_id='brand' and public.is_admin()) with check(bucket_id='brand' and public.is_admin());
create policy cards_read on storage.objects for select to authenticated using(bucket_id='birthday-cards' and public.is_admin());
-- Atomic booking: concurrent cron calls cannot claim the same phone/year.
create function public.claim_birthdays(batch_size integer default 5) returns setof public.birthday_messages language plpgsql security definer set search_path=public as $$
declare s business_settings; local_now timestamp;
begin
 select * into s from business_settings where id=1;
 local_now=now() at time zone s.timezone;
 if not s.automation_enabled or local_now::time<s.send_time then return; end if;
 return query insert into birthday_messages(client_id,client_name,phone,birthday_year)
 select c.id,c.name,c.phone,extract(year from local_now)::int from clients c
 where c.active and c.whatsapp_consent and to_char(c.birthday,'MM-DD')=to_char(local_now,'MM-DD')
 and c.last_birthday_sent_year is distinct from extract(year from local_now)::int
 and not exists(select 1 from birthday_messages m where m.phone=c.phone and m.birthday_year=extract(year from local_now)::int and m.kind='birthday')
 order by c.id limit least(greatest(batch_size,1),5) on conflict do nothing returning *;
end $$;
create function public.finish_message(message_id uuid, meta_id text) returns void language plpgsql security definer set search_path=public as $$
declare m birthday_messages;
begin
 update birthday_messages set status='sent',whatsapp_message_id=meta_id,sent_at=now(),updated_at=now(),error_message=null where id=message_id and status='sending' returning * into m;
 if m.id is null then raise exception 'Message not sending'; end if;
 if m.kind='birthday' then update clients set last_birthday_sent_year=m.birthday_year where id=m.client_id; end if;
end $$;
revoke all on function public.claim_birthdays(integer), public.finish_message(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_birthdays(integer),public.finish_message(uuid,text) to service_role;
