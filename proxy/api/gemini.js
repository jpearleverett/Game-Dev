/**
 * Dead Letters - Gemini API Proxy (Vercel Serverless Function)
 *
 * Securely proxies requests to Google Gemini API.
 * The API key is stored in Vercel's environment variables.
 *
 * Uses streaming with heartbeats to prevent mobile network timeouts.
 * Mobile networks often kill idle connections after 30-40 seconds,
 * but Gemini's "thinking" phase can take 20-60 seconds.
 * Heartbeats keep the connection alive during generation.
 */

// Simple in-memory rate limiting (resets on cold start, which is fine)
const rateLimitStore = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

// Heartbeat interval - send every 10 seconds to prevent mobile timeout
// More aggressive than 15s to handle flaky mobile networks
const HEARTBEAT_INTERVAL_MS = 10000;

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

  // Check if client wants streaming (to prevent mobile timeouts)
  const useStreaming = req.body?.stream !== false; // Default to streaming

  try {
    const body = req.body;

    // ========== CACHE CREATION REQUEST ==========
    if (body.operation === 'createCache') {
      console.log(`[${requestId}] Cache creation request: ${body.cacheKey}`);

      const { cacheKey, model, systemInstruction, content, ttl } = body;

      if (!model || !systemInstruction || !content) {
        return res.status(400).json({
          error: 'Missing required cache parameters (model, systemInstruction, content)',
          requestId
        });
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1alpha/cachedContents?key=${process.env.GEMINI_API_KEY}`;

      const cacheResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: content }],
            },
          ],
          ttl: ttl || '3600s',
          display_name: cacheKey,
        }),
      });

      if (!cacheResponse.ok) {
        const errorText = await cacheResponse.text();
        console.error(`[${requestId}] Cache creation failed: ${cacheResponse.status} - ${errorText.substring(0, 200)}`);
        return res.status(cacheResponse.status).json({
          error: 'Cache creation failed',
          requestId,
          details: errorText.substring(0, 200),
        });
      }

      const cache = await cacheResponse.json();
      console.log(`[${requestId}] Cache created: ${cache.name}, tokens: ${cache.usageMetadata?.totalTokenCount || 'unknown'}`);

      return res.status(200).json({
        success: true,
        cache: {
          name: cache.name,
          expireTime: cache.expireTime,
          createTime: cache.createTime,
          updateTime: cache.updateTime,
          usageMetadata: cache.usageMetadata,
        },
        requestId,
      });
    }

    // ========== GENERATION REQUEST ==========
    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.warn(`[${requestId}] Invalid request: missing messages`);
      return res.status(400).json({ error: 'Missing or invalid messages array', requestId });
    }

    const model = body.model || 'gemini-3-flash-preview';
    const isGemini3 = model.includes('gemini-3');
    const hasSchema = !!body.responseSchema;
    const cachedContent = body.cachedContent; // Optional cache reference

    // Log incoming request details
    console.log(`[${requestId}] Request: model=${model}, messages=${body.messages.length}, hasSchema=${hasSchema}, isGemini3=${isGemini3}, streaming=${useStreaming}, cached=${!!cachedContent}`);

    // Build Gemini request
    // Use v1alpha for caching support, v1beta for regular requests
    const apiVersion = cachedContent ? 'v1alpha' : 'v1beta';
    const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiBody = {
      contents: body.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        // Gemini 3 requires temperature=1.0, others use provided value
        temperature: isGemini3 ? 1.0 : (body.temperature ?? 0.7),
        // Only set maxOutputTokens if explicitly provided (not null/undefined)
        // Otherwise let Gemini use its default (8192) based on prompt word count targets
        ...(body.maxTokens && { maxOutputTokens: body.maxTokens }),
        ...((!isGemini3 && body.topP) && { topP: body.topP }),
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
      // Add cached content reference if provided (must be snake_case for Gemini API)
      ...(cachedContent && { cached_content: cachedContent }),
    };

    // Add thinking config for Gemini 3 models - produces better quality output
    // Medium level balances quality with speed/cost
    if (isGemini3) {
      geminiBody.generationConfig.thinkingConfig = {
        thinkingLevel: body.thinkingLevel ?? 'medium',
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

    // If streaming is enabled, set up NDJSON streaming with heartbeats
    if (useStreaming) {
      // Set headers for newline-delimited JSON streaming
      res.setHeader('Content-Type', 'application/x-ndjson');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present

      // Force headers to be sent immediately to establish the stream
      res.flushHeaders();

      // Start heartbeat timer to keep mobile connection alive
      let heartbeatCount = 0;

      // Send initial heartbeat immediately to confirm stream is working
      const sendHeartbeat = () => {
        heartbeatCount++;
        const heartbeat = JSON.stringify({
          type: 'heartbeat',
          seq: heartbeatCount,
          elapsed: Date.now() - startTime
        }) + '\n';
        res.write(heartbeat);
      };

      // Send first heartbeat immediately
      sendHeartbeat();
      console.log(`[${requestId}] Heartbeat streaming active`);

      // Then send heartbeats every 10 seconds
      const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

      try {
        // Call Gemini with timing
        const geminiStartTime = Date.now();
        console.log(`[${requestId}] Calling Gemini API (with heartbeats)...`);

        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        });

        const geminiDuration = Date.now() - geminiStartTime;

        // Stop heartbeats - we have a response
        clearInterval(heartbeatTimer);

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(`[${requestId}] Gemini error after ${geminiDuration}ms: status=${geminiResponse.status}, body=${errorText.substring(0, 500)}`);

          const errorResponse = JSON.stringify({
            type: 'error',
            error: geminiResponse.status === 429 ? 'API rate limit exceeded' :
                   geminiResponse.status === 403 ? 'API quota exceeded' :
                   'Failed to generate content',
            requestId,
            geminiStatus: geminiResponse.status,
            details: errorText.substring(0, 200),
          }) + '\n';
          res.write(errorResponse);
          return res.end();
        }

        const geminiData = await geminiResponse.json();
        const finishReason = geminiData.candidates?.[0]?.finishReason || 'UNKNOWN';
        const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const contentLength = content.length;

        const usage = geminiData.usageMetadata || {};

        // Only warn on problematic finish reasons
        if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
          console.warn(`[${requestId}] Response truncated (${finishReason})`);
        }

        if (finishReason === 'SAFETY') {
          console.error(`[${requestId}] Content blocked by safety filters`);
          const safetyError = JSON.stringify({
            type: 'error',
            error: 'Content blocked by safety filters',
            requestId,
            finishReason,
          }) + '\n';
          res.write(safetyError);
          return res.end();
        }

        // Validate content for schema responses
        let jsonValid = true;
        if (hasSchema && contentLength > 0) {
          try {
            JSON.parse(content);
          } catch (parseErr) {
            jsonValid = false;
            console.warn(`[${requestId}] JSON parse failed - client will repair: ${parseErr.message}`);
          }
        }

        const totalDuration = Date.now() - startTime;
        const cachedTokens = usage.cachedContentTokenCount || 0;
        console.log(`[${requestId}] Complete: ${geminiDuration}ms, ${contentLength} chars, ${heartbeatCount} heartbeats${cachedTokens > 0 ? ` (${cachedTokens} cached tokens)` : ''}${!jsonValid ? ' (JSON needs repair)' : ''}`);

        // Send the final response
        const finalResponse = JSON.stringify({
          type: 'response',
          success: true,
          content,
          usage: {
            promptTokens: usage.promptTokenCount || 0,
            cachedTokens: cachedTokens,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
          },
          finishReason,
          requestId,
          timing: {
            total: totalDuration,
            gemini: geminiDuration,
          },
        }) + '\n';
        res.write(finalResponse);
        return res.end();

      } catch (error) {
        clearInterval(heartbeatTimer);
        const totalDuration = Date.now() - startTime;
        console.error(`[${requestId}] Proxy error after ${totalDuration}ms:`, error.message, error.stack);

        const errorResponse = JSON.stringify({
          type: 'error',
          error: 'Internal server error',
          requestId,
          details: error.message,
        }) + '\n';
        res.write(errorResponse);
        return res.end();
      }
    }

    // Non-streaming fallback (original behavior)
    const geminiStartTime = Date.now();
    console.log(`[${requestId}] Calling Gemini API (non-streaming)...`);

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

    const usage = geminiData.usageMetadata || {};

    // Only warn on problematic finish reasons
    if (finishReason === 'MAX_TOKENS' || finishReason === 'LENGTH') {
      console.warn(`[${requestId}] Response truncated (${finishReason})`);
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
    let jsonValid = true;
    if (hasSchema && contentLength > 0) {
      try {
        JSON.parse(content);
      } catch (parseErr) {
        jsonValid = false;
        console.warn(`[${requestId}] JSON parse failed - client will repair: ${parseErr.message}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    const cachedTokens = usage.cachedContentTokenCount || 0;
    console.log(`[${requestId}] Complete: ${geminiDuration}ms, ${contentLength} chars${cachedTokens > 0 ? ` (${cachedTokens} cached tokens)` : ''}${!jsonValid ? ' (JSON needs repair)' : ''}`);

    return res.status(200).json({
      success: true,
      content,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        cachedTokens: cachedTokens,
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
