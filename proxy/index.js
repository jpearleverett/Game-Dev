/**
 * Dead Letters - Gemini API Proxy
 *
 * Cloudflare Worker that securely proxies requests to Google Gemini API.
 * The API key is stored in Cloudflare's encrypted secrets, never exposed to clients.
 *
 * Features:
 * - Secure API key storage
 * - Rate limiting per IP
 * - Request validation
 * - CORS support for your app
 */

// Rate limiting: max requests per IP per minute
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

// In-memory rate limit store (resets on worker restart, which is fine for basic protection)
const rateLimitStore = new Map();

/**
 * Check if request is rate limited
 */
function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

/**
 * Create CORS headers
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight
 */
function handleOptions(request) {
  const origin = request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/**
 * Validate the request has required fields
 */
function validateRequest(body) {
  if (!body.messages || !Array.isArray(body.messages)) {
    return { valid: false, error: 'Missing or invalid messages array' };
  }

  if (body.messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }

  return { valid: true };
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Check rate limit
    if (isRateLimited(clientIP)) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait before making more requests.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Optional: Validate app token (add extra security layer)
    const appToken = request.headers.get('X-App-Token');
    if (env.APP_TOKEN && appToken !== env.APP_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // Check for API key in secrets
    if (!env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY secret not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    try {
      // Parse request body
      const body = await request.json();

      // Validate request
      const validation = validateRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: validation.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      // Build Gemini API request
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${body.model || 'gemini-3-flash-preview'}:generateContent?key=${env.GEMINI_API_KEY}`;

      // Transform messages to Gemini format
      const geminiBody = {
        contents: body.messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: body.temperature ?? 0.7,
          maxOutputTokens: body.maxTokens ?? 8192,
          topP: body.topP ?? 0.95,
        },
      };

      // Add system instruction if provided
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

      // Add safety settings
      geminiBody.safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ];

      // Make request to Gemini
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiBody),
      });

      // Handle Gemini errors
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API error:', geminiResponse.status, errorText);

        // Map Gemini errors to appropriate responses
        if (geminiResponse.status === 429) {
          return new Response(JSON.stringify({
            error: 'API rate limit exceeded. Please try again later.',
            retryAfter: 60,
          }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
          });
        }

        if (geminiResponse.status === 403) {
          return new Response(JSON.stringify({
            error: 'API quota exceeded or invalid API key.',
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
          });
        }

        return new Response(JSON.stringify({
          error: 'Failed to generate content. Please try again.',
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }

      // Parse and return Gemini response
      const geminiData = await geminiResponse.json();

      // Extract the text content
      const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Return in a standardized format
      const origin = request.headers.get('Origin');
      return new Response(JSON.stringify({
        success: true,
        content: content,
        usage: {
          promptTokens: geminiData.usageMetadata?.promptTokenCount || 0,
          completionTokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: geminiData.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: geminiData.candidates?.[0]?.finishReason || 'STOP',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });

    } catch (error) {
      console.error('Proxy error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }
  },
};
