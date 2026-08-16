-- Job Search Helper — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Profiles: one row per authenticated user, extends auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  resume_text text,          -- plain-text version of the user's base CV/resume
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jobs: a job posting the user saved, with AI-extracted structured info
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text not null,
  title text,
  company text,
  location text,
  employment_type text,
  salary_range text,
  responsibilities text[],
  requirements text[],
  nice_to_have text[],
  raw_description text,       -- cleaned text extracted from the job page
  application_deadline date,  -- extracted or manually set
  status text not null default 'saved' check (status in ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived')),
  notified_at timestamptz,    -- last time a deadline-reminder email was sent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_user_id_idx on public.jobs(user_id);
create index if not exists jobs_deadline_idx on public.jobs(application_deadline);

-- Generated documents: CV tailoring notes / cover letters produced for a job
create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  doc_type text not null check (doc_type in ('cover_letter', 'cv_suggestions')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_documents_job_id_idx on public.generated_documents(job_id);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.generated_documents enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can view own jobs" on public.jobs
  for select using (auth.uid() = user_id);
create policy "Users can insert own jobs" on public.jobs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own jobs" on public.jobs
  for update using (auth.uid() = user_id);
create policy "Users can delete own jobs" on public.jobs
  for delete using (auth.uid() = user_id);

create policy "Users can view own documents" on public.generated_documents
  for select using (auth.uid() = user_id);
create policy "Users can insert own documents" on public.generated_documents
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own documents" on public.generated_documents
  for delete using (auth.uid() = user_id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_jobs_updated_at on public.jobs;
create trigger set_jobs_updated_at before update on public.jobs
  for each row execute procedure public.set_updated_at();
