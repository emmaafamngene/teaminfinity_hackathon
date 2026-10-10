alter table public.cc_profiles add column account_kind text not null default 'student' check(account_kind in ('student','vendor'));
update public.cc_profiles p set account_kind='vendor' where p.role='vendor' or exists(select 1 from public.cc_businesses b where b.owner_id=p.id) or exists(select 1 from auth.users u where u.id=p.id and u.raw_user_meta_data->>'account_type'='vendor');
create or replace function cc_private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.cc_profiles(id,full_name,account_kind) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'Student'),80),case when new.raw_user_meta_data->>'account_type'='vendor' then 'vendor' else 'student' end);return new;
end;$$;
create function cc_private.is_student() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.cc_profiles where id=(select auth.uid()) and role='student' and account_kind='student' and not blocked);$$;
create function cc_private.is_vendor_account() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.cc_profiles where id=(select auth.uid()) and account_kind='vendor' and not blocked);$$;
revoke all on function cc_private.is_student(),cc_private.is_vendor_account() from public;
grant execute on function cc_private.is_student(),cc_private.is_vendor_account() to authenticated;
alter policy cc_order_insert on public.cc_orders with check(buyer_id=(select auth.uid()) and (select cc_private.is_student()));
alter policy cc_business_insert on public.cc_businesses with check(owner_id=(select auth.uid()) and status='pending' and (select cc_private.is_vendor_account()));
alter policy cc_saved_all on public.cc_saved using(user_id=(select auth.uid()) and (select cc_private.is_student())) with check(user_id=(select auth.uid()) and (select cc_private.is_student()));
alter policy cc_review_insert on public.cc_reviews with check(user_id=(select auth.uid()) and not hidden and (select cc_private.is_student()) and exists(select 1 from public.cc_businesses b where b.id=business_id and b.status='approved' and b.owner_id<>(select auth.uid())) and (product_id is null or exists(select 1 from public.cc_products p where p.id=product_id and p.business_id=cc_reviews.business_id and p.active)));
alter policy cc_review_update on public.cc_reviews using((user_id=(select auth.uid()) and (select cc_private.is_student())) or (select cc_private.is_admin())) with check((user_id=(select auth.uid()) and (select cc_private.is_student())) or (select cc_private.is_admin()));
alter policy cc_review_delete on public.cc_reviews using(user_id=(select auth.uid()) and (select cc_private.is_student()));
create function cc_private.check_buyer_role() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='confirmed' and not cc_private.is_student() then raise exception 'Student buyer account required' using errcode='42501';end if;return new;end;$$;
revoke all on function cc_private.check_buyer_role() from public,anon,authenticated;
create trigger cc_order_buyer_role before update of status on public.cc_orders for each row execute function cc_private.check_buyer_role();
