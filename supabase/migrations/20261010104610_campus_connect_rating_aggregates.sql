create view public.cc_product_ratings with (security_invoker=true) as
 select r.product_id,avg(r.rating)::numeric as average,count(*)::integer as count
 from public.cc_reviews r join public.cc_products p on p.id=r.product_id join public.cc_businesses b on b.id=p.business_id
 where not r.hidden and p.active and b.status='approved' group by r.product_id;
create view public.cc_business_ratings with (security_invoker=true) as
 select r.business_id,avg(r.rating)::numeric as average,count(*)::integer as count
 from public.cc_reviews r join public.cc_businesses b on b.id=r.business_id
 where not r.hidden and b.status='approved' and (r.product_id is null or exists(select 1 from public.cc_products p where p.id=r.product_id and p.active)) group by r.business_id;
grant select on public.cc_product_ratings,public.cc_business_ratings to anon,authenticated;
