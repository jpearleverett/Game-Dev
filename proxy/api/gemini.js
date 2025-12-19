/**
 * Dead Letters - Gemini API Proxy (Vercel Serverless Function)
 *
 * Securely proxies requests to Google Gemini API.
 * The API key is stored in Vercel's environment variables.
 */

// Simple in-memory rate limiting (resets on cold start, which is fine)
const rateLimitStore = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

// Generate a simple request ID for tracing
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

export default async function handler(req, res) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Token');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', requestId });
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (isRateLimited(clientIP)) {
    console.warn(`[${requestId}] Rate limited: ${clientIP}`);
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfter: 60,
      requestId,
    });
  }

  // Optional app token auth
  if (process.env.APP_TOKEN) {
    const appToken = req.headers['x-app-token'];
    if (appToken !== process.env.APP_TOKEN) {
      console.warn(`[${requestId}] Unauthorized request`);
      return res.status(401).json({ error: 'Unauthorized', requestId });
    }
  }

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error(`[${requestId}] GEMINI_API_KEY not configured`);
    return res.status(500).json({ error: 'Server configuration error', requestId });
  }

  try {
    const body = req.body;

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.warn(`[${requestId}] Invalid request: missing messages`);
      return res.status(400).json({ error: 'Missing or invalid messages array', requestId });
    }

    const model = body.model || 'gemini-3-flash-preview';
    const isGemini3 = model.includes('gemini-3');
    const hasSchema = !!body.responseSchema;

    // Log incoming request details
    console.log(`[${requestId}] Request: model=${model}, messages=${body.messages.length}, hasSchema=${hasSchema}, isGemini3=${isGemini3}`);

    // Build Gemini request
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiBody = {
      contents: body.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        // Gemini 3 requires temperature=1.0, others use provided value
        temperature: isGemini3 ? 1.0 : (body.temperature ?? 0.7),
        // Don't set maxOutputTokens - let Gemini use its default (8192 for most models)
        // This prevents truncation of complex story content with decision structures
        ...((!isGemini3 && body.topP) && { topP: body.topP }),
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    // Add thinking config for Gemini 3 models - produces better quality output
    if (isGemini3) {
      geminiBody.generationConfig.thinkingConfig = {
        thinkingLevel: body.thinkingLevel ?? 'high',
      };
    }

    // Add system instruction
    if (body.systemPrompt) {
      geminiBody.systemInstruction = {
        parts: [{ text: body.systemPrompt }],
      };
    }

    // Add response schema for structured output
    if (body.responseSchema) {
      geminiBody.generationConfig.responseMimeType = 'application/json';
      geminiBody.generationConfig.responseSchema = body.responseSchema;
    }

    // Call Gemini with timing
    const geminiStartTime = Date.now();
    console.log(`[${requestId}] Calling Gemini API...`);

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    const geminiDuration = Date.now() - geminiStartTime;

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[${requestId}] Gemini error after ${geminiDuration}ms: status=${geminiResponse.status}, body=${errorText.substring(0, 500)}`);

      if (geminiResponse.status === 429) {
        return res.status(429).json({
          error: 'API rate limit exceeded',
          retryAfter: 60,
          requestId,
          geminiStatus: 429,
        });
      }
      if (geminiResponse.status === 403) {
        return res.status(503).json({
          error: 'API quota exceeded',
          requestId,
          geminiStatus: 403,
        });
      }
      return res.status(502).json({
        error: 'Failed to generate content',
        requestId,
        geminiStatus: geminiResponse.status,
        details: errorText.substring(0, 200),
      });
    }

    const geminiData = await geminiResponse.json();
    const finishReason = geminiData.candidates?.[0]?.finishReason || 'UNKNOWN';
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const contentLength = content.length;

    // Log response details
    const usage = geminiData.usageMetadata || {};
    console.log(`[${requestId}] Gemini response after ${geminiDuration}ms: finishReason=${finishReason}, contentLength=${contentLength}, promptTokens=${usage.promptTokenCount || 0}, completionTokens=${usage.candidatesTokenCount || 0}`);

    // Check for problematic finish reasons
    if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
      console.warn(`[${requestId}] WARNING: Response may be truncated (finishReason=${finishReason})`);
    }

    if (finishReason === 'SAFETY') {
      console.error(`[${requestId}] Content blocked by safety filters`);
      return res.status(400).json({
        error: 'Content blocked by safety filters',
        requestId,
        finishReason,
      });
    }

    // Validate content for schema responses
    if (hasSchema && contentLength > 0) {
      try {
        JSON.parse(content);
        console.log(`[${requestId}] JSON validation: OK`);
      } catch (parseErr) {
        console.warn(`[${requestId}] JSON validation: FAILED - ${parseErr.message}`);
        // Still return the content - client will handle repair
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] Request complete in ${totalDuration}ms (Gemini: ${geminiDuration}ms)`);

    return res.status(200).json({
      success: true,
      content,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
      },
      finishReason,
      requestId,
      timing: {
        total: totalDuration,
        gemini: geminiDuration,
      },
    });

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Proxy error after ${totalDuration}ms:`, error.message, error.stack);
    return res.status(500).json({
      error: 'Internal server error',
      requestId,
      details: error.message,
    });
  }
}
