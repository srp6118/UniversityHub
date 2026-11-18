# University Hub

The dashboard uses Supabase Auth for accounts and Supabase Postgres/Storage for private user data.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project's API settings. These are browser-safe public values; never use the `service_role` key here.
3. Apply every file in `supabase/migrations/` in filename order using the Supabase CLI (`supabase db push`) or the SQL editor.
4. In Supabase Auth, enable the Email provider and **require email confirmations**. Set the site URL and allowed redirect URLs for your local and deployed app, including `/?auth=recovery`. Configure custom SMTP before launch so confirmation and password-reset emails reach users reliably; Supabase's default mail service is rate-limited.
5. Run `npm install` and `npm run dev`.

The migration creates profiles, connected-account metadata, workspace records, and a private file bucket. Row-level security restricts every row and uploaded file to its owner. OAuth access and refresh tokens are deliberately not stored in these client-accessible tables.

Sign-up sends a confirmation message only when email confirmation is enabled in the Supabase project. The app expects the user to confirm that email before signing in. “Forgot password?” sends a Supabase recovery email; its redirect opens a new-password form in the app.

On the first sign-in, a two-step welcome setup lets users choose Canvas, Minerva, Blackboard, or Teams as their main platform and choose which source cards to show on Overview. The second step explains how the workspace works. They can skip setup, or change the home focus and dashboard cards later from Connections; hidden cards and all platforms remain available there. Preferences and saved Canvas/Minerva/Blackboard portal URLs live in the user's private profile. Apply all migrations, including `20261118120000_main_platform_preferences.sql` and `20261118123500_first_time_dashboard_setup.sql`, before using onboarding.

## Profile and account settings

The Profile & settings page lets an authenticated user update their display name, change their password, and permanently delete their own account. The `20261118131500_backfill_existing_profiles.sql` migration creates profile rows for accounts that existed before the profile table was added; apply all migrations before using Profile & settings. For both the in-app code flow and moderator-sent reset links, configure Authentication → Email Templates → Reset Password to include `{{ .Token }}` and a clickable `{{ .ConfirmationURL }}` link. Keep the recovery redirect allowlist configured as described above.

Account deletion requires the signed-in user's session and typing `DELETE`. The `account-delete` Edge Function removes that user's private Storage files, then deletes their auth account; profile, connections, workspace data, and roles cascade with it. Existing shared announcements are kept but their author reference is cleared. Apply the `20261118124500_account_deletion.sql` migration and deploy the function before enabling account deletion.

## Phone sign-in

The login screen supports passwordless phone sign-in with SMS one-time codes. In Supabase, enable Authentication → Sign In / Providers → Phone, keep phone confirmations enabled, and configure an SMS provider such as Twilio with its account credentials in the dashboard. Never put SMS provider secrets in `.env.local` or browser code. Real SMS delivery can incur provider charges; Supabase test phone numbers can be used for development without sending messages. Before public launch, set suitable auth rate limits and CAPTCHA.

After signing in with email, use **Add mobile sign-in** in the account area to verify and link a mobile number to the same account. Phone login only accepts an already-verified number, so it does not create a second account or expose another user's workspace.

## Moderator account

Create your own account through the app first. To grant moderator access, use the Supabase SQL editor as the project owner and replace the example email with that account's email:

```sql
insert into public.user_roles (user_id, role)
select id, 'moderator'
from auth.users
where lower(email) = lower('moderator@example.com')
on conflict do nothing;
```

Sign out and back in; the Moderator section will appear. It can publish, edit, and delete shared announcements, view aggregate active-member counts, and page through member accounts (100 at a time) with their name, email, join date, last sign-in, and recent-presence time. The active count is an estimate based on an app heartbeat in the last five minutes; the seven-day count uses the same heartbeat. The app does not log page visits, private files, messages, or study activity for moderators.

The Moderator page links to a dedicated Manage users page. Moderators can send a Supabase password-recovery email to a non-moderator member with an email address; they never see or choose the member's password. The recovery link returns to the public app, so the Supabase Reset Password email template and redirect allowlist must be configured. Moderators can also permanently remove non-moderator accounts. The server verifies the caller's role, prevents self-removal and actions against other moderators, deletes the selected member's private Storage files, and then deletes their auth account and related records. Apply `20261118130000_moderator_activity.sql` and deploy `record-presence`, `moderator-activity`, `moderator-delete-user`, and `moderator-send-password-reset` before using these tools. There is intentionally no shared moderator password; remove the row from `public.user_roles` to revoke moderator access.

## Connecting university services

The Connections page starts OAuth for Google, Microsoft, and Canvas. After provider consent, Supabase Edge Functions verify the account, encrypt and store the provider tokens server-side, and mark the related services connected. Users can remove the stored token from University Hub with **Disconnect**. For full provider-side revocation, users should also remove University Hub from the provider's account security settings.

The OAuth functions and migrations do **not** sync or copy Drive files, email, calendar events, OneNote pages, or Canvas coursework into the dashboard yet. They establish and securely store account authorization; data import and ongoing sync are a separate feature.

Minerva is currently a per-browser portal shortcut: enter your institution's HTTPS Minerva URL and open it in a new tab to sign in there. University Hub does not receive your Minerva password or course data through this shortcut. Automatic Minerva integration needs the institution's specific API/OAuth documentation and approval; there is no generic Minerva connector configured here.

Blackboard and Microsoft Teams are also portal shortcuts in Connections. Enter your institution's Blackboard URL; Teams opens `https://teams.microsoft.com/`. These shortcuts open the provider's own sign-in page and do not import course data or connect accounts to University Hub. Blackboard API access depends on each institution's Blackboard Learn setup and administrator approval.

Before deploying the functions:

1. Apply all SQL migrations in `supabase/migrations/`, including the OAuth token-storage and RPC migrations.
2. Register OAuth clients with each provider and use this exact redirect URI: `https://<project-ref>.supabase.co/functions/v1/oauth-callback`.
3. Add the provider client IDs and secrets to Supabase Edge Function secrets, never to `.env.local` or browser code. Generate an encryption key with `openssl rand -base64 32`.
4. Set `APP_URL` to the public frontend origin. Set `CANVAS_ALLOWED_HOSTS` to the exact comma-separated Canvas hostnames approved for this deployment; arbitrary Canvas hosts are rejected.
5. Deploy `oauth-start`, `oauth-callback`, `oauth-disconnect`, `account-delete`, `record-presence`, `moderator-activity`, `moderator-delete-user`, and `moderator-send-password-reset` with the Supabase CLI.

Required Edge Function secrets:

```text
APP_URL=https://your-public-site.example
OAUTH_ENCRYPTION_KEY=<base64-encoded random 32-byte key>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
CANVAS_CLIENT_ID=...
CANVAS_CLIENT_SECRET=...
CANVAS_ALLOWED_HOSTS=canvas.yourschool.edu
```

Configure Google Cloud OAuth consent, enable Drive and Calendar APIs, and request the scopes used by the app. Reading all Drive files uses the restricted `drive.readonly` scope and may require Google's verification and a security assessment. Configure the Microsoft Entra web app with delegated read-only Microsoft Graph permissions `Mail.Read`, `Calendars.Read`, `Files.Read`, and `Notes.Read`, plus `User.Read`; school tenants may require administrator consent. Obtain a Canvas Developer Key from each institution and restrict it to the required read-only endpoints. Canvas domains must be included in `CANVAS_ALLOWED_HOSTS`.

Deploy the functions individually:

```sh
supabase functions deploy oauth-start
supabase functions deploy oauth-callback
supabase functions deploy oauth-disconnect
supabase functions deploy account-delete
supabase functions deploy record-presence
supabase functions deploy moderator-activity
supabase functions deploy moderator-delete-user
supabase functions deploy moderator-send-password-reset
```

Official setup references: [Google Drive scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [Microsoft Graph permissions](https://learn.microsoft.com/graph/permissions-reference), [Canvas OAuth overview](https://developerdocs.instructure.com/services/canvas/oauth2), and [Canvas developer keys](https://developerdocs.instructure.com/services/canvas/oauth2/file.developer_keys).

## Letting anyone use the website

The simplest public deployment is Vercel with this repository kept private. A public website does not require publishing its source code.

1. Push the finished project to the `UniversityHub` GitHub repository. In Vercel, choose **Add New → Project**, import `srp6118/UniversityHub`, keep the root directory as `/`, select Vite, set the build command to `npm run build`, and the output directory to `dist`.
2. Before deploying, add these two **Vercel project environment variables** from Supabase **Project Settings → API**: `VITE_SUPABASE_URL` (Project URL) and `VITE_SUPABASE_ANON_KEY` (the public anon/publishable key). Never use `service_role` or any secret key in Vercel's `VITE_` variables. Deploy, then copy the public `https://…vercel.app` address.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to that Vercel address. Add the exact production origin and `https://your-site.vercel.app/**` to **Redirect URLs**; keep `http://localhost:5173/**` for local development. Replace the example hostname with the real one.
4. In Supabase **Authentication → Providers → Email**, allow sign-ups and require email confirmation. Configure custom SMTP. In **Authentication → Email Templates → Reset Password**, include both `{{ .Token }}` and a clickable `{{ .ConfirmationURL }}` link for the in-app verification-code and moderator-sent link flows.
5. From the project folder, use the Supabase CLI to apply every migration in filename order and deploy the account-management functions:

   ```sh
   npx supabase login
   npx supabase link --project-ref palmtswiqmajkjfskymi
   npx supabase db push
   npx supabase functions deploy account-delete
   npx supabase functions deploy record-presence
   npx supabase functions deploy moderator-activity
   npx supabase functions deploy moderator-delete-user
   npx supabase functions deploy moderator-send-password-reset
   ```

   Complete Supabase sign-in and enter any database password directly into its trusted prompt—never paste passwords, access tokens, or secret keys into a chat. Set the Supabase Edge Function secret `APP_URL` to the exact public Vercel origin. Deploy OAuth functions and configure Google/Microsoft/Canvas provider secrets only if you intend to offer those connectors; those are not required for accounts and profile settings.
6. Test the public URL on a phone or private/incognito browser: create a test account, confirm its email, sign in, open Profile & settings, and verify password recovery. Check moderator-only features with a moderator account. Enable CAPTCHA and suitable auth rate limits before sharing the link widely.

With email sign-ups enabled, anyone with the deployed URL can register and use their own private workspace. Row-level security separates member data. Keep the GitHub repository private if desired, and do not promote accounts to moderator unless you trust the account owner.
