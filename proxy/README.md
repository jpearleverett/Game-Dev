# Dead Letters - Gemini API Proxy

A secure serverless proxy for the Gemini API. Keeps your API key safe by storing it on the server instead of in your app.

## Choose Your Platform

- **[Vercel](#vercel-setup)** - Easiest, deploy from browser
- **[Cloudflare Workers](#cloudflare-setup)** - Also easy, 100k free requests/day

---

## Vercel Setup

### Step 1: Create a GitHub repo for the proxy

1. Go to https://github.com/new
2. Name it `dead-letters-proxy`
3. Make it **Private**
4. Click **Create repository**

### Step 2: Upload the proxy files

On the GitHub repo page, click **"uploading an existing file"** and upload these files from the `proxy/` folder:
- `api/gemini.js`
- `vercel.json`
- `package.json`

Or use the GitHub web interface to create them:

**api/gemini.js** - Copy contents from `proxy/api/gemini.js`
**vercel.json** - Copy contents from `proxy/vercel.json`

### Step 3: Deploy to Vercel

1. Go to https://vercel.com and sign up with GitHub
2. Click **"Add New Project"**
3. Import your `dead-letters-proxy` repo
4. Click **Deploy** (default settings are fine)

### Step 4: Add your API key

1. In Vercel, go to your project's **Settings** → **Environment Variables**
2. Add:
   - Name: `GEMINI_API_KEY`
   - Value: *your Gemini API key*
3. Click **Save**
4. Go to **Deployments** and click **Redeploy** (or push a change)

### Step 5: Get your URL

Your proxy URL will be:
```
https://YOUR-PROJECT-NAME.vercel.app/api/gemini
```

### Step 6: Update your game's .env

```
GEMINI_PROXY_URL=https://YOUR-PROJECT-NAME.vercel.app/api/gemini
```

### Step 7: Test it

```bash
curl -X POST "https://YOUR-PROJECT-NAME.vercel.app/api/gemini" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello"}],"maxTokens":50}'
```

---

## Cloudflare Setup

### Step 1: Sign up

Go to https://dash.cloudflare.com and create an account.

### Step 2: Create Worker

1. Click **Workers & Pages** → **Create** → **Create Worker**
2. Name it `dead-letters-api`
3. Click **Deploy**

### Step 3: Add the code

1. Click **Edit Code**
2. Delete default code
3. Paste contents of `index.js`
4. Click **Deploy**

### Step 4: Add API key

1. Go to **Settings** → **Variables and Secrets**
2. Add secret: `GEMINI_API_KEY` = your key
3. Click **Save and Deploy**

### Step 5: Get URL

Your URL: `https://dead-letters-api.YOUR_SUBDOMAIN.workers.dev`

---

## Security Features

| Feature | Included |
|---------|----------|
| API key encrypted on server | ✅ |
| Rate limiting (30/min/IP) | ✅ |
| Optional app token auth | ✅ |
| CORS headers | ✅ |
| Error handling | ✅ |

## Optional: App Token

For extra security, add an `APP_TOKEN` environment variable on your hosting platform, then add the same token to your game's `.env`:

```
APP_TOKEN=some_random_secret_string
```

This ensures only your app can use the proxy.

## Costs

- **Vercel Free**: 100GB bandwidth/month
- **Cloudflare Free**: 100,000 requests/day
- **Gemini**: Standard pricing
