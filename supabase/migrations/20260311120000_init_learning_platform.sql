-- Enable UUID generation
create extension if not exists "pgcrypto";

-- -----------------------------
-- Core profile and role model
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'parent', 'admin')),
  parent_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- -----------------------------
-- Learning content tables
-- -----------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  content text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  kind text not null default 'quiz',
  max_score numeric(8,2) not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(8,2),
  submitted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'system',
  recommendation_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.progress_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  event_type text not null,
  event_value numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_courses_teacher_id on public.courses(teacher_id);
create index if not exists idx_topics_course_id on public.topics(course_id);
create index if not exists idx_assessments_topic_id on public.assessments(topic_id);
create index if not exists idx_attempts_assessment_id on public.attempts(assessment_id);
create index if not exists idx_attempts_student_id on public.attempts(student_id);
create index if not exists idx_learning_paths_student_id on public.learning_paths(student_id);
create index if not exists idx_recommendations_student_id on public.recommendations(student_id);
create index if not exists idx_progress_events_student_id on public.progress_events(student_id);

-- -----------------------------
-- Auth/profile sync
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------
-- Utility role helper functions
-- -----------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'teacher', false);
$$;

create or replace function public.is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'parent', false);
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'student', false);
$$;

-- -----------------------------
-- RLS
-- -----------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.topics enable row level security;
alter table public.assessments enable row level security;
alter table public.attempts enable row level security;
alter table public.learning_paths enable row level security;
alter table public.recommendations enable row level security;
alter table public.progress_events enable row level security;

-- Profiles: user owns profile, parent can view linked student, admin has full access.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  id = auth.uid()
  or (public.is_parent() and parent_profile_id = auth.uid())
  or public.is_admin()
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (
  id = auth.uid() or public.is_admin()
)
with check (
  id = auth.uid() or public.is_admin()
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert with check (
  id = auth.uid() or public.is_admin()
);

-- Courses: everyone can read published; teacher owns drafts; admin full access.
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
for select using (
  published = true
  or teacher_id = auth.uid()
  or public.is_admin()
);

drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses
for insert with check (
  (public.is_teacher() and teacher_id = auth.uid()) or public.is_admin()
);

drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses
for update using (
  teacher_id = auth.uid() or public.is_admin()
)
with check (
  teacher_id = auth.uid() or public.is_admin()
);

drop policy if exists courses_delete on public.courses;
create policy courses_delete on public.courses
for delete using (
  teacher_id = auth.uid() or public.is_admin()
);

-- Topics and assessments inherit access from owning course via joins.
drop policy if exists topics_select on public.topics;
create policy topics_select on public.topics
for select using (
  exists (
    select 1 from public.courses c
    where c.id = topics.course_id
      and (c.published = true or c.teacher_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists topics_write on public.topics;
create policy topics_write on public.topics
for all using (
  exists (
    select 1 from public.courses c
    where c.id = topics.course_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.courses c
    where c.id = topics.course_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select using (
  exists (
    select 1
    from public.topics t
    join public.courses c on c.id = t.course_id
    where t.id = assessments.topic_id
      and (c.published = true or c.teacher_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists assessments_write on public.assessments;
create policy assessments_write on public.assessments
for all using (
  exists (
    select 1
    from public.topics t
    join public.courses c on c.id = t.course_id
    where t.id = assessments.topic_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.topics t
    join public.courses c on c.id = t.course_id
    where t.id = assessments.topic_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
);

-- Attempts: students manage own attempts; teachers/admin can read attempts for their course.
drop policy if exists attempts_select on public.attempts;
create policy attempts_select on public.attempts
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.assessments a
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where a.id = attempts.assessment_id
      and c.teacher_id = auth.uid()
  )
  or (
    public.is_parent()
    and exists (
      select 1 from public.profiles p
      where p.id = attempts.student_id
        and p.parent_profile_id = auth.uid()
    )
  )
);

drop policy if exists attempts_write on public.attempts;
create policy attempts_write on public.attempts
for all using (
  student_id = auth.uid() or public.is_admin()
)
with check (
  student_id = auth.uid() or public.is_admin()
);

-- Learning paths, recommendations, progress events: scoped to student, with teacher/parent/admin read.
drop policy if exists learning_paths_select on public.learning_paths;
create policy learning_paths_select on public.learning_paths
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or (public.is_parent() and exists (
      select 1 from public.profiles p
      where p.id = learning_paths.student_id and p.parent_profile_id = auth.uid()
  ))
  or (public.is_teacher() and created_by = auth.uid())
);

drop policy if exists learning_paths_write on public.learning_paths;
create policy learning_paths_write on public.learning_paths
for all using (
  student_id = auth.uid() or public.is_admin() or (public.is_teacher() and created_by = auth.uid())
)
with check (
  student_id = auth.uid() or public.is_admin() or (public.is_teacher() and created_by = auth.uid())
);

drop policy if exists recommendations_select on public.recommendations;
create policy recommendations_select on public.recommendations
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or (public.is_parent() and exists (
      select 1 from public.profiles p
      where p.id = recommendations.student_id and p.parent_profile_id = auth.uid()
  ))
  or (public.is_teacher() and created_by = auth.uid())
);

drop policy if exists recommendations_write on public.recommendations;
create policy recommendations_write on public.recommendations
for all using (
  public.is_admin() or student_id = auth.uid() or (public.is_teacher() and created_by = auth.uid())
)
with check (
  public.is_admin() or student_id = auth.uid() or (public.is_teacher() and created_by = auth.uid())
);

drop policy if exists progress_events_select on public.progress_events;
create policy progress_events_select on public.progress_events
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or (public.is_parent() and exists (
      select 1 from public.profiles p
      where p.id = progress_events.student_id and p.parent_profile_id = auth.uid()
  ))
  or (public.is_teacher() and exists (
      select 1
      from public.topics t
      join public.courses c on c.id = t.course_id
      where t.id = progress_events.topic_id and c.teacher_id = auth.uid()
  ))
);

drop policy if exists progress_events_write on public.progress_events;
create policy progress_events_write on public.progress_events
for all using (
  student_id = auth.uid() or public.is_admin()
)
with check (
  student_id = auth.uid() or public.is_admin()
);
