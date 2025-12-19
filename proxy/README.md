# Dead Letters - Gemini API Proxy

A secure Cloudflare Worker proxy for the Gemini API. This keeps your API key safe by storing it on Cloudflare's servers instead of in your app.

## Why Use a Proxy?

When you embed an API key directly in your app:
- Anyone can extract it from the app binary
- They can use your key and rack up charges
- You can't revoke access without updating the app

With this proxy:
- Your API key stays on Cloudflare's secure servers
- The app only knows the proxy URL (which is useless without the key)
- You can add rate limiting, authentication, and monitoring
- You can rotate the key anytime without updating the app

## Setup Guide (5 minutes)

### Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)
2. Node.js installed on your computer
3. Your Gemini API key from [AI Studio](https://aistudio.google.com/)

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This opens a browser to authenticate.

### Step 3: Deploy the Worker

From the `proxy/` directory:

```bash
cd proxy
npm install
wrangler deploy
```

You'll see output like:
```
Published dead-letters-api (1.0.0)
  https://dead-letters-api.YOUR_SUBDOMAIN.workers.dev
```

**Save this URL** - you'll need it for your app.

### Step 4: Add Your API Key as a Secret

```bash
wrangler secret put GEMINI_API_KEY
```

When prompted, paste your Gemini API key. It's stored encrypted and never visible again.

### Step 5: (Optional) Add App Authentication

For extra security, create a secret token that your app must send:

```bash
wrangler secret put APP_TOKEN
```

Enter a random string (e.g., generate with `openssl rand -hex 32`).

### Step 6: Configure Your App

Edit your `.env` file in the main project:

```bash
# Production mode - uses the secure proxy
GEMINI_PROXY_URL=https://dead-letters-api.YOUR_SUBDOMAIN.workers.dev

# If you set up APP_TOKEN, add it here too
APP_TOKEN=your_random_token_here
```

### Step 7: Rebuild Your App

```bash
npx expo start --clear
```

## Testing the Proxy

You can test your proxy with curl:

```bash
curl -X POST https://dead-letters-api.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello"}],
    "model": "gemini-3-flash-preview",
    "maxTokens": 100
  }'
```

## Monitoring

View real-time logs:

```bash
wrangler tail
```

## Rate Limiting

The proxy includes built-in rate limiting:
- 30 requests per minute per IP address
- Automatic retry headers for rate-limited requests

You can adjust these in `index.js`:

```javascript
const RATE_LIMIT = 30;        // requests per window
const RATE_WINDOW_MS = 60000; // 1 minute
```

## Updating the Proxy

After making changes to `index.js`:

```bash
wrangler deploy
```

## Costs

- **Cloudflare Workers Free Tier**: 100,000 requests/day
- **Gemini API**: Standard Gemini pricing applies

For most games, the free tier is more than sufficient.

## Troubleshooting

### "Server configuration error"
Your GEMINI_API_KEY secret isn't set. Run:
```bash
wrangler secret put GEMINI_API_KEY
```

### "Unauthorized"
Your APP_TOKEN doesn't match. Make sure it's the same in:
1. Cloudflare secrets: `wrangler secret put APP_TOKEN`
2. Your app's `.env` file: `APP_TOKEN=...`

### Rate limit errors
Either:
- Your IP is making too many requests (wait a minute)
- Gemini's rate limit (check your API quota)

### CORS errors
The proxy allows all origins by default. If you want to restrict it, modify the `corsHeaders` function in `index.js`.
