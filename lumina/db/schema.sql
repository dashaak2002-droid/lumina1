-- ============================================================
-- Lumina — структура базы данных (PostgreSQL / Supabase)
--
-- В MVP данные лежат в браузере (localStorage), поэтому эта схема сейчас
-- НЕ используется. Она готова на будущее: когда захотите, чтобы данные
-- хранились на сервере и синхронизировались между телефоном и компьютером —
-- выполните этот файл в Supabase (SQL Editor) и замените функции в lib/storage.ts.
--
-- Поля повторяют типы из lib/types.ts один в один.
-- ============================================================

create extension if not exists "pgcrypto";

-- Сферы жизни (общий справочник)
create type area_id as enum ('health','career','money','relationships','family','selfcare','home','growth');
create type priority_level as enum ('high','normal','low');
create type repeat_rule as enum ('none','daily','weekly');
create type note_kind as enum ('note','task','event','goal','idea');

-- Профиль (связан с пользователем из системы авторизации Supabase Auth)
create table profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  name         text not null,
  age_group    text,
  priorities   area_id[] not null default '{}',   -- до 3 приоритетных сфер
  improve      text[]    not null default '{}',   -- что хочется улучшить
  features     text[]    not null default '{}',   -- какие разделы нужны
  created_at   timestamptz not null default now()
);

create table goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  area_id      area_id not null,
  deadline     date,
  created_at   timestamptz not null default now()
);

create table milestones (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references goals(id) on delete cascade,
  title        text not null,
  done         boolean not null default false,
  position     int not null default 0
);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  area_id      area_id not null,
  priority     priority_level not null default 'normal',
  due_date     date,                              -- null = без даты (списки)
  due_time     time,                              -- время = напоминание
  done         boolean not null default false,
  done_at      date,
  repeat       repeat_rule not null default 'none',
  list_name    text not null default 'Входящие',
  goal_id      uuid references goals(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index tasks_user_date on tasks (user_id, due_date);

-- Выполнение повторяющихся задач по датам
create table task_completions (
  task_id      uuid not null references tasks(id) on delete cascade,
  day          date not null,
  primary key (task_id, day)
);

create table events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  area_id      area_id not null,
  day          date not null,
  start_time   time,                              -- null = весь день
  created_at   timestamptz not null default now()
);
create index events_user_day on events (user_id, day);

create table habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  area_id      area_id not null,
  per_week     int not null default 5 check (per_week between 1 and 7),
  created_at   timestamptz not null default now()
);

create table habit_logs (
  habit_id     uuid not null references habits(id) on delete cascade,
  day          date not null,
  primary key (habit_id, day)
);

create table notes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  body         text not null,
  kind         note_kind not null default 'note',
  created_at   timestamptz not null default now()
);

-- История чата с AI
create table chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null check (role in ('user','assistant')),
  body         text not null,
  applied      text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Безопасность (Row Level Security): каждая пользовательница видит только свои данные.
-- ------------------------------------------------------------
alter table profiles      enable row level security;
alter table goals         enable row level security;
alter table milestones    enable row level security;
alter table tasks         enable row level security;
alter table task_completions enable row level security;
alter table events        enable row level security;
alter table habits        enable row level security;
alter table habit_logs    enable row level security;
alter table notes         enable row level security;
alter table chat_messages enable row level security;

create policy "own profile"  on profiles      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own goals"    on goals         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks"    on tasks         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own events"   on events        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own habits"   on habits        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes"    on notes         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own chat"     on chat_messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own milestones" on milestones for all
  using (exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid()))
  with check (exists (select 1 from goals g where g.id = goal_id and g.user_id = auth.uid()));
create policy "own completions" on task_completions for all
  using (exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid()))
  with check (exists (select 1 from tasks t where t.id = task_id and t.user_id = auth.uid()));
create policy "own habit logs" on habit_logs for all
  using (exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()))
  with check (exists (select 1 from habits h where h.id = habit_id and h.user_id = auth.uid()));
