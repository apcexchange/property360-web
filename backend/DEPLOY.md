# Backend deployment runbook

The backend runs on **Render Starter** ($7/mo) at `api.property360.africa`. GitHub auto-deploys on push to `main`. Configuration is captured in [render.yaml](../render.yaml) (Infrastructure-as-Code), so the service can be rebuilt from scratch at any time.

## Architecture

| Concern | Choice | Why |
|---|---|---|
| Hosting | Render Starter, region `frankfurt` | Closest Render region to Lagos; no idle sleep; native Socket.IO. |
| Database | MongoDB Atlas (separate `property360_prod` db) | Already managed; isolation from dev. |
| File storage | Cloudinary | Survives ephemeral disk; CDN-served. |
| Email | Resend (domain `property360.africa`) | Verified, DKIM-signed, free up to 3k/mo. |
| SMS | Twilio Verify | Existing setup. |
| Payments | Paystack live keys | Nigerian market, KYC-approved account. |
| TLS | Render-managed (Let's Encrypt) | Auto-renewed. |
| Cron | Single in-process node-cron at 1 AM | Single instance — do not scale to multiple. |

## One-time setup

### 1. Create Render service from blueprint

1. Sign in at https://dashboard.render.com.
2. **New +** → **Blueprint**.
3. Connect your GitHub repo. Select the branch `main`.
4. Render reads [render.yaml](../render.yaml) and provisions the `property360-api` service. Most config (region, plan, build/start commands, health check) is preset.
5. Click **Create Resources**. The first build will fail until you set the secret env vars (next step).

### 2. Set secret environment variables in Render dashboard

Service → **Environment** → add each of these. Source values from your password manager / vendor dashboards:

| Var | Source |
|---|---|
| `MONGODB_URI` | Atlas → Connect → Drivers. Use a **separate** db name like `property360_prod`. |
| `JWT_SECRET` | Generate locally: `openssl rand -hex 64` |
| `TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN` / `_VERIFY_SERVICE_SID` / `_PHONE_NUMBER` | Twilio console |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | `Property360 <support@property360.africa>` (literal value) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Cloudinary console |
| `DOCUSEAL_API_KEY` / `_API_URL` / `_WEBHOOK_SECRET` | DocuSeal account settings |
| `PAYSTACK_SECRET_KEY` | **Live key** (`sk_live_...`) — Paystack dashboard, after KYC |
| `PAYSTACK_PUBLIC_KEY` | **Live key** (`pk_live_...`) |
| `PAYSTACK_CALLBACK_URL` | `property360://payment/callback` (literal — deep link to mobile app) |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack → Settings → Webhooks → set this and copy |
| `GOOGLE_CLOUD_PROJECT_ID` / `_DOCUMENT_AI_PROCESSOR_ID` / `_DOCUMENT_AI_LOCATION` | GCP console |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/gcloud.json` (literal — points to the secret file uploaded next) |

[backend/.env.prod.example](.env.prod.example) lists every required var with hints.

### 3. Upload Google Document AI service-account JSON

Render dashboard → service → **Secret Files** → **Add Secret File**:
- Filename: `gcloud.json`
- Mount path: `/etc/secrets/gcloud.json`
- Contents: paste the full JSON from your Google Cloud service-account key

The `GOOGLE_APPLICATION_CREDENTIALS` env var (set above) tells the SDK where to find this.

### 4. MongoDB Atlas — allow Render's outbound IPs

Render Starter does not have stable static outbound IPs. Two options:

- **Quick**: Atlas → Network Access → add `0.0.0.0/0` (any IP). Fine if your cluster credentials are strong, MFA is on, and the user has minimal db perms. Acceptable for MVP.
- **Strict**: upgrade to Render's Pro tier or add a Render Static IP add-on, then allowlist that IP only. Defer until traffic justifies.

### 5. Trigger first deploy

After secrets are set, click **Manual Deploy** → **Deploy latest commit**. Watch the **Logs** tab. First build is ~5 min (npm install + tsc).

Success looks like the boot banner:

```
╔═══════════════════════════════════════════════════════════╗
║                    Property360 API                        ║
║  Environment: production                                  ║
║  Port: 10000                                              ║  ← Render assigns dynamically
║  API: /api/v1                                             ║
║  Socket.IO: Enabled                                       ║
╚═══════════════════════════════════════════════════════════╝
```

Sanity check via the public Render URL (something like `https://property360-api.onrender.com`):
```bash
curl https://property360-api.onrender.com/health
# → {"success":true,"message":"Property360 API is running","timestamp":"..."}
```

### 6. Custom domain at api.property360.africa

**In Render** (service → Settings → Custom Domains → Add):
- Add `api.property360.africa`. Render shows a CNAME target like `property360-api.onrender.com`.

**In Namecheap** (Domain List → property360.africa → Manage → Advanced DNS → Add New Record):
- Type: `CNAME Record`
- Host: `api`
- Value: the Render-provided target (e.g. `property360-api.onrender.com`)
- TTL: Automatic

Save. Wait 5–30 min for propagation, then click **Verify** in Render. Render auto-issues a Let's Encrypt cert. Final test:

```bash
curl https://api.property360.africa/health
```

## Going live: switch mobile to the production URL

[mobile/app.config.ts](../mobile/app.config.ts) already references `https://api.property360.africa/api/v1` for the production variant. Once `/health` responds at that URL, the next mobile production build will hit the real backend automatically.

## Day-to-day operations

| Action | How |
|---|---|
| Deploy a fix | `git push origin main` — Render auto-deploys (autoDeploy: true in render.yaml). |
| Roll back | Render dashboard → Deploys → pick previous successful deploy → **Redeploy**. |
| View logs | Service → Logs (live tail). |
| Rotate JWT_SECRET | Update in dashboard → Save → Render restarts the service. **All existing user sessions invalidate** (they'll need to log in again). |
| Tail Mongo | Atlas dashboard → Metrics + Real-Time. |
| Add an env var | Dashboard → Environment → Add → save. Render restarts the service automatically. |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Build succeeds, runtime crashes immediately | Missing env var (config falls back to default which fails at runtime) | Compare dashboard env vars to [.env.prod.example](.env.prod.example) — spot the gap |
| Mongo connection timeout | IP not allowlisted in Atlas | Atlas → Network Access → 0.0.0.0/0 (or static IP add-on) |
| Webhooks fail with 401 | Webhook secret mismatch between Paystack/DocuSeal dashboard and Render env var | Re-copy the secret from the vendor dashboard, paste into Render |
| Cron fires twice in one day | You scaled to >1 instance | Scale back to 1 — node-cron runs in-process and isn't safe for multi-instance |
| Daily 1 AM cron fires at the wrong time | Render runs in UTC; "1 AM" means 1 AM UTC = 2 AM Lagos (WAT is UTC+1) | Either accept the offset or change the cron schedule in [src/server.ts](src/server.ts) |
| Sockets disconnect every 60s | Render's free tier sleep — this should not happen on Starter; verify plan | Dashboard → Settings → confirm plan = Starter |
| Static `/uploads` URLs 404 | Files served from local disk that got wiped on deploy | All uploads should be Cloudinary URLs in production. Check [CloudinaryService.ts](src/services/CloudinaryService.ts) is being called for the affected route. |

## Future improvements (not blocking launch)

- Add Sentry for error tracking (one `Sentry.init()` call + DSN env var)
- Move to multi-instance once cron is extracted to a job queue (BullMQ or Agenda)
- Tighten CORS once the web frontend's URL is final
- Add Render Static IP for Mongo allowlisting
- Add Cloudflare in front for DDoS / caching when traffic warrants
