-- Index the audit actor foreign key for account moderation and lookups.
create index cc_audit_log_actor_idx on public.cc_audit_log(actor_id);
