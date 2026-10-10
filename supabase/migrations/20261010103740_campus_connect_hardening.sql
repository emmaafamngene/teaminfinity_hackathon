alter table public.cc_businesses add column owner_name text not null default 'Student owner';
alter table public.cc_reviews add column reviewer_name text not null default 'Student';
-- Names are snapshotted by trusted triggers, never accepted from browser input.
create function cc_private.set_display_names() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='cc_businesses' then select full_name into new.owner_name from public.cc_profiles where id=new.owner_id;
 else select full_name into new.reviewer_name from public.cc_profiles where id=new.user_id; end if;
 return new;
end; $$;
revoke all on function cc_private.set_display_names() from public,anon,authenticated;
create trigger cc_business_display before insert or update on public.cc_businesses for each row execute function cc_private.set_display_names();
create trigger cc_review_display before insert or update on public.cc_reviews for each row execute function cc_private.set_display_names();
drop function public.cc_review_names(uuid[]);
alter function public.cc_manage_user(uuid,text,boolean) set schema cc_private;
create function public.cc_manage_user(target uuid,new_role text,is_blocked boolean) returns void language sql security invoker set search_path='' as $$ select cc_private.cc_manage_user(target,new_role,is_blocked); $$;
revoke all on function public.cc_manage_user(uuid,text,boolean) from public,anon;
grant execute on function public.cc_manage_user(uuid,text,boolean) to authenticated;
create function cc_private.guard_application() returns trigger language plpgsql set search_path='' as $$
declare path text; owner uuid;
begin
 select owner_id into owner from public.cc_businesses where id=new.business_id;
 if tg_op='UPDATE' and new.business_id<>old.business_id then raise exception 'Application identity is immutable'; end if;
 foreach path in array new.evidence_paths||case when new.logo_path is null then '{}'::text[] else array[new.logo_path] end loop
  if path not like owner::text||'/'||new.business_id::text||'/%' or not exists(select 1 from storage.objects o where o.bucket_id='cc-verification' and o.name=path) then raise exception 'Invalid evidence reference'; end if;
 end loop;
 if cardinality(new.evidence_paths)>4 then raise exception 'Maximum four evidence files'; end if;
 new.updated_at=now();return new;
end; $$;
revoke all on function cc_private.guard_application() from public,anon,authenticated;
create trigger cc_application_guard before insert or update on public.cc_applications for each row execute function cc_private.guard_application();
create function cc_private.audit_product() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if cc_private.is_admin() and (tg_op='DELETE' or new.active<>old.active) then
  insert into public.cc_audit_log(actor_id,business_id,action,note) values(auth.uid(),old.business_id,case when tg_op='DELETE' then 'product_deleted' else 'product_moderated' end,old.id::text);
 end if;
 if tg_op='DELETE' then return old; end if;return new;
end; $$;
revoke all on function cc_private.audit_product() from public,anon,authenticated;
create trigger cc_product_audit after update or delete on public.cc_products for each row execute function cc_private.audit_product();
