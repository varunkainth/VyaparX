# Cloudflare Edge Worker

This Worker now uses a safer routing model:

1. Read traffic is balanced across the configured read origins.
2. Write and mutation traffic is sent to a single primary write origin.
3. Email-related routes are forced to Render.
4. A cron pings `/health` every 5 minutes on all configured origins.

## Why this is safer

Balancing all API traffic across many origins is risky for auth and writes.

This setup is safer because:

- `GET` / `HEAD` / `OPTIONS` requests are spread across the read pool
- `POST` / `PATCH` / `PUT` / `DELETE` requests go to one write primary
- email flows stay on Render where SMTP is expected to work

## Config

- `ORIGIN_1` to `ORIGIN_4`: all backend deployments you want available
- `READ_ORIGINS`: comma-separated list used for read balancing
- `WRITE_ORIGIN`: the single primary write backend
- `EMAIL_ORIGIN`: the backend that should handle email routes
- `HEALTH_PATH`: health check path, usually `/health`

## Current defaults

- Railway is the write primary
- Render is the email origin
- read balancing can include Railway, Render, and two future extra origins

## Email-routed endpoints

- `/auth/signup`
- `/api/v1/auth/forgot-password`
- `/api/v1/auth/send-verification-email`
- `/api/v1/auth/resend-verification-email`
- `/api/v1/businesses/:business_id/invoices/:invoice_id/email`
- `/api/v1/businesses/:business_id/members/invite`
- `/api/v1/email/test`
- `/api/v1/email/status`

## Deploy

```bash
wrangler deploy --config cloudflare/wrangler.toml
```

## Important requirement

All origins must still use:

- the same database
- the same JWT secrets
- the same passkey config
- the same backend version / migrations

Otherwise even read balancing will become unreliable.
