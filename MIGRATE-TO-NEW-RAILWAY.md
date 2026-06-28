# Deploy Enoch & Enoch Legal to a NEW Railway account

Use this guide when moving to a **different Railway account** (new login, new project).
The site is one Node/Express service: public pages, blog API, analytics, and admin dashboard.

> **Your blog posts and messages are safe.** They live in **MongoDB Atlas**, not on Railway.
> Point the new Railway service at the **same `MONGODB_URI`** and every existing post,
> contact message, and image link stays live. A new Railway account does **not** delete
> or move your database — it only hosts the app code.

---

## Admin access (how it works on the live site)

There is **no admin link** in the navigation (by design).

1. On **any public page** (Home, About, Practice, Blog, Contact), **tap/click the screen 10 times quickly** (within ~1.2 seconds between taps).
2. A **password gate** appears on the current page — enter the 450-digit access code.
3. After a correct code, you are taken to **`/admin`** — the full dashboard (posts, messages, live analytics).

You can also go directly to `/admin` if you know the URL — the password is still required.

Set `ADMIN_PASSWORD` in Railway Variables to override the default access code.

---

## 1. (Optional) Back up your content first

```bash
cd enochlegal
npm install
MONGODB_URI="your-current-mongodb-uri" node scripts/export-data.js
```

This writes `backup/posts.json` and `backup/messages.json`.

---

## 2. Push code to GitHub

```bash
cd enochlegal
git add .
git commit -m "Upgrade: multi-page site, SEO, live analytics, admin gate"
git remote remove origin 2>/dev/null   # only if switching remotes
git remote add origin https://github.com/YOUR_USERNAME/enochlegal.git
git branch -M main
git push -u origin main
```

---

## 3. Create the project on the NEW Railway account

**Important:** Log out of any old Railway account and log into the **new** one first.

**Option A — Dashboard**
1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `enochlegal`. Railway detects Node via `railway.json` and runs `node server.js`
3. Health check: `/health`

**Option B — CLI**
```bash
npm i -g @railway/cli
railway logout && railway login    # ensure you're on the NEW account
railway init
railway up
```

Your **old** Railway deploys (other projects, other accounts) are untouched — this only creates a new service for enochlegal.

---

## 4. Environment variables (new Railway project → Variables)

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | **Yes** | **Same Atlas URI as before** → all posts & messages preserved |
| `CLOUDINARY_CLOUD_NAME` | for uploads | from cloudinary.com |
| `CLOUDINARY_API_KEY` | for uploads | |
| `CLOUDINARY_API_SECRET` | for uploads | |
| `EMAIL_USER` | optional | Gmail for contact notifications |
| `EMAIL_PASS` | optional | Gmail App Password |
| `ADMIN_PASSWORD` | optional | overrides the 450-digit access code |

Do **not** set `PORT` — Railway sets it automatically.

MongoDB Atlas → **Network Access** → allow `0.0.0.0/0` so Railway can connect.

---

## 5. Generate domain & verify

Railway → **Settings** → **Networking** → **Generate Domain**

Check:
- `/` — home + welcome screen
- `/about` · `/practice` · `/blog.html` · `/contact`
- `/health` — `{"status":"ok","database":"connected"}`
- `/robots.txt` · `/sitemap.xml`
- 10 taps on home → password gate → `/admin` dashboard

Everything is **host-aware** — no hard-coded URLs. Same code works on the Railway subdomain or a custom domain.

---

## 6. Custom domain (when ready)

Railway → **Settings** → **Networking** → **Custom Domain** → add `enochlegal.com` (and `www`).
Point DNS to the CNAME Railway shows. No code changes needed.

---

## What stays the same after switching Railway accounts

| Item | Location | Action |
|---|---|---|
| Blog posts | MongoDB Atlas | Use same `MONGODB_URI` |
| Contact messages | MongoDB Atlas | Use same `MONGODB_URI` |
| Cloudinary images | Cloudinary | Same Cloudinary env vars |
| Other Railway projects | Old account | Unaffected — separate projects |
| Admin access code | Code or `ADMIN_PASSWORD` env | Same unless you rotate it |

---

## Upgrade summary

- **Multi-page**: Home, About, Practice, Blog, Contact — each with clean URLs
- **Welcome screen** on home (once per session)
- **SEO**: meta, Open Graph, JSON-LD, image sitemap (Precious Enoch photo indexed)
- **Live admin analytics**: viewers now, totals, time-on-site, top pages
- **Hidden admin**: 10 taps → password gate → `/admin`
- **Security**: token-guarded admin mutations; public read + contact only
