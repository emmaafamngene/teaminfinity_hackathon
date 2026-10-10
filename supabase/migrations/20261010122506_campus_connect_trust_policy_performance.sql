-- Evaluate identity once per statement rather than once per candidate row.
alter policy cc_order_read on public.cc_orders using((select cc_private.is_member()) and (buyer_id=(select auth.uid()) or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid())) or (select cc_private.is_admin())));
alter policy cc_order_insert on public.cc_orders with check(buyer_id=(select auth.uid()) and (select cc_private.is_member()));
alter policy cc_order_update on public.cc_orders using((select cc_private.is_member()) and (buyer_id=(select auth.uid()) or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid())))) with check((select cc_private.is_member()));
alter policy cc_message_insert on public.cc_messages with check(author_id=(select auth.uid()) and (select cc_private.is_member()) and exists(select 1 from public.cc_orders o join public.cc_businesses b on b.id=o.business_id where o.id=order_id and (o.buyer_id=(select auth.uid()) or b.owner_id=(select auth.uid()))));
drop policy cc_verification_admin on public.cc_verifications;
alter policy cc_verification_read on public.cc_verifications using((select cc_private.is_admin()) or exists(select 1 from public.cc_businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
alter policy cc_reports_read on public.cc_reports using((select cc_private.is_admin()) or (reporter_id=(select auth.uid()) and (select cc_private.is_member())));
alter policy cc_reports_insert on public.cc_reports with check(reporter_id=(select auth.uid()) and status='pending' and (select cc_private.is_member()) and exists(select 1 from public.cc_businesses where id=business_id and status='approved' and owner_id<>(select auth.uid())));
