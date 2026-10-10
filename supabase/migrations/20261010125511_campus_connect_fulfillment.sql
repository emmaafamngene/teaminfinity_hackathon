alter table public.cc_orders add column fulfillment_location text not null default '' check(length(fulfillment_location)<=300);
create function cc_private.order_fulfillment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.fulfillment='pickup' then
  select location into new.fulfillment_location from public.cc_businesses where id=new.business_id;
  if new.fulfillment_location is null or length(trim(new.fulfillment_location))<3 then raise exception 'The seller must set a pickup location before accepting pickup orders'; end if;
 else
  new.fulfillment_location=trim(new.fulfillment_location);
  if length(new.fulfillment_location)<5 then raise exception 'Enter a campus delivery location (at least 5 characters)' using errcode='23514'; end if;
 end if;
 return new;
end; $$;
revoke all on function cc_private.order_fulfillment() from public,anon,authenticated;
create trigger cc_order_fulfillment before insert on public.cc_orders for each row execute function cc_private.order_fulfillment();
grant insert(fulfillment_location) on public.cc_orders to authenticated;
