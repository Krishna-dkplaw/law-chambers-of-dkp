# Team CMS — Supabase setup (one-time, ~5–10 min)

The code is already done. Follow these steps to switch it on.

## 1. Create a free Supabase project
1. Go to https://supabase.com → sign up / log in.
2. **New project** → give it a name (e.g. `dkp-law`), set a database password, pick a region near India (e.g. Mumbai), create.
3. Wait ~1 minute for it to provision.

## 2. Create the table, security rules, storage bucket, and seed the partners
1. In the project: **SQL Editor → New query**.
2. Open `supabase/team-setup.sql` from this folder, copy ALL of it, paste, click **Run**.
   - This creates the `team_members` table, the `team-photos` storage bucket, the access rules, and inserts the two existing partners.

## 3. Create your admin login
1. **Authentication → Users → Add user**.
2. Enter an email + password, tick **Auto Confirm User**, save.
   - These are the credentials you'll use at `/admin.html`. (Repeat to add more admins.)

## 4. Paste your keys into the site
1. In Supabase: **Project Settings → API**.
2. Copy **Project URL** and the **anon / public** key.
3. Open `assets/js/supabase-config.js` and replace the two placeholders:
   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://YOURPROJECT.supabase.co',
     anonKey: 'eyJhbGci...your anon key...'
   };
   ```
4. Save.

## 5. Use it
- Visit `http://localhost:8000/admin.html`, log in, and add / edit / delete team members (with photo upload).
- The public **Our Team** page (`team.html`) automatically shows everyone, ordered by **Sort order** (lower = first).

### Notes
- The anon key is safe to expose in the browser — writing is still blocked unless logged in (enforced by the database rules).
- Until step 4 is done, the team page shows the original two partner cards as a fallback, and `admin.html` shows a "not configured yet" notice.
- "Sort order": partners are seeded as 1 and 2. New members default to 0 (appear first) — set higher numbers to place them after the partners.
