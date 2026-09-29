# CLAUDE.md

Context for Claude (or any future contributor) working in this repository.

## What this is

A personal portfolio website for Apoorva Agrawal, built with Next.js (App
Router), TypeScript, and Tailwind CSS. Single-page layout with four sections:
Hero, About, Projects, Contact.

Repo: https://github.com/itsmeapoorvaagrawal/myPortfolio

## Stack

- **Next.js 16** (App Router, `app/` directory, Turbopack)
- **React 19**
- **TypeScript**
- **Tailwind CSS** for styling (no component library)
- **next/font** (Inter) for typography
- **ESLint 9** with flat config (`eslint.config.mjs`, extends `eslint-config-next`)
- **Supabase** (Postgres + Auth) backs the Projects section and the admin
  portal — see [Projects data + admin portal](#projects-data--admin-portal) below
- No CMS, no other database tables

## Structure

```
app/
  layout.tsx        Root layout: fonts, metadata, Navbar + Footer wrapper
  page.tsx           Home page: renders Hero, About, Projects, Contact in order (revalidate = 0)
  globals.css        Tailwind directives + CSS custom properties (theme colors)
  api/contact/route.ts   POST handler for the contact form (see below)
  admin/
    login/page.tsx    Email/password login form ('use client', Supabase Auth)
    page.tsx           Protected dashboard: lists projects, renders ProjectsManager
    actions.ts          Server actions: createProject, updateProject, deleteProject, signOut
components/
  Navbar.tsx          Sticky nav with mobile hamburger menu ('use client')
  Footer.tsx          Simple footer with social links
  Hero.tsx            Name + tagline + CTA buttons
  About.tsx           Bio paragraph + skills list
  Projects.tsx         Server component — fetches projects from Supabase, renders ProjectCards
  ProjectCard.tsx      Reusable card (title, description, tags, links)
  Contact.tsx          Section wrapper around ContactForm
  ContactForm.tsx       Client-side form with validation + submit state ('use client')
  admin/
    ProjectsManager.tsx  Client component: add/edit/delete UI, calls the server actions
    ProjectForm.tsx       Shared form used for both create and edit
lib/
  projects.ts          Project / ProjectInput TypeScript types (mirrors the DB schema)
  supabase/client.ts    Browser Supabase client (for 'use client' components)
  supabase/server.ts    Server Supabase client (cookie-based session, for Server Components/actions)
proxy.ts               Refreshes the Supabase session cookie; redirects unauthenticated
                        visitors away from /admin/* to /admin/login (and vice versa).
                        Next.js 16's replacement for the old middleware.ts convention.
supabase/schema.sql     SQL to run once in the Supabase SQL Editor to create the projects
                        table, its RLS policies, and (optionally) seed 3 example rows
```

## Content that needs personalizing

Everything below is placeholder content and should be swapped for the real
thing before this goes live:

- **Name / tagline** — [Hero.tsx](components/Hero.tsx), [Navbar.tsx](components/Navbar.tsx), [layout.tsx](app/layout.tsx) metadata
- **About bio + skills list** — [About.tsx](components/About.tsx)
- **Projects** — no longer hardcoded. Managed via the `/admin` portal, backed
  by Supabase (see below).
- **Social links** — [Footer.tsx](components/Footer.tsx) (GitHub/LinkedIn URLs are placeholders;
  email is already set to the real address)

## Projects data + admin portal

Projects live in a `projects` table in Supabase
(project: https://ompigktzdqtfnxutwmjs.supabase.co), not in code. The public
Projects section ([Projects.tsx](components/Projects.tsx)) reads from it on
every request (`export const revalidate = 0` in [page.tsx](app/page.tsx)); the
`/admin` portal writes to it.

**One-time setup (not yet done in this environment — no Supabase credentials
were available):**

1. In the Supabase dashboard, open **SQL Editor** and run
   [supabase/schema.sql](supabase/schema.sql). It creates the `projects` table,
   enables Row Level Security, adds policies (public read, authenticated-only
   write), and optionally seeds the 3 original example projects.
2. In **Authentication -> Users**, manually add one user (email + password) —
   this is the only account that will be able to sign in to `/admin`. There is
   no public sign-up flow by design.
3. Copy [.env.local.example](.env.local.example) to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` from **Project Settings -> API** (the "anon
   public" key — safe to expose client-side, RLS is what actually protects
   writes). `.env.local` is gitignored.
4. `npm run dev`, visit `/admin/login`, sign in with the user from step 2.

**How auth/authorization works:**

- [proxy.ts](proxy.ts) refreshes the Supabase session cookie on
  every request and redirects unauthenticated visitors away from any
  `/admin/*` route to `/admin/login` (and signed-in users away from
  `/admin/login` to `/admin`).
- [app/admin/page.tsx](app/admin/page.tsx) also checks `auth.getUser()`
  server-side as defense in depth.
- Actual write protection is enforced by **Postgres RLS policies**, not by
  application code — the `anon` role can only `select`, only `authenticated`
  can `insert`/`update`/`delete`. There is no service-role key anywhere in
  this codebase.
- [app/admin/actions.ts](app/admin/actions.ts) are Next.js Server Actions
  (`"use server"`) that run the actual Supabase queries using the signed-in
  user's session; [ProjectsManager.tsx](components/admin/ProjectsManager.tsx)
  and [ProjectForm.tsx](components/admin/ProjectForm.tsx) are the client UI
  that call them.

**Extending it:** to add a field (e.g. a project thumbnail image), update
`supabase/schema.sql`, the `Project`/`ProjectInput` types in
[lib/projects.ts](lib/projects.ts), the `parseProjectForm` helper in
`app/admin/actions.ts`, and the form fields in `ProjectForm.tsx`.

## Contact form behavior

The form posts JSON to `POST /api/contact` ([route.ts](app/api/contact/route.ts)), which validates
the fields (all required, basic email regex) and currently just
`console.log`s the submission and returns `{ ok: true }`. **It does not send
an email or persist anything yet.** To make it functional, wire the route up
to one of:

- An email service (Resend, SendGrid, Postmark, Nodemailer + SMTP)
- A form backend (Formspree, Getform)
- A database insert if you want submissions stored

Keep the validation and response shape (`{ ok: true }` on success,
`{ error: string }` with a 4xx status on failure) so `ContactForm.tsx`
doesn't need to change.

## Design notes

- Dark theme by default, defined via CSS variables in `globals.css`
  (`--background`, `--foreground`, `--accent`, `--surface`, `--border`, `--muted`).
  Change these variables to re-theme the whole site.
- Layout is mobile-first and responsive via Tailwind breakpoints (`sm:`, `lg:`).
- `.section-container` (in `globals.css`) is the shared max-width/padding
  wrapper used by every section — keep using it for consistency.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run lint` and `npm run build` have
both been verified to pass on this project (Node 24.19.0 / npm 11.17.0).

## Deployment

No deployment is configured yet. This is a standard Next.js app, so it
deploys cleanly to Vercel (recommended, zero-config) or any Node hosting
that supports `next start`.
