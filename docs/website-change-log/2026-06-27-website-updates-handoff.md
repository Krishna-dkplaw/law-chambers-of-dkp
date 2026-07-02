# Website Updates — Handoff Note
**Date:** 2026-06-27
**Project:** Law Chambers Of DKP — website

---

## 1. Logo (global, all pages)
- Company name now renders in full caps (via `text-transform` on `.logo-mark`, header + footer).
- Caption reduced to just "Advocates" (header and footer captions both updated).

## 2. Editable "Our Team" — Supabase + login (built, needs your Supabase keys to go live)
- Founding partners stay static. A new "Associates" section renders dynamically from a `team_members` table and stays hidden until associates exist.
- `admin.html` — email/password login (Supabase Auth) → dashboard to add / edit / delete associates (name, designation, initials, enrolled, education, practice, bio, sort order). Brand-styled, `noindex`.
- Security via Row Level Security: public can read, only logged-in admins can write.
- To activate (3 steps):
  1. Run `supabase/team-setup.sql` in the Supabase SQL editor.
  2. Paste your Project URL + anon key into `assets/js/supabase-config.js`.
  3. Create your admin user under Authentication → Users, then log in at `admin.html` (also linked discreetly as "Team Admin" in the team-page footer).

## 3. "Senior counsel" → "partners" — in the team Working With Us section (heading + body)
- Note: I scoped strictly to that section as asked. The phrase still appears in the team page CTA ("Engage senior counsel…") and on `about.html`. **Want those changed too?**

## 4. Blue → red, context-aware
- Light backgrounds: `hsl(4, 84%, 48%)`; dark backgrounds (hero, dark sections, CTA banner, footer): `hsl(4, 64%, 60%)`. Done via a token override so every accent — including the Contact email and Krishna's contact links — auto-picks the right shade.

---

## Plus
- All 66 em-dashes removed site-wide (ranges like "Monday–Friday" became "to", everything else became commas; middle-dot separators left intact per your choice).

## To eyeball in Chrome
- The red at `hsl(4,84%,48%)` on light backgrounds is a fairly saturated brand-red for links/accents — check it reads the way you want against the black/cream palette before we lock it.

---

## Open items to pick up later today
- [ ] Decide whether to change "senior counsel" → "partners" in the team page CTA and on `about.html`.
- [ ] Plug in Supabase keys + run setup SQL + create admin user to make "Our Team" editing live.
- [ ] Confirm the red accent reads well on light backgrounds.
