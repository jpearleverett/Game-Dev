# Dead Letters - Gemini API Proxy

Vercel Edge Function that securely proxies requests to Google Gemini API.

## Features

- Secure API key storage in Vercel environment variables
- True streaming with SSE heartbeats
- Cached content creation and generation support
- Thought signature handling for Gemini 3
- Rate limiting and request validation

## Deployment

1. Deploy to Vercel:
   ```bash
   cd proxy
   vercel
   ```

2. Set environment variables in Vercel dashboard:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `APP_TOKEN` (optional): Token for app authentication

3. Update your app's `.env`:
   ```
   GEMINI_PROXY_URL=https://your-deployment.vercel.app/api/gemini
   ```

## Files

- `api/gemini.js` - Vercel Edge Function handler
- `vercel.json` - Vercel configuration
- `package.json` - Dependencies
