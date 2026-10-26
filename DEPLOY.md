# Deploying AICTE CMS to Free Cloud Hosting
### Step-by-Step Production Deployment Guide (PostgreSQL on Neon + Web Service on Render)

This guide walks you through deploying the **AICTE Integrated Institution Complaint Monitoring & Status Portal** to a 100% free production environment using:
1. **Neon** (or Supabase) for serverless PostgreSQL
2. **Render** (or Railway) for Node.js Express backend + React frontend single-service deployment

---

## Architecture Overview

```
                      +---------------------------------------+
                      |             End User                  |
                      +---------------------------------------+
                                          |
                                          v  HTTPS
                      +---------------------------------------+
                      |         Render Web Service            |
                      |   - Serves React SPA (client/dist)    |
                      |   - Runs Node.js / Express 5 API      |
                      |   - Broadcasts Server-Sent Events     |
                      +---------------------------------------+
                                          |
                                          v  SSL / TLS
                      +---------------------------------------+
                      |      Neon Serverless PostgreSQL       |
                      |   - Tables, indexes, WAL transactions |
                      |   - Auto-scales / auto-sleeps         |
                      +---------------------------------------+
```

---

## Step 1: Provision Free Serverless PostgreSQL on Neon

1. Navigate to **[https://neon.tech](https://neon.tech)** and sign up for a free account (GitHub or Google login).
2. Click **Create Project**:
   - **Project Name**: `aicte-cms-db`
   - **Postgres Version**: 16 (default)
   - **Region**: Choose the closest region (e.g. `AWS - ap-southeast-1` or `eu-central-1`)
3. Once created, Neon displays your **Connection Details**:
   - Ensure the dropdown is set to **Pooled connection** or **Direct connection**.
   - Copy the connection string. It will look like:
     ```text
     postgresql://neondb_owner:npg_xY12AbCdEf@ep-silent-smoke-a2bx7.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```
   - Keep this string safe; this is your `DATABASE_URL`.

---

## Step 2: Seed the Remote PostgreSQL Database

You can seed your remote database directly from your local terminal before deploying:

```bash
# In your local project directory (d:\aicte-dashboard):
# Set the DATABASE_URL environment variable in your terminal
# PowerShell:
$env:DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-1234.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Run the seed script:
node server/db/seed.js
```
The script will initialize all tables, indexes, 63 institutions, and 254 cases on your live Neon PostgreSQL database!

---

## Step 3: Deploy Application to Render (Free Tier)

1. Push your project to a GitHub repository:
   ```bash
   git add .
   git commit -m "Production release: AICTE CMS"
   git push origin main
   ```
2. Navigate to **[https://render.com](https://render.com)** and sign in.
3. Click **New +** $\rightarrow$ **Web Service**.
4. Connect your GitHub repository.
5. Configure the deployment settings:
   - **Name**: `aicte-cms-portal` (or your preferred name)
   - **Region**: Same geographical region as your Neon database (e.g. `Singapore` or `Frankfurt`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repository root)
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
     *(This installs root and server dependencies and compiles the Vite React production bundle into `client/dist`)*
   - **Start Command**:
     ```bash
     node server/index.js
     ```
   - **Instance Type**: `Free` ($0/month)

6. Configure **Environment Variables** in Render's dashboard:
   Click **Add Environment Variable** for each:

   | Variable Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security and optimizations |
   | `PORT` | `10000` | Port automatically assigned by Render |
   | `JWT_SECRET` | *(Generate a 64-char string)* | e.g. `9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b` |
   | `DATABASE_URL` | `postgresql://neondb_owner:YOUR_PASSWORD@ep-sample...` | Your Neon database connection string |

7. Click **Create Web Service**.
   Render will pull the code, install dependencies, compile the React frontend, and start the Express server.

---

## Step 4: Verify Deployment

Once Render finishes the build (usually ~2 minutes), your service URL will be live at:
`https://aicte-cms-portal.onrender.com`

1. **Verify Health Endpoint**:
   Navigate to `https://aicte-cms-portal.onrender.com/api/health`
   You should see:
   ```json
   {
     "status": "ONLINE",
     "service": "AICTE Integrated Complaint Monitoring Service",
     "version": "1.0.0-PROD",
     "database_engine": "postgres",
     "environment": "production"
   }
   ```
2. **Login to Test**:
   Open `https://aicte-cms-portal.onrender.com/login` and use 1-click test chips:
   - **Senior Management**: `admin_mgmt` / `aicte@2026`
   - **Regulation Bureau**: `rb_director` / `aicte@2026`

---

## ⚠️ Important Free-Tier Operational Notes

1. **Render Free Tier Spin-Down**:
   - Render's free tier web services automatically sleep after **15 minutes of inactivity**.
   - When a new request arrives, it takes **30–50 seconds** to perform a cold start. Subsequent requests are fast (< 100ms).
   - *Tip*: You can set up a free uptime monitor (such as [UptimeRobot](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org)) pinging `https://your-app.onrender.com/api/health` every 10 minutes to prevent cold starts during evaluation!
2. **Neon Free Tier Auto-Suspend**:
   - Neon databases automatically compute-suspend when inactive for 5 minutes.
   - Upon a new SQL query, Neon auto-resumes in approximately **500ms–1s**.
3. **Local Offline Demo Guarantee**:
   - If internet access drops during an in-person evaluation, simply launch the app locally without `DATABASE_URL`:
     ```bash
     cd d:\aicte-dashboard
     node server/index.js
     ```
     The portal immediately defaults to local SQLite persistence (`server/data/aicte_cms.db`) with zero internet dependency!
