-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  tags text[] not null default '{}',
  live_url text,
  code_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row
  execute function public.set_updated_at();

-- Row Level Security: anyone can read, only signed-in users can write.
alter table public.projects enable row level security;

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects"
  on public.projects for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can insert projects" on public.projects;
create policy "Authenticated users can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update projects" on public.projects;
create policy "Authenticated users can update projects"
  on public.projects for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can delete projects" on public.projects;
create policy "Authenticated users can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- Optional: seed the real projects from the myPortfolio repo.
-- Safe to delete this block if you'd rather start from an empty table.
insert into public.projects (title, description, tags, live_url, code_url, sort_order)
values
  (
    'आचार्य जी - Hindi Pooja Voice Agent',
    'A Hindi-only voice agent where Claude plays a Hindu priest and guides the Yajman through poojas with shlokas, text/voice/image input, recorded-voice playback and interrupt-clarify-resume.',
    array['Node.js', 'Claude API', 'Web Speech', 'Voice AI'],
    null,
    'https://github.com/itsmeapoorvaagrawal/myPortfolio/tree/feature/hindu-priest-agent/hindu-priest-agent',
    0
  ),
  (
    'DIY Pooja App - Feasibility Study',
    'Market, competitor, user-acceptance and tech-risk research with a go-to-market plan and voice-guide concept for a do-it-yourself pooja app.',
    array['Research', 'Product Strategy', 'Market Analysis'],
    null,
    'https://github.com/itsmeapoorvaagrawal/myPortfolio/tree/claude/nice-bohr-mb6wfl/reports',
    1
  ),
  (
    'Portfolio Website',
    'This personal portfolio: a responsive dark-themed Next.js site with hero, about, projects and contact sections.',
    array['Next.js', 'TypeScript', 'Tailwind CSS'],
    null,
    'https://github.com/itsmeapoorvaagrawal/myPortfolio',
    2
  ),
  (
    'Portfolio Admin Portal',
    'A Supabase-backed admin portal to add, edit and delete portfolio projects, secured with Auth and Postgres row-level security.',
    array['Supabase', 'Next.js', 'PostgreSQL', 'RLS'],
    null,
    'https://github.com/itsmeapoorvaagrawal/myPortfolio/tree/feature/supabase-projects-admin',
    3
  );
