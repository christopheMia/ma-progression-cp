-- 007_ia_usage.sql — suivi estimatif de l'usage IA (jauge de budget).
create table if not exists ia_usage (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  mois text not null,            -- 'YYYY-MM'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  created_at timestamptz default now()
);
alter table ia_usage enable row level security;
do $$ begin
  create policy "Users manage own ia_usage" on ia_usage
    using (class_id in (select id from classes where user_id = auth.uid()))
    with check (class_id in (select id from classes where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
