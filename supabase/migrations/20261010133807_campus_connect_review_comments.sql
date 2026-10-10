create table public.cc_review_comments (
 id uuid primary key default gen_random_uuid(), review_id uuid not null references public.cc_reviews(id) on delete cascade,
 user_id uuid not null references public.cc_profiles(id), author_name text not null default 'Student',
 body text not null check(length(trim(body)) between 2 and 1000), created_at timestamptz not null default now()
);
create index cc_review_comments_review_idx on public.cc_review_comments(review_id,created_at);
create index cc_review_comments_user_idx on public.cc_review_comments(user_id);
alter table public.cc_review_comments enable row level security;
create policy cc_comment_read on public.cc_review_comments for select to anon,authenticated using(exists(select 1 from public.cc_reviews r where r.id=review_id and not r.hidden));
create policy cc_comment_insert on public.cc_review_comments for insert to authenticated with check(user_id=(select auth.uid()) and (select cc_private.is_student()) and exists(select 1 from public.cc_reviews r join public.cc_businesses b on b.id=r.business_id where r.id=review_id and not r.hidden and b.status='approved' and b.owner_id<>(select auth.uid())));
create policy cc_comment_delete on public.cc_review_comments for delete to authenticated using((user_id=(select auth.uid()) and (select cc_private.is_student())) or (select cc_private.is_admin()));
create function cc_private.comment_author() returns trigger language plpgsql security definer set search_path='' as $$begin
 select full_name into new.author_name from public.cc_profiles where id=new.user_id;
 new.created_at=now();return new;end;$$;
revoke all on function cc_private.comment_author() from public,anon,authenticated;
create trigger cc_comment_author before insert on public.cc_review_comments for each row execute function cc_private.comment_author();
revoke all on public.cc_review_comments from public,anon,authenticated;
grant select on public.cc_review_comments to anon,authenticated;
grant insert(review_id,user_id,body),delete on public.cc_review_comments to authenticated;

create table cc_private.registration_limits (key text primary key, started_at timestamptz not null default now(), hits integer not null default 1);
revoke all on cc_private.registration_limits from public,anon,authenticated;
create function cc_private.signup_slot(bucket text) returns boolean language plpgsql security definer set search_path='' as $$declare n integer;begin
 if bucket !~ '^[a-f0-9]{64}$' then raise exception 'Invalid registration bucket';end if;
 insert into cc_private.registration_limits(key) values(bucket) on conflict(key) do update set
 hits=case when cc_private.registration_limits.started_at<now()-interval '1 hour' then 1 else cc_private.registration_limits.hits+1 end,
 started_at=case when cc_private.registration_limits.started_at<now()-interval '1 hour' then now() else cc_private.registration_limits.started_at end returning hits into n;
 return n<=10;end;$$;
revoke all on function cc_private.signup_slot(text) from public,anon,authenticated;
grant usage on schema cc_private to service_role;
grant execute on function cc_private.signup_slot(text) to service_role;
create function public.cc_signup_slot(bucket text) returns boolean language sql security invoker set search_path='' as $$select cc_private.signup_slot(bucket);$$;
revoke all on function public.cc_signup_slot(text) from public,anon,authenticated;
grant execute on function public.cc_signup_slot(text) to service_role;
