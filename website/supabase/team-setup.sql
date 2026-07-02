-- ============================================================
-- Law Chambers Of DKP — Team CMS setup for Supabase
-- Run this once in: Supabase Dashboard > SQL Editor > New query
-- Safe to re-run (uses "if not exists" / idempotent guards).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Table that holds every team member (partners + associates)
-- ------------------------------------------------------------
create table if not exists public.team_members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  designation  text,            -- e.g. "Senior Partner", "Associate"
  initials     text,            -- avatar fallback text, e.g. "ND" (auto from name if blank)
  image_url    text,            -- headshot URL (from the team-photos storage bucket)
  bio          text,            -- separate paragraphs with a blank line between them
  meta1_label  text, meta1_value text,   -- e.g. "Enrolled" / "1983"
  meta2_label  text, meta2_value text,   -- e.g. "Experience" / "40+ Years"
  meta3_label  text, meta3_value text,   -- e.g. "Forums" / "SC · HC · DRT"
  sort_order   int  default 0,  -- lower numbers appear first
  created_at   timestamptz default now()
);

-- If an older version of the table exists, add the newer columns.
alter table public.team_members add column if not exists image_url   text;
alter table public.team_members add column if not exists meta1_label text;
alter table public.team_members add column if not exists meta1_value text;
alter table public.team_members add column if not exists meta2_label text;
alter table public.team_members add column if not exists meta2_value text;
alter table public.team_members add column if not exists meta3_label text;
alter table public.team_members add column if not exists meta3_value text;

-- ------------------------------------------------------------
-- 2. Row Level Security: public can read, only admins can write
-- ------------------------------------------------------------
alter table public.team_members enable row level security;

drop policy if exists "Public read team_members" on public.team_members;
create policy "Public read team_members"
  on public.team_members for select
  to anon, authenticated using (true);

drop policy if exists "Auth insert team_members" on public.team_members;
create policy "Auth insert team_members"
  on public.team_members for insert
  to authenticated with check (true);

drop policy if exists "Auth update team_members" on public.team_members;
create policy "Auth update team_members"
  on public.team_members for update
  to authenticated using (true) with check (true);

drop policy if exists "Auth delete team_members" on public.team_members;
create policy "Auth delete team_members"
  on public.team_members for delete
  to authenticated using (true);

-- ------------------------------------------------------------
-- 3. Storage bucket for member photos (public read, admin write)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read team photos" on storage.objects;
create policy "Public read team photos"
  on storage.objects for select
  to anon, authenticated using (bucket_id = 'team-photos');

drop policy if exists "Auth upload team photos" on storage.objects;
create policy "Auth upload team photos"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'team-photos');

drop policy if exists "Auth update team photos" on storage.objects;
create policy "Auth update team photos"
  on storage.objects for update
  to authenticated using (bucket_id = 'team-photos');

drop policy if exists "Auth delete team photos" on storage.objects;
create policy "Auth delete team photos"
  on storage.objects for delete
  to authenticated using (bucket_id = 'team-photos');

-- ------------------------------------------------------------
-- 4. Seed the two existing partners (only if the table is empty)
-- ------------------------------------------------------------
insert into public.team_members
  (name, designation, initials, bio,
   meta1_label, meta1_value, meta2_label, meta2_value, meta3_label, meta3_value, sort_order)
select * from (values
  ('N. Damodaran', 'Senior Partner', 'ND',
   E'Enrolled as an Advocate in 1983, Mr. N. Damodaran has over four decades of extensive practice before the High Court of Judicature at Madras and various judicial forums across Tamil Nadu and India.\n\nHis practice spans civil and commercial litigation, criminal matters, banking laws, and family disputes, with a particular focus on appellate proceedings, writ petitions, and recovery litigation.',
   'Enrolled', '1983', 'Experience', '40+ Years', 'Forums', 'SC · HC · DRT', 1),
  ('D. Krishna Pradeep', 'Partner', 'DK',
   E'Mr. D. Krishna Pradeep enrolled as an Advocate in 2010 after graduating from Dr. Ambedkar Government Law College, Chennai. He later pursued an LL.M. in International Commercial Law from the University of Birmingham, United Kingdom.\n\nHis practice focuses on commercial arbitration, corporate advisory, banking laws, and criminal litigation, bringing internationally trained commercial law perspective to domestic dispute resolution and corporate compliance matters.',
   'Enrolled', '2010', 'Education', 'LL.M., UK', 'Practice', 'Arbitration · Corporate', 2)
) as seed
where not exists (select 1 from public.team_members);

-- ============================================================
-- 5. Create your admin login:
--    Supabase Dashboard > Authentication > Users > "Add user"
--    Enter an email + password and tick "Auto Confirm User".
--    Use those credentials on /admin.html
-- ============================================================
