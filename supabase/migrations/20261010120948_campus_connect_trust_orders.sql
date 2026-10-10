-- Trust claims and order completion are derived from server-checked evidence.
create table public.cc_orders (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.cc_businesses(id),
 product_id uuid references public.cc_products(id) on delete set null, buyer_id uuid not null references public.cc_profiles(id),
 product_name text not null default '', unit_price numeric(12,2) not null default 0, quantity integer not null check(quantity between 1 and 99),
 payment_method text not null default 'pay_on_delivery' check(payment_method='pay_on_delivery'),
 fulfillment text not null default 'pickup' check(fulfillment in ('pickup','delivery')),
 notes text not null default '' check(length(notes)<=1000), status text not null default 'placed' check(status in ('placed','preparing','delivered','confirmed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz
);
create index cc_orders_buyer_idx on public.cc_orders(buyer_id,created_at desc);
create index cc_orders_business_idx on public.cc_orders(business_id,status);
create index cc_orders_product_idx on public.cc_orders(product_id);
alter table public.cc_orders enable row level security;
create policy cc_order_read on public.cc_orders for select to authenticated using(cc_private.is_member() and (buyer_id=auth.uid() or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=auth.uid()) or cc_private.is_admin()));
create policy cc_order_insert on public.cc_orders for insert to authenticated with check(buyer_id=auth.uid() and cc_private.is_member());
create policy cc_order_update on public.cc_orders for update to authenticated using(cc_private.is_member() and (buyer_id=auth.uid() or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=auth.uid()))) with check(cc_private.is_member());
create function cc_private.guard_order() returns trigger language plpgsql security definer set search_path='' as $$
declare seller uuid; p public.cc_products;
begin
 select owner_id into seller from public.cc_businesses where id=new.business_id;
 if tg_op='INSERT' then
  select * into p from public.cc_products where id=new.product_id and business_id=new.business_id and active and available;
  if p.id is null or new.buyer_id<>auth.uid() or seller=auth.uid() or new.status<>'placed' or not cc_private.is_member() or not exists(select 1 from public.cc_businesses where id=new.business_id and status='approved') then raise exception 'Invalid order' using errcode='42501'; end if;
  new.product_name=p.name;new.unit_price=p.price;new.created_at=now();new.confirmed_at=null;
 else
  if (to_jsonb(new)-'status'-'updated_at'-'confirmed_at')<>(to_jsonb(old)-'status'-'updated_at'-'confirmed_at') then
   -- A deleted product may clear its reference; the immutable order snapshot is retained.
   if not (new.product_id is null and old.product_id is not null and (to_jsonb(new)-'product_id'-'updated_at')=(to_jsonb(old)-'product_id'-'updated_at')) then raise exception 'Order details are immutable' using errcode='42501'; end if;
   return new;
  end if;
  if not cc_private.is_member() then raise exception 'Account restricted' using errcode='42501'; end if;
  if old.status='placed' and new.status='preparing' and seller=auth.uid() then null;
  elsif old.status='preparing' and new.status='delivered' and seller=auth.uid() then null;
  elsif old.status='delivered' and new.status='confirmed' and old.buyer_id=auth.uid() then new.confirmed_at=now();
  else raise exception 'Only the responsible party can advance this order in sequence' using errcode='42501'; end if;
  if new.status<>'confirmed' then new.confirmed_at=old.confirmed_at; end if;
 end if;
 new.updated_at=now();return new;
end; $$;
revoke all on function cc_private.guard_order() from public,anon,authenticated;
create trigger cc_order_guard before insert or update on public.cc_orders for each row execute function cc_private.guard_order();
revoke all on public.cc_orders from public,anon,authenticated;
grant select on public.cc_orders to authenticated;
grant insert(business_id,product_id,buyer_id,quantity,fulfillment,notes) on public.cc_orders to authenticated;
grant update(status) on public.cc_orders to authenticated;

create table public.cc_messages(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.cc_orders(id),author_id uuid not null references public.cc_profiles(id),body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create index cc_messages_order_idx on public.cc_messages(order_id,created_at);
create index cc_messages_author_idx on public.cc_messages(author_id);
alter table public.cc_messages enable row level security;
create policy cc_message_read on public.cc_messages for select to authenticated using(exists(select 1 from public.cc_orders o where o.id=order_id));
create policy cc_message_insert on public.cc_messages for insert to authenticated with check(author_id=auth.uid() and cc_private.is_member() and exists(select 1 from public.cc_orders o join public.cc_businesses b on b.id=o.business_id where o.id=order_id and (o.buyer_id=auth.uid() or b.owner_id=auth.uid())));
revoke all on public.cc_messages from public,anon,authenticated;
grant select on public.cc_messages to authenticated;
grant insert(order_id,author_id,body) on public.cc_messages to authenticated;

create table public.cc_verifications(business_id uuid primary key references public.cc_businesses(id),id_verified_at timestamptz,phone_verified_at timestamptz,verified_phone text,verified_by uuid references public.cc_profiles(id),note text not null default '' check(length(note)<=1000));
create index cc_verifications_actor_idx on public.cc_verifications(verified_by);
alter table public.cc_verifications enable row level security;
create policy cc_verification_read on public.cc_verifications for select to authenticated using(cc_private.is_admin() or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=auth.uid()));
create policy cc_verification_admin on public.cc_verifications for all to authenticated using(cc_private.is_admin()) with check(cc_private.is_admin());
revoke all on public.cc_verifications from public,anon,authenticated;
grant select,insert,update on public.cc_verifications to authenticated;
create function public.cc_record_verification(business uuid,id_checked boolean,phone_checked boolean,reason text) returns void language plpgsql security invoker set search_path='' as $$
declare phone_value text;
begin
 if not cc_private.is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 if length(trim(reason))<10 then raise exception 'Describe the checks performed';end if;
 if id_checked and not exists(select 1 from public.cc_applications where business_id=business and cardinality(evidence_paths)>0) then raise exception 'Inspect uploaded ID evidence first';end if;
 select phone into phone_value from public.cc_businesses where id=business and status='approved';
 if phone_value is null then raise exception 'Approved business required';end if;
 insert into public.cc_verifications(business_id,id_verified_at,phone_verified_at,verified_phone,verified_by,note) values(business,case when id_checked then now() end,case when phone_checked then now() end,case when phone_checked then phone_value end,auth.uid(),reason)
 on conflict(business_id) do update set id_verified_at=excluded.id_verified_at,phone_verified_at=excluded.phone_verified_at,verified_phone=excluded.verified_phone,verified_by=excluded.verified_by,note=excluded.note;
 insert into public.cc_audit_log(actor_id,business_id,action,note) values(auth.uid(),business,'verification_updated',reason);
end; $$;
revoke all on function public.cc_record_verification(uuid,boolean,boolean,text) from public,anon;
grant execute on function public.cc_record_verification(uuid,boolean,boolean,text) to authenticated;
-- The audit insert is available only inside the trusted helper below, not as a client table write.
alter function public.cc_record_verification(uuid,boolean,boolean,text) rename to cc_record_verification_impl;
alter function public.cc_record_verification_impl(uuid,boolean,boolean,text) set schema cc_private;
alter function cc_private.cc_record_verification_impl(uuid,boolean,boolean,text) security definer;
create function public.cc_record_verification(business uuid,id_checked boolean,phone_checked boolean,reason text) returns void language sql security invoker set search_path='' as $$select cc_private.cc_record_verification_impl(business,id_checked,phone_checked,reason);$$;
revoke all on function public.cc_record_verification(uuid,boolean,boolean,text) from public,anon;
grant execute on function public.cc_record_verification(uuid,boolean,boolean,text) to authenticated;

create table public.cc_reports(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.cc_businesses(id),reporter_id uuid not null references public.cc_profiles(id),reason text not null check(reason in ('payment','identity','quality','harassment','other')),details text not null check(length(trim(details)) between 10 and 2000),status text not null default 'pending' check(status in ('pending','reviewing','resolved','dismissed')),created_at timestamptz not null default now());
create index cc_reports_business_idx on public.cc_reports(business_id,status);
create index cc_reports_reporter_idx on public.cc_reports(reporter_id);
create unique index cc_one_open_report on public.cc_reports(business_id,reporter_id) where status in ('pending','reviewing');
alter table public.cc_reports enable row level security;
create policy cc_reports_read on public.cc_reports for select to authenticated using(cc_private.is_admin() or (reporter_id=auth.uid() and cc_private.is_member()));
create policy cc_reports_insert on public.cc_reports for insert to authenticated with check(reporter_id=auth.uid() and status='pending' and cc_private.is_member() and exists(select 1 from public.cc_businesses where id=business_id and status='approved' and owner_id<>auth.uid()));
create policy cc_reports_update on public.cc_reports for update to authenticated using(cc_private.is_admin()) with check(cc_private.is_admin());
revoke all on public.cc_reports from public,anon,authenticated;
grant select on public.cc_reports to authenticated;
grant insert(business_id,reporter_id,reason,details) on public.cc_reports to authenticated;
grant update(status) on public.cc_reports to authenticated;
create function cc_private.audit_report() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.cc_audit_log(actor_id,business_id,action,note) values(auth.uid(),new.business_id,'report_'||new.status,'Report '||new.id::text);return new;end;$$;
revoke all on function cc_private.audit_report() from public,anon,authenticated;
create trigger cc_report_audit after update of status on public.cc_reports for each row execute function cc_private.audit_report();

alter table public.cc_reviews add column order_id uuid references public.cc_orders(id);
create index cc_reviews_order_idx on public.cc_reviews(order_id);
create function cc_private.guard_buyer_review() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' then
  select id into new.order_id from public.cc_orders where buyer_id=auth.uid() and business_id=new.business_id and status='confirmed' and (new.product_id is null or product_id=new.product_id) order by confirmed_at desc limit 1;
  if new.order_id is null then raise exception 'Complete an order to review' using errcode='42501';end if;
 elsif new.order_id is distinct from old.order_id then raise exception 'Review order is immutable' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function cc_private.guard_buyer_review() from public,anon,authenticated;
create trigger cc_buyer_review_guard before insert or update on public.cc_reviews for each row execute function cc_private.guard_buyer_review();

-- Public aggregate intentionally excludes private order contents and reporting identities.
create function cc_private.vendor_trust(business uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.cc_businesses; v public.cc_verifications; completed bigint; total bigint; responded bigint; avg_rating numeric; review_count bigint;
begin
 select * into b from public.cc_businesses where id=business and (status='approved' or owner_id=auth.uid() or cc_private.is_admin());
 if b.id is null then return null;end if;
 select * into v from public.cc_verifications where business_id=business;
 select count(*) filter(where status='confirmed'),count(*),count(*) filter(where status<>'placed' or exists(select 1 from public.cc_messages m where m.order_id=o.id and m.author_id=b.owner_id)) into completed,total,responded from public.cc_orders o where business_id=business;
 select avg(rating),count(*) into avg_rating,review_count from public.cc_reviews where business_id=business and not hidden and order_id is not null;
 return jsonb_build_object('businessId',b.id,'slug',b.slug,'name',b.name,'phone',b.phone,'memberSince',(select created_at from public.cc_profiles where id=b.owner_id),'idVerifiedAt',v.id_verified_at,'phoneVerifiedAt',case when v.verified_phone=b.phone then v.phone_verified_at end,'ordersCompleted',completed,'responseRate',case when total>0 then round(100.0*responded/total) else null end,'rating',avg_rating,'reviewCount',review_count,'reported',exists(select 1 from public.cc_reports where business_id=business and status in ('pending','reviewing')),'underReview',exists(select 1 from public.cc_reports where business_id=business and status='reviewing'),'idUploaded',case when b.owner_id=auth.uid() or cc_private.is_admin() then exists(select 1 from public.cc_applications where business_id=business and cardinality(evidence_paths)>0) else null end);
end;$$;
revoke all on function cc_private.vendor_trust(uuid) from public;
grant execute on function cc_private.vendor_trust(uuid) to anon,authenticated;
create function public.cc_vendor_trust(business uuid) returns jsonb language sql stable security invoker set search_path='' as $$select cc_private.vendor_trust(business);$$;
revoke all on function public.cc_vendor_trust(uuid) from public;
grant execute on function public.cc_vendor_trust(uuid) to anon,authenticated;
