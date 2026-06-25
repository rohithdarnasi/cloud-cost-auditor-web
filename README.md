# ☁️ Cloud Cost Auditor — Web App

A React + Vercel serverless web app that scans AWS accounts for cost waste.
Live demo works instantly with **mock data** (no account needed), or connect
real read-only AWS credentials to scan an actual account.

**Checks:** unattached EBS volumes · unused Elastic IPs · idle EC2 instances · stale snapshots

---

## Deploy to Vercel (free) — step by step

### Step 1 — Push this folder to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create a new repo — e.g. `cloud-cost-auditor-web` — leave it empty (no README)
3. In your terminal, inside this folder:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cloud-cost-auditor-web.git
git push -u origin main
```

---

### Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up / log in with GitHub
2. Click **"Add New Project"**
3. Import your `cloud-cost-auditor-web` repo
4. Vercel auto-detects Vite. Confirm these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **Deploy**

That's it. Vercel automatically handles the `/api` folder as serverless functions.

---

### Step 3 — Verify it works

Once deployed (takes ~60 seconds):

1. Open your Vercel URL (e.g. `https://cloud-cost-auditor-web.vercel.app`)
2. Click **"Try with mock data"** → **"Run mock scan"**
3. You should see the findings dashboard with sample results

---

### Step 4 — Test real AWS mode (optional)

To test with a real AWS account:

**Create a read-only IAM user:**

1. AWS Console → IAM → Users → Create user
2. Attach a custom inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:DescribeVolumes",
      "ec2:DescribeAddresses",
      "ec2:DescribeInstances",
      "ec2:DescribeSnapshots",
      "cloudwatch:GetMetricStatistics"
    ],
    "Resource": "*"
  }]
}
```

3. Create an Access Key for the user (Security credentials tab)
4. Paste the key into the site's "Real AWS" mode form
5. Select a region and scan

> **Security note:** credentials are sent over HTTPS to the Vercel serverless
> function, used for a single API call, and never written to disk, logs, or
> any database. Delete the IAM user after testing if you prefer.

---

## Run locally

```bash
npm install
npm run dev          # React frontend on http://localhost:5173
```

For the `/api` route locally you need the Vercel CLI:

```bash
npm install -g vercel
vercel dev           # runs both frontend + serverless functions on http://localhost:3000
```

---

## Architecture

```
Browser (React/Vite)
  │
  ├─ Mock mode:  runs checks entirely client-side (no network calls)
  │
  └─ Real mode:  POST /api/audit  →  Vercel Serverless Function (Node.js)
                                          │
                                          └─ AWS SDK v3  →  AWS APIs
```

**Why a serverless function for real mode?**
AWS SDK calls can't be made directly from the browser — AWS blocks them with
CORS. The Vercel function acts as a thin proxy: it receives credentials in the
request body, makes the AWS calls server-side, and returns the findings. The
function is stateless (no DB, no storage) so credentials are never persisted.

**Mock mode is fully client-side** — it runs the same check logic in the
browser against hardcoded fixture data, so the mock scan works even if the
serverless function is broken or you're working offline.

---

## What interviewers ask about this project

| Question | Good answer |
|---|---|
| Why Vercel? | Free tier, zero-config deploys from GitHub, native serverless functions — ideal for a portfolio project with a backend component |
| Why not call AWS directly from the browser? | AWS blocks browser-originated SDK calls with CORS — the serverless function is a stateless proxy that keeps credentials server-side |
| How are credentials protected? | HTTPS in transit, never written to any storage, Vercel functions have no persistent disk, function exits after the single request |
| What would you add in v2? | Multi-region scan, CSV export, real AWS Price List API for accurate costs, scheduled scans with email digest |
| Why both mock and real mode? | Mock lets anyone demo the tool immediately without an AWS account — important for a portfolio project. Also useful for local dev without burning AWS API calls |
