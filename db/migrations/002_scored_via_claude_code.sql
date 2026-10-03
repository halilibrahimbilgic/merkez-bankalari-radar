-- Cron, API anahtarı yerine Claude aboneliğiyle (claude-code-action) skorlar;
-- bu kayıtlar scored_via = 'claude-code' ile işaretlenir.
-- 001'deki satır içi check kısıtına Postgres'in verdiği ad:
-- speeches_scored_via_check.
alter table speeches drop constraint if exists speeches_scored_via_check;
alter table speeches
  add constraint speeches_scored_via_check
  check (scored_via in ('api', 'session', 'claude-code'));
