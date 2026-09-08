-- PIN login attempt budgets are global: changing IP cannot bypass them.
create table if not exists public.pin_login_budget (
 id integer primary key check(id=1), window_started timestamptz not null default now(),
 window_count integer not null default 0, day_started date not null default current_date,
 day_count integer not null default 0
);
insert into public.pin_login_budget(id) values(1) on conflict do nothing;
alter table public.pin_login_budget enable row level security;
revoke all on public.pin_login_budget from public,anon,authenticated;
grant all on public.pin_login_budget to service_role;
create or replace function public.reserve_pin_attempt() returns boolean language plpgsql security definer set search_path=public as $$
declare b pin_login_budget;
begin
 select * into b from pin_login_budget where id=1 for update;
 if b.window_started < now()-interval '15 minutes' then b.window_started=now(); b.window_count=0; end if;
 if b.day_started < current_date then b.day_started=current_date; b.day_count=0; end if;
 if b.window_count>=5 or b.day_count>=20 then return false; end if;
 update pin_login_budget set window_started=b.window_started,window_count=b.window_count+1,day_started=b.day_started,day_count=b.day_count+1 where id=1;
 return true;
end $$;
revoke all on function public.reserve_pin_attempt() from public,anon,authenticated;
grant execute on function public.reserve_pin_attempt() to service_role;
