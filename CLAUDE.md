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
- No database, no auth, no CMS — content is hardcoded in components

## Structure

```
app/
  layout.tsx        Root layout: fonts, metadata, Navbar + Footer wrapper
  page.tsx           Home page: renders Hero, About, Projects, Contact in order
  globals.css        Tailwind directives + CSS custom properties (theme colors)
  api/contact/route.ts   POST handler for the contact form (see below)
components/
  Navbar.tsx          Sticky nav with mobile hamburger menu ('use client')
  Footer.tsx          Simple footer with social links
  Hero.tsx            Name + tagline + CTA buttons
  About.tsx           Bio paragraph + skills list
  Projects.tsx         Renders 3 ProjectCard entries from a local array
  ProjectCard.tsx      Reusable card (title, description, tags, links)
  Contact.tsx          Section wrapper around ContactForm
  ContactForm.tsx       Client-side form with validation + submit state ('use client')
```

## Content that needs personalizing

Everything below is placeholder content and should be swapped for the real
thing before this goes live:

- **Name / tagline** — [Hero.tsx](components/Hero.tsx), [Navbar.tsx](components/Navbar.tsx), [layout.tsx](app/layout.tsx) metadata
- **About bio + skills list** — [About.tsx](components/About.tsx)
- **Projects** — the `projects` array in [Projects.tsx](components/Projects.tsx) has 3 example
  entries with `liveUrl`/`codeUrl` set to `#`. Replace with real projects and links.
- **Social links** — [Footer.tsx](components/Footer.tsx) (GitHub/LinkedIn URLs are placeholders;
  email is already set to the real address)

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
