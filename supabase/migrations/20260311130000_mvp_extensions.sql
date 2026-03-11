-- =============================================================
-- MVP Extension Migration
-- Adds: classes, enrollments, guardians, assessment items/keys,
--        attempt answers, mastery, learning path steps, feedback
-- Alters: courses (template + cloning support)
-- =============================================================

-- -----------------------------
-- Alter courses for templates
-- -----------------------------
alter table public.courses
  add column if not exists is_template boolean not null default false;

alter table public.courses
  add column if not exists cloned_from uuid references public.courses(id) on delete set null;

create index if not exists idx_courses_cloned_from on public.courses(cloned_from);
create index if not exists idx_courses_is_template on public.courses(is_template);

-- -----------------------------
-- Classes
-- -----------------------------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_classes_course_id on public.classes(course_id);
create index if not exists idx_classes_join_code on public.classes(join_code);

-- -----------------------------
-- Class Enrollments
-- -----------------------------
create table if not exists public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default timezone('utc', now()),
  unique (class_id, student_id)
);

create index if not exists idx_class_enrollments_class_id on public.class_enrollments(class_id);
create index if not exists idx_class_enrollments_student_id on public.class_enrollments(student_id);

-- -----------------------------
-- Student Guardians
-- -----------------------------
create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  linked_by uuid references public.profiles(id) on delete set null,
  linked_at timestamptz not null default timezone('utc', now()),
  unique (student_id, guardian_id)
);

create index if not exists idx_student_guardians_student_id on public.student_guardians(student_id);
create index if not exists idx_student_guardians_guardian_id on public.student_guardians(guardian_id);

-- -----------------------------
-- Assessment Items
-- -----------------------------
create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_text text not null,
  kind text not null default 'multiple_choice',
  sort_order integer not null default 0,
  options jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_assessment_items_assessment_id on public.assessment_items(assessment_id);

-- -----------------------------
-- Assessment Answer Keys
-- (blocked from student reads via RLS)
-- -----------------------------
create table if not exists public.assessment_answer_keys (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.assessment_items(id) on delete cascade unique,
  correct_answer text not null,
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_answer_keys_item_id on public.assessment_answer_keys(item_id);

-- -----------------------------
-- Attempt Answers
-- -----------------------------
create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete cascade,
  student_answer text,
  is_correct boolean,
  points numeric(8,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_attempt_answers_attempt_id on public.attempt_answers(attempt_id);
create index if not exists idx_attempt_answers_item_id on public.attempt_answers(item_id);

-- -----------------------------
-- Student Topic Mastery
-- -----------------------------
create table if not exists public.student_topic_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  mastery_pct numeric(5,2) not null default 0,
  attempts_count integer not null default 0,
  last_assessed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, topic_id)
);

create index if not exists idx_student_topic_mastery_student_id on public.student_topic_mastery(student_id);
create index if not exists idx_student_topic_mastery_topic_id on public.student_topic_mastery(topic_id);

-- -----------------------------
-- Learning Path Steps
-- -----------------------------
create table if not exists public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  step_order integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_learning_path_steps_path_id on public.learning_path_steps(learning_path_id);

-- -----------------------------
-- Feedback Submissions
-- -----------------------------
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'general',
  body text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_feedback_submissions_user_id on public.feedback_submissions(user_id);
create index if not exists idx_feedback_submissions_status on public.feedback_submissions(status);

-- =============================================================
-- RLS for new tables
-- =============================================================

alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.student_guardians enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_answer_keys enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.student_topic_mastery enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.feedback_submissions enable row level security;

-- ---- Classes ----
-- Teachers own their classes; students enrolled can read; admin full.
create policy classes_select on public.classes
for select using (
  teacher_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.class_enrollments ce
    where ce.class_id = classes.id and ce.student_id = auth.uid()
  )
);

create policy classes_insert on public.classes
for insert with check (
  (public.is_teacher() and teacher_id = auth.uid()) or public.is_admin()
);

create policy classes_update on public.classes
for update using (
  teacher_id = auth.uid() or public.is_admin()
) with check (
  teacher_id = auth.uid() or public.is_admin()
);

create policy classes_delete on public.classes
for delete using (
  teacher_id = auth.uid() or public.is_admin()
);

-- ---- Class Enrollments ----
create policy class_enrollments_select on public.class_enrollments
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.classes c
    where c.id = class_enrollments.class_id and c.teacher_id = auth.uid()
  )
);

create policy class_enrollments_insert on public.class_enrollments
for insert with check (
  student_id = auth.uid() or public.is_admin()
);

create policy class_enrollments_delete on public.class_enrollments
for delete using (
  public.is_admin()
  or exists (
    select 1 from public.classes c
    where c.id = class_enrollments.class_id and c.teacher_id = auth.uid()
  )
);

-- ---- Student Guardians ----
create policy student_guardians_select on public.student_guardians
for select using (
  student_id = auth.uid()
  or guardian_id = auth.uid()
  or public.is_admin()
);

create policy student_guardians_insert on public.student_guardians
for insert with check (
  public.is_admin()
);

create policy student_guardians_delete on public.student_guardians
for delete using (
  public.is_admin()
);

-- ---- Assessment Items ----
-- Same access as assessments (inherit from course via topic)
create policy assessment_items_select on public.assessment_items
for select using (
  exists (
    select 1
    from public.assessments a
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where a.id = assessment_items.assessment_id
      and (c.published = true or c.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy assessment_items_write on public.assessment_items
for all using (
  exists (
    select 1
    from public.assessments a
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where a.id = assessment_items.assessment_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1
    from public.assessments a
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where a.id = assessment_items.assessment_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
);

-- ---- Assessment Answer Keys ----
-- BLOCKED from students! Only teachers (who own the course) and admins can read.
create policy answer_keys_select on public.assessment_answer_keys
for select using (
  exists (
    select 1
    from public.assessment_items ai
    join public.assessments a on a.id = ai.assessment_id
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where ai.id = assessment_answer_keys.item_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
);

create policy answer_keys_write on public.assessment_answer_keys
for all using (
  exists (
    select 1
    from public.assessment_items ai
    join public.assessments a on a.id = ai.assessment_id
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where ai.id = assessment_answer_keys.item_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1
    from public.assessment_items ai
    join public.assessments a on a.id = ai.assessment_id
    join public.topics t on t.id = a.topic_id
    join public.courses c on c.id = t.course_id
    where ai.id = assessment_answer_keys.item_id
      and (c.teacher_id = auth.uid() or public.is_admin())
  )
);

-- ---- Attempt Answers ----
-- Student owns their own; teacher can read via course ownership; parent via guardian link.
create policy attempt_answers_select on public.attempt_answers
for select using (
  exists (
    select 1 from public.attempts att
    where att.id = attempt_answers.attempt_id
      and (
        att.student_id = auth.uid()
        or public.is_admin()
        or exists (
          select 1
          from public.assessments a
          join public.topics t on t.id = a.topic_id
          join public.courses c on c.id = t.course_id
          where a.id = att.assessment_id and c.teacher_id = auth.uid()
        )
        or (public.is_parent() and exists (
          select 1 from public.student_guardians sg
          where sg.student_id = att.student_id and sg.guardian_id = auth.uid()
        ))
      )
  )
);

create policy attempt_answers_write on public.attempt_answers
for all using (
  exists (
    select 1 from public.attempts att
    where att.id = attempt_answers.attempt_id
      and (att.student_id = auth.uid() or public.is_admin())
  )
) with check (
  exists (
    select 1 from public.attempts att
    where att.id = attempt_answers.attempt_id
      and (att.student_id = auth.uid() or public.is_admin())
  )
);

-- ---- Student Topic Mastery ----
create policy student_topic_mastery_select on public.student_topic_mastery
for select using (
  student_id = auth.uid()
  or public.is_admin()
  or (public.is_parent() and exists (
    select 1 from public.student_guardians sg
    where sg.student_id = student_topic_mastery.student_id and sg.guardian_id = auth.uid()
  ))
  or (public.is_teacher() and exists (
    select 1
    from public.class_enrollments ce
    join public.classes cl on cl.id = ce.class_id
    where ce.student_id = student_topic_mastery.student_id and cl.teacher_id = auth.uid()
  ))
);

create policy student_topic_mastery_write on public.student_topic_mastery
for all using (
  student_id = auth.uid() or public.is_admin()
) with check (
  student_id = auth.uid() or public.is_admin()
);

-- ---- Learning Path Steps ----
create policy learning_path_steps_select on public.learning_path_steps
for select using (
  exists (
    select 1 from public.learning_paths lp
    where lp.id = learning_path_steps.learning_path_id
      and (
        lp.student_id = auth.uid()
        or public.is_admin()
        or (public.is_teacher() and lp.created_by = auth.uid())
        or (public.is_parent() and exists (
          select 1 from public.student_guardians sg
          where sg.student_id = lp.student_id and sg.guardian_id = auth.uid()
        ))
      )
  )
);

create policy learning_path_steps_write on public.learning_path_steps
for all using (
  exists (
    select 1 from public.learning_paths lp
    where lp.id = learning_path_steps.learning_path_id
      and (lp.student_id = auth.uid() or public.is_admin() or (public.is_teacher() and lp.created_by = auth.uid()))
  )
) with check (
  exists (
    select 1 from public.learning_paths lp
    where lp.id = learning_path_steps.learning_path_id
      and (lp.student_id = auth.uid() or public.is_admin() or (public.is_teacher() and lp.created_by = auth.uid()))
  )
);

-- ---- Feedback Submissions ----
-- Users can insert their own; only admin can read all.
create policy feedback_submissions_select on public.feedback_submissions
for select using (
  user_id = auth.uid() or public.is_admin()
);

create policy feedback_submissions_insert on public.feedback_submissions
for insert with check (
  user_id = auth.uid()
);

create policy feedback_submissions_update on public.feedback_submissions
for update using (
  public.is_admin()
) with check (
  public.is_admin()
);
