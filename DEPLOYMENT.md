# Deployment Guide: Vercel (Frontend) & Render (Backend)

This guide walks you through deploying **Hearth Family Document System** with the frontend on **Vercel** and the backend API on **Render**.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          Vercel (Frontend)             │
                      │     https://your-app.vercel.app        │
                      └──────────────────┬─────────────────────┘
                                         │
                        HTTPS API Calls  │ (Bearer Token / Cookie)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │          Render (Backend API)          │
                      │   https://your-api.onrender.com/api    │
                      └───────┬────────────────────┬───────────┘
                              │                    │
                              ▼                    ▼
                    ┌──────────────────┐  ┌──────────────────┐
                    │  MongoDB Atlas   │  │    Cloudinary    │
                    │  (Cloud Database)│  │ (Secure Storage) │
                    └──────────────────┘  └──────────────────┘
```

---

## Pre-requisites Checklist

1. **GitHub Repository**: Push your code to GitHub (`https://github.com/<your-username>/document-remember`).
2. **MongoDB Atlas**:
   - In Atlas -> **Network Access**, ensure `0.0.0.0/0` (Allow access from anywhere) is added so Render's cloud containers can connect.
   - In Atlas -> **Database Access**, create a database user and keep your connection string ready.
3. **Cloudinary**:
   - Go to your Cloudinary dashboard to grab your **Cloud Name**, **API Key**, and **API Secret**.
4. **Vercel & Render accounts**:
   - Sign up at [vercel.com](https://vercel.com) and [render.com](https://render.com).

---

## Step 1: Deploy Backend on Render

You can deploy on Render in two ways: **Option A (Automatic Blueprint)** or **Option B (Manual Web Service)**.

### Option A: Automatic Blueprint (Recommended)
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository `document-remember`.
4. Render will detect `render.yaml`.
5. Fill in the prompted environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `CLIENT_ORIGIN`: Your Vercel frontend URL (e.g., `https://your-app.vercel.app` — you can update this after Vercel gives you your URL).
   - `APP_URL`: Same as `CLIENT_ORIGIN` (e.g., `https://your-app.vercel.app`).
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
   - `SMTP_*` variables (optional or fill with your email SMTP provider).
6. Click **Apply**. Render will generate `JWT_SECRET` automatically and deploy your backend!

---

### Option B: Manual Web Service Setup
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and pick your repo.
3. Configure the following service settings:
   - **Name**: `document-remember-api` (or any name you like)
   - **Region**: Choose the closest to your users (e.g., Oregon, Frankfurt, Singapore)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Expand **Advanced** -> Add **Health Check Path**: `/api/health`
5. In the **Environment Variables** section, add:

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Port provided by Render |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/hearth?retryWrites=true&w=majority` | Atlas connection string |
| `JWT_SECRET` | *(At least 32 random characters)* | Token signing secret |
| `CLIENT_ORIGIN` | `https://your-app.vercel.app` | Vercel domain (supports comma-separated list) |
| `APP_URL` | `https://your-app.vercel.app` | Used for email invitation and reset links |
| `COOKIE_NAME` | `family_session` | Session cookie name |
| `DEFAULT_TIMEZONE`| `Asia/Kolkata` | Default time zone |
| `MAX_UPLOAD_MB` | `15` | Max upload size in MB |
| `CLOUDINARY_CLOUD_NAME` | *your-cloud-name* | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | *your-api-key* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *your-api-secret* | Cloudinary API secret |
| `SMTP_HOST` | *(Optional, e.g. smtp.gmail.com or sendgrid)* | SMTP Server |
| `SMTP_PORT` | `587` | SMTP Port |
| `SMTP_SECURE` | `false` | TLS |
| `SMTP_USER` | *(Optional)* | SMTP User / Email |
| `SMTP_PASSWORD` | *(Optional)* | SMTP App Password |
| `EMAIL_FROM` | `Hearth Documents <no-reply@example.com>` | Sender header |

6. Click **Create Web Service**.
7. Once deployed, Render will provide your public backend URL, e.g.:
   `https://document-remember-api.onrender.com`
8. Verify it works by visiting `https://document-remember-api.onrender.com/api/health` in your browser. It should return:
   ```json
   {"status":"ok","service":"hearth-api"}
   ```

---

## Step 2: Deploy Frontend on Vercel

1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository `document-remember`.
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client` (or leave as `./` if preferred — both are supported with included `vercel.json`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Key | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://document-remember-api.onrender.com` | Your Render backend URL (no trailing slash) |

6. Click **Deploy**.
7. Once the build finishes, Vercel gives you your frontend URL (e.g. `https://document-remember.vercel.app`).

---

## Step 3: Link Frontend & Backend

Now that Vercel has assigned your frontend domain:
1. Go back to your **Render Web Service** dashboard -> **Environment**.
2. Update:
   - `CLIENT_ORIGIN`: `https://document-remember.vercel.app`
   - `APP_URL`: `https://document-remember.vercel.app`
3. Click **Save Changes**. Render will automatically redeploy with the updated CORS origin.

---

## What makes this setup production-ready?

- **SPA Rewrites**: Pre-configured `vercel.json` ensures direct URL navigation and page reloads (e.g. `/dashboard`, `/documents`) will never return 404.
- **Dual Authentication**: Works with both `HttpOnly` Secure SameSite=None cookies and JWT `Authorization: Bearer <token>` in local storage, eliminating cross-site cookie restrictions between `vercel.app` and `onrender.com`.
- **Render Reverse Proxy (`trust proxy`)**: Configured `trust proxy` prevents rate-limiting and secure cookie issues behind Render's cloud load balancer.
- **Dynamic CORS**: Automatically allows your configured frontend origin, custom domains, and any `*.vercel.app` preview branches.
- **Cloud Storage**: Cloudinary private asset management persists document uploads independently of Render's container lifecycle.

---

## Troubleshooting

### 1. Render Free Tier Cold Starts
- **Behavior**: On Render's free tier, backend instances spin down if idle for 15 minutes. The first request after sleep can take ~30-50 seconds to wake up.
- **Resolution**: Subsequent requests will be fast. You can keep it awake with a periodic uptime monitor (such as UptimeRobot or Cron-job.org pointing to `/api/health`).

### 2. MongoDB Atlas Connection Timeout
- Ensure your MongoDB Atlas cluster has `0.0.0.0/0` in **Network Access**.
- Ensure special characters in database passwords are URL encoded.

### 3. File Uploads
- Supported formats: PDF, JPG, PNG, WebP up to 15 MB.
- Ensure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are properly set in Render environment variables.
