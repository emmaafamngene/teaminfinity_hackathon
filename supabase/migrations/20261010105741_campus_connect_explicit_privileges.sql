-- Supabase may grant ALL to anon/authenticated through default privileges.
-- Start from no privileges and deliberately expose only the operations below.
revoke all on public.cc_profiles,public.cc_businesses,public.cc_applications,public.cc_products,public.cc_reviews,public.cc_saved,public.cc_audit_log,public.cc_cleanup from public,anon,authenticated;
grant select on public.cc_profiles to authenticated;
grant update(full_name) on public.cc_profiles to authenticated;
grant select on public.cc_businesses,public.cc_products,public.cc_reviews to anon,authenticated;
grant select on public.cc_applications,public.cc_saved,public.cc_audit_log,public.cc_cleanup to authenticated;
grant insert,update on public.cc_businesses,public.cc_applications to authenticated;
grant insert,update,delete on public.cc_products,public.cc_reviews,public.cc_saved to authenticated;
grant delete on public.cc_cleanup to authenticated;
