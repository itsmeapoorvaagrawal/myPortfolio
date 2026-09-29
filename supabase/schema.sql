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

-- Optional: seed the 3 example projects the site originally shipped with.
-- Safe to delete this block if you'd rather start from an empty table.
insert into public.projects (title, description, tags, live_url, code_url, sort_order)
values
  (
    'Task Flow',
    'A collaborative task management app with real-time updates, drag-and-drop boards, and team workspaces.',
    array['Next.js', 'TypeScript', 'PostgreSQL'],
    null,
    null,
    0
  ),
  (
    'Weatherly',
    'A minimal weather dashboard that surfaces hyperlocal forecasts with clean data visualizations.',
    array['React', 'Node.js', 'REST API'],
    null,
    null,
    1
  ),
  (
    'ShopStack',
    'A full-stack e-commerce storefront with cart, checkout, and an admin dashboard for inventory.',
    array['Next.js', 'Stripe', 'Tailwind CSS'],
    null,
    null,
    2
  );
