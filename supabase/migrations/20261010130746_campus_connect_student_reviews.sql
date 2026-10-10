-- Student buyers may review approved sellers without a platform order.
-- Retain an optional order reference when one exists; clients cannot set it.
create or replace function cc_private.guard_buyer_review() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' then
  select id into new.order_id from public.cc_orders where buyer_id=auth.uid() and business_id=new.business_id and status='confirmed' and (new.product_id is null or product_id=new.product_id) order by confirmed_at desc limit 1;
 elsif new.order_id is distinct from old.order_id then raise exception 'Review order is immutable' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function cc_private.guard_buyer_review() from public,anon,authenticated;
