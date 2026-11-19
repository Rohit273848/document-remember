# Hearth — Family Document & Renewal Reminder System

Hearth is a full-stack family document library built with React, Vite, Tailwind CSS, Express, Mongoose, MongoDB Atlas, Cloudinary, Nodemailer and `node-cron`. It uses family-scoped roles, private document delivery, renewal history and scheduled reminders.

## What’s included

- Email/password registration, login, logout, password reset, protected routes and hashed passwords.
- Family workspaces, invitations, role changes, a single Backup Person and backend membership checks.
- Six built-in document categories, private uploads, metadata search/filtering, secure temporary file links, archive history and replacement versions.
- Dashboard totals and charts from MongoDB, upcoming/expired views, activity log, notification center and reminder history.
- Configurable 180/90/30/7/1/0 day reminder milestones. Reminder dates are stored using the family time zone, and a unique key protects each document/date/milestone/recipient combination.
- A 15-minute scheduled reminder worker with in-app notices and optional SMTP email delivery.
- Joi request validation, file size/type/signature checks, Helmet, rate limits, strict CORS, Mongo operator sanitization, HttpOnly JWT cookies and MongoDB transactions.

## Requirements

- Node.js 20 or newer and npm 10 or newer.
- A MongoDB Atlas cluster. Atlas is the only application database; its replica-set deployment supports the transactions used for related changes.
- A Cloudinary account for private document uploads and signed downloads.
- An SMTP account for invitation, reset-password and email reminder delivery.

## Configure services

1. Copy `.env.example` to `.env` in the project root.
2. In MongoDB Atlas, create a database user and database, allow the deployment host’s IP address, and put the Atlas connection URI in `MONGODB_URI`. Keep the database password URL-encoded if it contains reserved characters.
3. Generate a long random value for `JWT_SECRET` (at least 32 characters). Set `CLIENT_ORIGIN` and `APP_URL` to the browser address used for this deployment.
4. In Cloudinary, create an API key and set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. The server uploads images as authenticated image assets and PDFs as authenticated raw assets. It returns five-minute signed download links only after checking family access.
5. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `EMAIL_FROM` for your mail provider. Until SMTP is configured, password reset emails and automated email reminders cannot be sent. Family invitations can still be created and their private links copied by a Family Keeper.
6. Choose the family reminder time zone with `DEFAULT_TIMEZONE`. Each new family starts with that zone and its Keeper can change it later.

The `.env.example` file lists every setting. No service credentials are committed to the repository. Without MongoDB Atlas, Cloudinary or SMTP credentials the application can be built and its pure unit tests can run, but those external flows cannot be exercised end to end.

## Install and run

From the project root:

```powershell
npm install
Copy-Item .env.example .env
# Edit .env and add your Atlas, JWT, Cloudinary and SMTP settings.
npm run dev
```

The API runs on `http://localhost:4000` and the Vite app runs on `http://localhost:5173`. Vite forwards `/api` calls to Express. Use `npm run dev:server` and `npm run dev:client` to start either side separately.

Run `npm run dev` once to start both services together. If you prefer separate terminals, run `npm run dev:server` and `npm run dev:client` instead; do not run both startup options at the same time. If the API reports that port 4000 is already in use, stop the earlier API process with Ctrl+C in its terminal before starting it again.

For a production frontend build, run `npm run build`. To run the server’s unit tests, run `npm test`. Start only the API with `npm start` after building the client separately.

## Database indexes

Schema indexes cover unique user emails, one membership record per family/user, document family/owner/date lookups, unique version numbers, reminder de-duplication and notification de-duplication. Before first production use, run:

```powershell
npm run indexes
```

This creates declared indexes without dropping other indexes. It uses the `MONGODB_URI` from `.env`.

## Roles and access

- **Family Keeper** creates the workspace, invites people, changes roles and manages family documents.
- **Document Owner** can see documents assigned to them and submit renewal updates for those documents.
- **Backup Person** can help manage the family library and monitor deadlines.

Roles are stored for each family membership. Every document, reminder, invitation, notification and activity request is checked against the signed-in user and active family membership on the server. The client does not supply authoritative owner or family permissions.

## Reminder behavior

The scheduler runs every 15 minutes and creates notifications/reminder delivery records in MongoDB. It schedules reminders at 9:00 AM in the family time zone. Passports and visas receive a six-month reminder by default; other appointment-based items can enable the same advance milestone in their settings. Expiry changes cancel pending reminders and create new ones while keeping sent history. A unique database index and atomic worker claim make schedule processing idempotent across repeated runs.

In-app delivery works without SMTP. Reminder records track overall delivery plus email and in-app channel status. Email and password reset flows become active when valid SMTP settings are supplied.

## REST API overview

All JSON API routes start with `/api`. Authentication is held in an HttpOnly cookie.

| Area | Routes |
|---|---|
| Auth | `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me` |
| Profile | `/users/profile`, `/users/change-password` |
| Families | `/families`, `/families/:familyId`, family members and invitations |
| Invitations | `/invitations`, `/invitations/:token/accept`, `/invitations/:token/reject` |
| Documents | `/documents`, `/documents/:id`, `/documents/:id/download`, `/documents/:id/versions`, `/documents/:id/renew`, `/documents/upcoming`, `/documents/expired` |
| Dashboard | `/dashboard/summary`, `/dashboard/category-stats`, `/dashboard/status-stats`, `/dashboard/upcoming-renewals`, `/dashboard/renewal-trends`, `/dashboard/recent-activity` |
| Reminders | `/reminders`, `/reminders/upcoming`, `/reminders/:id/mark-read` |
| Notifications and activity | `/notifications`, `/notifications/:id/read`, `/notifications/read-all`, `/activity` |

## Verification

`npm test` checks date-only parsing, local-time reminder scheduling (including a daylight-saving boundary) and expiry classification. `npm run build` compiles the responsive frontend. End-to-end authentication, MongoDB persistence, Cloudinary file delivery and SMTP delivery require valid service credentials and should be exercised against a configured Atlas test database and test mail account.
