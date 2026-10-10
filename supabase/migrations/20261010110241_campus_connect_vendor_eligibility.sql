create function cc_private.can_sell() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.cc_profiles where id=(select auth.uid()) and role in ('vendor','admin') and not blocked); $$;
revoke all on function cc_private.can_sell() from public;
grant execute on function cc_private.can_sell() to authenticated;
drop policy cc_product_insert on public.cc_products;
drop policy cc_product_update on public.cc_products;
drop policy cc_product_delete on public.cc_products;
create policy cc_product_insert on public.cc_products for insert to authenticated with check(cc_private.can_sell() and exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved'));
create policy cc_product_update on public.cc_products for update to authenticated using((cc_private.can_sell() and exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved')) or cc_private.is_admin()) with check((cc_private.can_sell() and exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved')) or cc_private.is_admin());
create policy cc_product_delete on public.cc_products for delete to authenticated using((cc_private.can_sell() and exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid()) and b.status='approved')) or cc_private.is_admin());
drop policy cc_product_image_insert on storage.objects;
create policy cc_product_image_insert on storage.objects for insert to authenticated with check(bucket_id='cc-products' and (storage.foldername(storage.objects.name))[1]=(select auth.uid())::text and cc_private.can_sell() and exists(select 1 from public.cc_products p join public.cc_businesses b on b.id=p.business_id where p.id::text=(storage.foldername(storage.objects.name))[2] and b.owner_id=(select auth.uid()) and b.status='approved'));
create function cc_private.check_approval() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status='pending' and new.status='approved' and not exists(select 1 from public.cc_applications a where a.business_id=new.id and cardinality(a.evidence_paths)>0) then raise exception 'Ownership evidence must be submitted before approval'; end if;
 if old.status='approved' and auth.uid()=old.owner_id and not cc_private.can_sell() and not cc_private.is_admin() then raise exception 'Vendor role required' using errcode='42501';end if;
 return new;
end; $$;
revoke all on function cc_private.check_approval() from public,anon,authenticated;
create trigger cc_approval_check before update on public.cc_businesses for each row execute function cc_private.check_approval();
create or replace function cc_private.guard_review() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.user_id<>old.user_id or new.business_id<>old.business_id or new.product_id is distinct from old.product_id then raise exception 'Review identity is immutable' using errcode='42501'; end if;
 if cc_private.is_admin() and auth.uid()<>old.user_id then
  if new.rating<>old.rating or new.body<>old.body then raise exception 'Admins may moderate visibility only'; end if;
 elsif not cc_private.is_admin() and new.hidden<>old.hidden then raise exception 'Only admins can moderate reviews' using errcode='42501';end if;
 new.updated_at=now();return new;
end; $$;
