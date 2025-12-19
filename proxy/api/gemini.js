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

export default async function handler(req, res) {
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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (isRateLimited(clientIP)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfter: 60,
    });
  }

  // Optional app token auth
  if (process.env.APP_TOKEN) {
    const appToken = req.headers['x-app-token'];
    if (appToken !== process.env.APP_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const body = req.body;

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    const model = body.model || 'gemini-3-flash-preview';
    const isGemini3 = model.includes('gemini-3');

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
        maxOutputTokens: body.maxTokens ?? 32768,
        topP: isGemini3 ? undefined : (body.topP ?? 0.95),
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    // Add thinking config for Gemini 3 models ONLY when NOT using structured output
    // Thinking mode consumes tokens that would otherwise be used for response content
    if (isGemini3 && !body.responseSchema) {
      geminiBody.generationConfig.thinkingConfig = {
        thinkingBudget: body.thinkingBudget ?? 2048,
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

    // Call Gemini
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', geminiResponse.status, errorText);

      if (geminiResponse.status === 429) {
        return res.status(429).json({ error: 'API rate limit exceeded', retryAfter: 60 });
      }
      if (geminiResponse.status === 403) {
        return res.status(503).json({ error: 'API quota exceeded' });
      }
      return res.status(502).json({ error: 'Failed to generate content' });
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({
      success: true,
      content,
      usage: {
        promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
        completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
      },
      finishReason: geminiData.candidates?.[0]?.finishReason || 'STOP',
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
