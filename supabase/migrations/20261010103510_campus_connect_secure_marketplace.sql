-- Campus Connect is isolated from the existing StudyBud tables.
create schema if not exists cc_private;
revoke all on schema cc_private from public;
grant usage on schema cc_private to anon, authenticated;

create table public.cc_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default 'Student' check (length(full_name) between 1 and 80),
 role text not null default 'student' check (role in ('student','vendor','admin')),
 blocked boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.cc_profiles enable row level security;
-- Read-only policy helpers live outside the exposed API schema. They need definer
-- rights to avoid recursive profile policies; identity always comes from auth.uid().
create function cc_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.cc_profiles where id=(select auth.uid()) and role='admin' and not blocked);
$$;
create function cc_private.is_member() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.cc_profiles where id=(select auth.uid()) and not blocked);
$$;
revoke all on function cc_private.is_admin(),cc_private.is_member() from public;
grant execute on function cc_private.is_admin(),cc_private.is_member() to anon,authenticated;
create policy cc_profiles_read on public.cc_profiles for select to authenticated using (id=(select auth.uid()) or cc_private.is_admin());
create policy cc_profiles_update on public.cc_profiles for update to authenticated using (id=(select auth.uid()) and cc_private.is_member()) with check (id=(select auth.uid()) and cc_private.is_member());
grant select on public.cc_profiles to authenticated;
grant update(full_name) on public.cc_profiles to authenticated;

create function cc_private.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.cc_profiles(id,full_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Student'),80));
 return new;
end; $$;
revoke all on function cc_private.new_profile() from public,anon,authenticated;
create trigger cc_new_account after insert on auth.users for each row execute function cc_private.new_profile();
insert into public.cc_profiles(id,full_name) select id,left(coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),'Student'),80) from auth.users on conflict(id) do nothing;

create table public.cc_businesses (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references public.cc_profiles(id),
 slug text unique not null default gen_random_uuid()::text,
 name text not null check(length(trim(name)) between 2 and 60),
 category text not null check(category in ('Food & drinks','Design & tech','Fashion & beauty','Learning','Everyday services','Digital platforms')),
 description text not null check(length(trim(description)) between 10 and 1000),
 phone text not null check(phone ~ '^[0-9]{10,15}$'),
 location text not null check(length(trim(location)) between 2 and 120), hours text not null default 'Contact seller for hours' check(length(hours)<=80),
 status text not null default 'pending' check(status in ('pending','approved','rejected','needs_information','suspended')),
 submitted_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cc_applications (
 business_id uuid primary key references public.cc_businesses(id) on delete cascade,
 evidence_paths text[] not null default '{}', logo_path text,
 updated_at timestamptz not null default now()
);
create table public.cc_products (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.cc_businesses(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 80), description text not null check(length(trim(description)) between 10 and 2000),
 category text not null check(category in ('Food & drinks','Design & tech','Fashion & beauty','Learning','Everyday services','Digital platforms')),
 price numeric(12,2) not null check(price>=0 and price<=10000000), available boolean not null default true, active boolean not null default true,
 image_paths text[] not null default '{}' check(cardinality(image_paths)<=6), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.cc_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.cc_profiles(id) on delete cascade,
 product_id uuid references public.cc_products(id) on delete cascade, business_id uuid not null references public.cc_businesses(id) on delete cascade,
 rating integer not null check(rating between 1 and 5), body text not null check(length(trim(body)) between 10 and 1500),
 hidden boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index cc_one_product_review on public.cc_reviews(user_id,product_id) where product_id is not null;
create unique index cc_one_business_review on public.cc_reviews(user_id,business_id) where product_id is null;
create table public.cc_saved (user_id uuid references public.cc_profiles(id) on delete cascade,product_id uuid references public.cc_products(id) on delete cascade,primary key(user_id,product_id));
create table public.cc_audit_log (id uuid primary key default gen_random_uuid(),actor_id uuid references public.cc_profiles(id),business_id uuid references public.cc_businesses(id) on delete set null,action text not null,note text not null default '',created_at timestamptz not null default now());
create table public.cc_cleanup (id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.cc_profiles(id),paths text[] not null,created_at timestamptz not null default now());
create index cc_business_status on public.cc_businesses(status);
create index cc_product_business on public.cc_products(business_id);
create index cc_review_product on public.cc_reviews(product_id);
create index cc_review_business on public.cc_reviews(business_id);
create index cc_review_user on public.cc_reviews(user_id);
create index cc_audit_business on public.cc_audit_log(business_id);
create index cc_saved_product on public.cc_saved(product_id);
create index cc_cleanup_owner on public.cc_cleanup(owner_id);

alter table public.cc_businesses enable row level security;
alter table public.cc_applications enable row level security;
alter table public.cc_products enable row level security;
alter table public.cc_reviews enable row level security;
alter table public.cc_saved enable row level security;
alter table public.cc_audit_log enable row level security;
alter table public.cc_cleanup enable row level security;

create policy cc_business_read on public.cc_businesses for select to anon,authenticated using(status='approved' or (owner_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin());
create policy cc_business_insert on public.cc_businesses for insert to authenticated with check(owner_id=(select auth.uid()) and status='pending' and cc_private.is_member());
create policy cc_business_update on public.cc_businesses for update to authenticated using((owner_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin()) with check((owner_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin());
create policy cc_application_read on public.cc_applications for select to authenticated using(cc_private.is_admin() or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and cc_private.is_member()));
create policy cc_application_insert on public.cc_applications for insert to authenticated with check(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='pending' and cc_private.is_member()));
create policy cc_application_update on public.cc_applications for update to authenticated using(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status in ('pending','rejected','needs_information') and cc_private.is_member())) with check(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status in ('pending','rejected','needs_information') and cc_private.is_member()));
create policy cc_product_read on public.cc_products for select to anon,authenticated using((active and exists(select 1 from public.cc_businesses b where b.id=business_id and b.status='approved')) or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin());
create policy cc_product_insert on public.cc_products for insert to authenticated with check(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved' and cc_private.is_member()));
create policy cc_product_update on public.cc_products for update to authenticated using(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved' and cc_private.is_member()) or cc_private.is_admin()) with check(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved' and cc_private.is_member()) or cc_private.is_admin());
create policy cc_product_delete on public.cc_products for delete to authenticated using(exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved' and cc_private.is_member()) or cc_private.is_admin());
create policy cc_review_read on public.cc_reviews for select to anon,authenticated using((not hidden and exists(select 1 from public.cc_businesses b where b.id=business_id and b.status='approved') and (product_id is null or exists(select 1 from public.cc_products p where p.id=product_id and p.active))) or (user_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin());
create policy cc_review_insert on public.cc_reviews for insert to authenticated with check(user_id=(select auth.uid()) and not hidden and cc_private.is_member() and exists(select 1 from public.cc_businesses b where b.id=business_id and b.status='approved' and b.owner_id<>(select auth.uid())) and (product_id is null or exists(select 1 from public.cc_products p where p.id=product_id and p.business_id=cc_reviews.business_id and p.active)));
create policy cc_review_update on public.cc_reviews for update to authenticated using((user_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin()) with check((user_id=(select auth.uid()) and cc_private.is_member()) or cc_private.is_admin());
create policy cc_review_delete on public.cc_reviews for delete to authenticated using(user_id=(select auth.uid()) and cc_private.is_member());
create policy cc_saved_all on public.cc_saved for all to authenticated using(user_id=(select auth.uid()) and cc_private.is_member()) with check(user_id=(select auth.uid()) and cc_private.is_member());
create policy cc_audit_read on public.cc_audit_log for select to authenticated using(cc_private.is_admin() or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and cc_private.is_member()));
create policy cc_cleanup_read on public.cc_cleanup for select to authenticated using(owner_id=(select auth.uid()) or cc_private.is_admin());
create policy cc_cleanup_delete on public.cc_cleanup for delete to authenticated using(owner_id=(select auth.uid()) or cc_private.is_admin());
grant select on public.cc_businesses,public.cc_products,public.cc_reviews to anon,authenticated;
grant select on public.cc_applications,public.cc_saved,public.cc_audit_log,public.cc_cleanup to authenticated;
grant insert,update on public.cc_businesses,public.cc_applications to authenticated;
grant insert,update,delete on public.cc_products,public.cc_reviews,public.cc_saved to authenticated;
grant delete on public.cc_cleanup to authenticated;

create function cc_private.guard_business() returns trigger language plpgsql security definer set search_path='' as $$
declare admin boolean:=cc_private.is_admin();
begin
 if tg_op='INSERT' then
  if new.owner_id is distinct from auth.uid() or new.status<>'pending' then raise exception 'Invalid business application' using errcode='42501'; end if;
 else
  if new.id<>old.id or new.owner_id<>old.owner_id or new.slug<>old.slug then raise exception 'Business identity is immutable' using errcode='42501'; end if;
  if new.status<>old.status then
   if admin then
    if not ((old.status='pending' and new.status in ('approved','rejected','needs_information')) or (old.status='approved' and new.status='suspended') or (old.status='suspended' and new.status='approved')) then raise exception 'Invalid review transition'; end if;
    if new.status<>'approved' and coalesce(current_setting('cc.review_note',true),'')='' then raise exception 'Review reason required'; end if;
   elsif not (old.owner_id=auth.uid() and old.status in ('rejected','needs_information') and new.status='pending') then raise exception 'Only an administrator can approve or suspend businesses' using errcode='42501'; end if;
  elsif not admin and old.status<>'approved' then raise exception 'Revise and resubmit a reviewed application'; end if;
 end if;
 new.updated_at=now();return new;
end; $$;
create trigger cc_business_guard before insert or update on public.cc_businesses for each row execute function cc_private.guard_business();
create function cc_private.audit_business() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status<>old.status then
  insert into public.cc_audit_log(actor_id,business_id,action,note) values(auth.uid(),new.id,new.status,coalesce(current_setting('cc.review_note',true),''));
  if new.status='approved' then update public.cc_profiles set role='vendor' where id=new.owner_id and role='student'; end if;
 end if;return new;
end; $$;
create trigger cc_business_audit after update on public.cc_businesses for each row execute function cc_private.audit_business();
create function public.cc_review_business(business uuid,decision text,reason text) returns void language plpgsql security invoker set search_path='' as $$
begin
 if not cc_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if length(reason)>1000 then raise exception 'Reason too long'; end if;
 perform set_config('cc.review_note',trim(reason),true);
 update public.cc_businesses set status=decision where id=business;
 if not found then raise exception 'Business not found'; end if;
end; $$;
create function public.cc_manage_user(target uuid,new_role text,is_blocked boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not cc_private.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if target=auth.uid() or exists(select 1 from public.cc_profiles where id=target and role='admin') then raise exception 'Admin accounts are managed through trusted SQL only'; end if;
 if new_role not in ('student','vendor') then raise exception 'Invalid role'; end if;
 if new_role='vendor' and not exists(select 1 from public.cc_businesses where owner_id=target and status='approved') then raise exception 'Vendor requires an approved business'; end if;
 update public.cc_profiles set role=new_role,blocked=is_blocked where id=target;
 insert into public.cc_audit_log(actor_id,action,note) values(auth.uid(),'user_updated',target::text||': '||new_role||', blocked='||is_blocked::text);
end; $$;
revoke all on function public.cc_review_business(uuid,text,text),public.cc_manage_user(uuid,text,boolean) from public,anon;
grant execute on function public.cc_review_business(uuid,text,text),public.cc_manage_user(uuid,text,boolean) to authenticated;

create function cc_private.guard_product() returns trigger language plpgsql set search_path='' as $$
declare path text;
begin
 if tg_op='UPDATE' and (new.id<>old.id or new.business_id<>old.business_id) then raise exception 'Product ownership is immutable' using errcode='42501'; end if;
 foreach path in array new.image_paths loop
  if path not like (select b.owner_id::text||'/'||new.id::text||'/%' from public.cc_businesses b where b.id=new.business_id) or not exists(select 1 from storage.objects o where o.bucket_id='cc-products' and o.name=path) then raise exception 'Invalid product image path'; end if;
 end loop;
 new.updated_at=now();return new;
end; $$;
create trigger cc_product_guard before insert or update on public.cc_products for each row execute function cc_private.guard_product();
create function cc_private.guard_review() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.business_id<>old.business_id or new.product_id is distinct from old.product_id then raise exception 'Review identity is immutable' using errcode='42501'; end if;
  if cc_private.is_admin() and auth.uid()<>old.user_id then
   if new.rating<>old.rating or new.body<>old.body then raise exception 'Admins may moderate visibility only'; end if;
  elsif new.hidden<>old.hidden then raise exception 'Only admins can moderate reviews' using errcode='42501'; end if;
 end if;
 new.updated_at=now();return new;
end; $$;
create trigger cc_review_guard before update on public.cc_reviews for each row execute function cc_private.guard_review();
create function cc_private.review_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.hidden<>old.hidden then insert into public.cc_audit_log(actor_id,business_id,action,note) values(auth.uid(),new.business_id,'review_moderated',new.id::text||': hidden='||new.hidden::text); end if;return new;
end; $$;
create trigger cc_review_audit after update on public.cc_reviews for each row execute function cc_private.review_audit();
create function cc_private.cleanup_images() returns trigger language plpgsql security definer set search_path='' as $$
declare removed text[];
begin
 if tg_op='DELETE' then removed:=old.image_paths;
 else select array_agg(path) into removed from unnest(old.image_paths) path where not(path=any(new.image_paths)); end if;
 if cardinality(removed)>0 then insert into public.cc_cleanup(owner_id,paths) select owner_id,removed from public.cc_businesses where id=old.business_id; end if;
 if tg_op='DELETE' then return old; end if;return new;
end; $$;
create trigger cc_product_cleanup after update or delete on public.cc_products for each row execute function cc_private.cleanup_images();
revoke all on function cc_private.guard_business(),cc_private.audit_business(),cc_private.guard_product(),cc_private.guard_review(),cc_private.review_audit(),cc_private.cleanup_images() from public,anon,authenticated;

-- Names shown beside reviews are fetched independently of private profile records.
create function public.cc_review_names(ids uuid[]) returns table(id uuid,full_name text) language sql stable security definer set search_path='' as $$
 select p.id,p.full_name from public.cc_profiles p where p.id=any(ids) and exists(select 1 from public.cc_reviews r join public.cc_businesses b on b.id=r.business_id where r.user_id=p.id and not r.hidden and b.status='approved');
$$;
revoke all on function public.cc_review_names(uuid[]) from public;
grant execute on function public.cc_review_names(uuid[]) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('cc-products','cc-products',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('cc-verification','cc-verification',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy cc_product_image_read on storage.objects for select to anon,authenticated using(bucket_id='cc-products' and (cc_private.is_admin() or ((storage.foldername(storage.objects.name))[1]=(select auth.uid())::text and cc_private.is_member()) or exists(select 1 from public.cc_products p join public.cc_businesses b on b.id=p.business_id where storage.objects.name=any(p.image_paths) and p.active and b.status='approved')));
create policy cc_product_image_insert on storage.objects for insert to authenticated with check(bucket_id='cc-products' and (storage.foldername(storage.objects.name))[1]=(select auth.uid())::text and cc_private.is_member() and exists(select 1 from public.cc_products p join public.cc_businesses b on b.id=p.business_id where p.id::text=(storage.foldername(storage.objects.name))[2] and b.owner_id=(select auth.uid()) and b.status='approved'));
-- Objects are immutable. Replacement uses new UUID paths; never overwrite a verified image.
create policy cc_product_image_delete on storage.objects for delete to authenticated using(bucket_id='cc-products' and (cc_private.is_admin() or (storage.foldername(storage.objects.name))[1]=(select auth.uid())::text) and not exists(select 1 from public.cc_products p where storage.objects.name=any(p.image_paths)));
create policy cc_evidence_read on storage.objects for select to authenticated using(bucket_id='cc-verification' and (cc_private.is_admin() or ((storage.foldername(storage.objects.name))[1]=(select auth.uid())::text and cc_private.is_member())));
create policy cc_evidence_insert on storage.objects for insert to authenticated with check(bucket_id='cc-verification' and (storage.foldername(storage.objects.name))[1]=(select auth.uid())::text and cc_private.is_member() and exists(select 1 from public.cc_businesses b where b.id::text=(storage.foldername(storage.objects.name))[2] and b.owner_id=(select auth.uid()) and b.status in ('pending','rejected','needs_information')));
create policy cc_evidence_delete on storage.objects for delete to authenticated using(bucket_id='cc-verification' and (cc_private.is_admin() or (storage.foldername(storage.objects.name))[1]=(select auth.uid())::text) and not exists(select 1 from public.cc_applications a where storage.objects.name=any(a.evidence_paths) or storage.objects.name=a.logo_path));
