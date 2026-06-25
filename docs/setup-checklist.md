# Setup Checklist

## Supabase

1. Run [supabase/schema.sql](/Users/apple/Desktop/Project Baby/binda/supabase/schema.sql:1) in the SQL editor.
2. Run [supabase/seed.sql](/Users/apple/Desktop/Project Baby/binda/supabase/seed.sql:1) for sample data.
3. Create auth users that match the seeded profile UUIDs or replace the seeded UUIDs with real user IDs.
4. Confirm the Data API exposes the `public` schema tables you need.
5. Add the environment values from [.env.example](/Users/apple/Desktop/Project Baby/binda/.env.example:1).

## WhatsApp

1. Configure the webhook verification token and app secret.
2. Point the Meta webhook to `GET/POST /api/whatsapp/webhook`.
3. Build the actual WhatsApp Flow JSON using the request fields documented in [docs/whatsapp-flows.md](/Users/apple/Desktop/Project Baby/binda/docs/whatsapp-flows.md:1).

## Scheduling

1. Protect `POST /api/jobs/summaries` with `CRON_SECRET`.
2. Schedule daily reminder and summary jobs from Supabase Cron or another scheduler.
3. Add a second weekly summary job for Sundays.
