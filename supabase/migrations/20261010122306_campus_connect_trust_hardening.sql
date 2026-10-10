-- Verification claims can only be changed through the checked, audited RPC.
revoke insert,update on public.cc_verifications from authenticated;
create function cc_private.check_order_vendor_role() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status in ('preparing','delivered') and not cc_private.can_sell() then raise exception 'Approved vendor role required' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function cc_private.check_order_vendor_role() from public,anon,authenticated;
create trigger cc_order_vendor_role before update of status on public.cc_orders for each row execute function cc_private.check_order_vendor_role();
