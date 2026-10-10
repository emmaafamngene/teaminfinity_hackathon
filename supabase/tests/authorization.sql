-- All fixtures, including auth users, are rolled back.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('10000000-0000-4000-8000-000000000001','cc-student-fixture@example.invalid','{"full_name":"Test Student","role":"admin"}'),
 ('10000000-0000-4000-8000-000000000002','cc-owner-fixture@example.invalid','{"full_name":"Test Vendor","account_type":"vendor"}'),
 ('10000000-0000-4000-8000-000000000003','cc-admin-fixture@example.invalid','{"full_name":"Test Admin"}');
update public.cc_profiles set role='admin' where id='10000000-0000-4000-8000-000000000003';
do $$ begin if (select role from public.cc_profiles where id='10000000-0000-4000-8000-000000000001')<>'student' then raise exception 'FAIL: metadata promoted an account';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin update public.cc_profiles set account_kind='vendor' where id=auth.uid();raise exception 'FAIL: client changed account kind';exception when insufficient_privilege then null;end;
 begin insert into public.cc_businesses(owner_id,name,category,description,phone,location) values(auth.uid(),'Forbidden student store','Design & tech','A sufficiently long description','2348011111111','Campus');raise exception 'FAIL: student created a vendor business';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.cc_businesses(id,owner_id,name,category,description,phone,location) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Policy fixture','Design & tech','A real enough fixture description','2348012345678','PAU campus');
insert into storage.objects(bucket_id,name) values('cc-verification','10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000001/fixture.pdf');
insert into public.cc_applications(business_id,evidence_paths) values('20000000-0000-4000-8000-000000000001',array['10000000-0000-4000-8000-000000000002/20000000-0000-4000-8000-000000000001/fixture.pdf']);
do $$ begin
 begin update public.cc_profiles set role='admin' where id=auth.uid();raise exception 'FAIL: self-promotion';exception when insufficient_privilege then null;end;
 begin perform public.cc_manage_user(auth.uid(),'admin',false);raise exception 'FAIL: student used admin RPC';exception when insufficient_privilege then null;end;
 begin update public.cc_businesses set status='approved' where id='20000000-0000-4000-8000-000000000001';raise exception 'FAIL: owner approved own business';exception when insufficient_privilege then null;end;
 begin insert into public.cc_products(business_id,name,description,category,price) values('20000000-0000-4000-8000-000000000001','Pending product','A sufficiently long description','Design & tech',500);raise exception 'FAIL: pending vendor published';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin if exists(select 1 from public.cc_businesses where id='20000000-0000-4000-8000-000000000001') then raise exception 'FAIL: pending business leaked';end if;if exists(select 1 from storage.objects where bucket_id='cc-verification' and name like '10000000-0000-4000-8000-000000000002/%') then raise exception 'FAIL: private evidence leaked';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.cc_review_business('20000000-0000-4000-8000-000000000001','approved','Policy test approval');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.cc_products(id,business_id,name,description,category,price) values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Approved product','A sufficiently long product description','Design & tech',500);
do $$ begin
 begin insert into public.cc_saved(user_id,product_id) values(auth.uid(),'30000000-0000-4000-8000-000000000001');raise exception 'FAIL: vendor used student saved listings';exception when insufficient_privilege then null;end;
end $$;
insert into storage.objects(bucket_id,name) values('cc-products','10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000001/fixture.webp');
update public.cc_products set image_paths=array['10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000001/fixture.webp'] where id='30000000-0000-4000-8000-000000000001';
do $$ begin
 begin insert into public.cc_reviews(user_id,business_id,product_id,rating,body) values(auth.uid(),'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',5,'Owner cannot inflate their own rating');raise exception 'FAIL: self-rating';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ declare n integer;begin
 begin insert into storage.objects(bucket_id,name) values('cc-products','10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000001/foreign.webp');raise exception 'FAIL: outsider uploaded vendor image';exception when insufficient_privilege then null;end;
 if exists(select 1 from storage.objects where bucket_id='cc-verification' and name like '10000000-0000-4000-8000-000000000002/%') then raise exception 'FAIL: unrelated student read verification evidence';end if;
 update public.cc_products set price=1 where id='30000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: outsider changed product';end if;
 begin insert into public.cc_reviews(user_id,business_id,product_id,rating,body) values('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',5,'Impersonation attempt review');raise exception 'FAIL: impersonation';exception when insufficient_privilege then null;end;
end $$;
do $$ begin
 insert into public.cc_reviews(user_id,business_id,product_id,rating,body) values(auth.uid(),'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',4,'Student buyer can review without an order');
 if not exists(select 1 from public.cc_reviews where user_id=auth.uid() and order_id is null) then raise exception 'FAIL: student review without order unavailable';end if;
 delete from public.cc_reviews where user_id=auth.uid();
 begin perform public.cc_record_verification('20000000-0000-4000-8000-000000000001',true,true,'Student forged identity checks');raise exception 'FAIL: student verified a vendor';exception when insufficient_privilege then null;end;
end $$;
insert into public.cc_orders(business_id,product_id,buyer_id,quantity,fulfillment) values('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',auth.uid(),2,'pickup');
do $$ begin
 if not exists(select 1 from public.cc_orders where buyer_id=auth.uid() and fulfillment='pickup' and fulfillment_location='PAU campus') then raise exception 'FAIL: pickup location not derived from seller'; end if;
 begin insert into public.cc_orders(business_id,product_id,buyer_id,quantity,fulfillment) values('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',auth.uid(),1,'delivery');raise exception 'FAIL: missing delivery location accepted';exception when check_violation then null;end;
end $$;
select set_config('cc.test_order',(select id::text from public.cc_orders where buyer_id=auth.uid() limit 1),true);
do $$ begin
 if (select unit_price from public.cc_orders where id=current_setting('cc.test_order')::uuid)<>500 then raise exception 'FAIL: incorrect price snapshot';end if;
 begin update public.cc_orders set status='confirmed' where id=current_setting('cc.test_order')::uuid;raise exception 'FAIL: buyer skipped delivery';exception when insufficient_privilege then null;end;
end $$;
insert into public.cc_messages(order_id,author_id,body) values(current_setting('cc.test_order')::uuid,auth.uid(),'I will collect this on campus.');
insert into public.cc_reports(business_id,reporter_id,reason,details) values('20000000-0000-4000-8000-000000000001',auth.uid(),'other','Test concern for the administrator.');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.cc_orders set status='preparing' where id=current_setting('cc.test_order')::uuid;
update public.cc_orders set status='delivered' where id=current_setting('cc.test_order')::uuid;
do $$ begin
 begin update public.cc_orders set status='confirmed' where id=current_setting('cc.test_order')::uuid;raise exception 'FAIL: vendor confirmed for buyer';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.cc_reports where business_id='20000000-0000-4000-8000-000000000001') then raise exception 'FAIL: vendor read private reports';end if;
 if (public.cc_vendor_trust('20000000-0000-4000-8000-000000000001')->>'ordersCompleted')::integer<>0 then raise exception 'FAIL: delivery counted as completion';end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform 1 from public.cc_orders;raise exception 'FAIL: public order access';exception when insufficient_privilege then null;end;
 if public.cc_vendor_trust('20000000-0000-4000-8000-000000000001')->>'idVerifiedAt' is not null then raise exception 'FAIL: approval fabricated ID check';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 insert into public.cc_reviews(user_id,business_id,product_id,rating,body) values(auth.uid(),'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',4,'Buyer may review before confirming delivery');
 delete from public.cc_reviews where user_id=auth.uid();
end $$;
update public.cc_orders set status='confirmed' where id=current_setting('cc.test_order')::uuid;
insert into public.cc_reviews(id,user_id,business_id,product_id,rating,body) values('40000000-0000-4000-8000-000000000001',auth.uid(),'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',4,'Helpful service and clear communication');
do $$ begin if (select order_id from public.cc_reviews where id='40000000-0000-4000-8000-000000000001') is null then raise exception 'FAIL: missing verified buyer reference';end if;end $$;
insert into public.cc_review_comments(review_id,user_id,body) values('40000000-0000-4000-8000-000000000001',auth.uid(),'A helpful follow-up from the buyer.');
select set_config('cc.test_comment',(select id::text from public.cc_review_comments where user_id=auth.uid() limit 1),true);
do $$ begin
 if (select author_name from public.cc_review_comments where id=current_setting('cc.test_comment')::uuid) is null then raise exception 'FAIL: comment author missing';end if;
 begin insert into public.cc_review_comments(review_id,user_id,body) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','Spoofed author comment');raise exception 'FAIL: comment identity spoofing';exception when insufficient_privilege then null;end;
 begin perform public.cc_signup_slot(repeat('a',64));raise exception 'FAIL: student used privileged signup limiter';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
select public.cc_record_verification('20000000-0000-4000-8000-000000000001',true,true,'Fixture administrator inspected ID and checked phone ownership.');
update public.cc_reports set status='reviewing' where business_id='20000000-0000-4000-8000-000000000001';
do $$ begin if (public.cc_vendor_trust('20000000-0000-4000-8000-000000000001')->>'ordersCompleted')::integer<>1 then raise exception 'FAIL: confirmed count';end if;if not (public.cc_vendor_trust('20000000-0000-4000-8000-000000000001')->>'underReview')::boolean then raise exception 'FAIL: report investigation status';end if;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
update public.cc_businesses set phone='2348099999999' where id='20000000-0000-4000-8000-000000000001';
do $$ begin if public.cc_vendor_trust('20000000-0000-4000-8000-000000000001')->>'phoneVerifiedAt' is not null then raise exception 'FAIL: phone badge survived phone change';end if;end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin insert into public.cc_reviews(user_id,business_id,product_id,rating,body) values(auth.uid(),'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',5,'Duplicate review from same person');raise exception 'FAIL: duplicate review';exception when unique_violation then null;end;
 begin update public.cc_reviews set hidden=true where id='40000000-0000-4000-8000-000000000001';raise exception 'FAIL: customer changed moderation';exception when insufficient_privilege then null;end;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin if (select average from public.cc_product_ratings where product_id='30000000-0000-4000-8000-000000000001')<>4 then raise exception 'FAIL: rating average';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ declare n integer;begin update public.cc_reviews set body='Vendor rewrote customer feedback' where id='40000000-0000-4000-8000-000000000001';get diagnostics n=row_count;if n<>0 then raise exception 'FAIL: vendor edited review';end if;end $$;
do $$ begin
 begin insert into public.cc_review_comments(review_id,user_id,body) values('40000000-0000-4000-8000-000000000001',auth.uid(),'Vendor comment must be rejected');raise exception 'FAIL: vendor posted buyer comment';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
update public.cc_reviews set hidden=true where id='40000000-0000-4000-8000-000000000001';
select public.cc_review_business('20000000-0000-4000-8000-000000000001','suspended','Policy test suspension');
do $$ begin if (select count(*) from public.cc_audit_log where business_id='20000000-0000-4000-8000-000000000001')<3 then raise exception 'FAIL: audit events missing';end if;end $$;
set local role anon;
do $$ begin if exists(select 1 from public.cc_review_comments where id=current_setting('cc.test_comment')::uuid) then raise exception 'FAIL: hidden review comment leaked';end if;end $$;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin if exists(select 1 from public.cc_products where id='30000000-0000-4000-8000-000000000001') then raise exception 'FAIL: suspended product leaked';end if;if exists(select 1 from public.cc_reviews where id='40000000-0000-4000-8000-000000000001') then raise exception 'FAIL: hidden review leaked';end if;if exists(select 1 from storage.objects where bucket_id='cc-products' and name like '10000000-0000-4000-8000-000000000002/%') then raise exception 'FAIL: suspended product image leaked';end if;end $$;
reset role;
rollback;
select 'PASS: database RBAC, ownership, approval, reviews, averages and audit policies' as result;
