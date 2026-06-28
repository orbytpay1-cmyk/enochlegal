# Deploy Enoch & Enoch Legal

## Recommended stack

| Platform | Role | Works for this site? |
|---|---|---|
| **GitHub** | Source code | ✅ Yes — push here first |
| **Railway** | Node.js + Express + MongoDB API | ✅ **Yes — use this to go live** |
| **Netlify** | Static sites & serverless | ❌ **No** — this app needs a always-on Node server |
| **MongoDB Atlas** | Database (posts, messages, analytics) | ✅ Already hosting your data |

This project is one Express app (`server.js`) that serves the website, blog API, admin dashboard, and analytics. **Netlify cannot run that** without rewriting the entire backend into serverless functions.

**Use Railway** (new account) connected to GitHub — see [MIGRATE-TO-NEW-RAILWAY.md](./MIGRATE-TO-NEW-RAILWAY.md).

---

## Step 1 — GitHub (done after first push)

Repo: `https://github.com/orbytpay1-cmyk/enochlegal`

```bash
git push origin main
```

---

## Step 2 — Railway (live site)

1. Log into your **new** Railway account → **New Project** → **Deploy from GitHub repo**
2. Select `orbytpay1-cmyk/enochlegal`
3. Add variables (minimum):

   | Variable | Value |
   |---|---|
   | `MONGODB_URI` | Your Atlas connection string (same as before) |
   | `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | |
   | `CLOUDINARY_API_SECRET` | |
   | `ADMIN_PASSWORD` | Optional — your 450-digit access code |

4. **Settings → Networking → Generate Domain**
5. Verify `/health` shows `"database":"connected"`

Every future `git push origin main` auto-deploys if Railway is linked to the repo.

---

## Step 3 — Custom domain (optional)

Railway → **Settings → Networking → Custom Domain** → add `enochlegal.com`.

No code changes needed — URLs are host-aware.

---

## Admin access on the live site

1. Tap/click anywhere on the site **10 times quickly**
2. Enter the access code in the gate that appears
3. Full dashboard opens at `/admin`

---

## Why not Netlify?

Netlify excels at static sites (HTML/CSS/JS) and short-lived serverless functions. This site needs:

- Persistent MongoDB connections
- File uploads (Multer → Cloudinary)
- Long-running Express routes (`/api/*`, `/admin`, analytics beacon)
- Session token store in memory

Railway (or Render, Fly.io) runs `node server.js` continuously — that's what this codebase expects.

If you ever want Netlify for **marketing-only static pages**, you'd split frontend and API across two domains and rewrite all API calls — not recommended for this project.
