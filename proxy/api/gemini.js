/**
 * Dead Letters - Gemini API Proxy (Vercel Edge Function)
 *
 * Securely proxies requests to Google Gemini API.
 * The API key is stored in Vercel's environment variables.
 *
 * Uses Edge Runtime for TRUE streaming support - responses are not buffered.
 * This prevents the 60-second "time to first byte" timeout that occurs
 * with Node.js serverless functions.
 *
 * Heartbeats keep mobile connections alive during Gemini's "thinking" phase.
 */

// Edge Runtime - use BOTH syntaxes for maximum compatibility
export const runtime = 'edge';
export const preferredRegion = 'auto';
export const config = {
  runtime: 'edge',
  supportsResponseStreaming: true,
};

// Heartbeat interval - send every 10 seconds to prevent mobile timeout
const HEARTBEAT_INTERVAL_MS = 10000;

// Timeout for the Gemini API call
const GEMINI_FETCH_TIMEOUT_MS = 270000;

// Simple in-memory rate limiting (resets on cold start)
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

function generateRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

export default async function handler(request) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed', requestId },
      { status: 405, headers: corsHeaders }
    );
  }

  // Rate limiting
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (isRateLimited(clientIP)) {
    console.warn(`[${requestId}] Rate limited: ${clientIP}`);
    return Response.json(
      { error: 'Rate limit exceeded. Please wait before making more requests.', retryAfter: 60, requestId },
      { status: 429, headers: corsHeaders }
    );
  }

  // Optional app token auth
  const appToken = process.env.APP_TOKEN;
  if (appToken) {
    const providedToken = request.headers.get('x-app-token');
    if (providedToken !== appToken) {
      console.warn(`[${requestId}] Unauthorized request`);
      return Response.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: corsHeaders }
      );
    }
  }

  // Check for API key
  if (!process.env.GEMINI_API_KEY) {
    console.error(`[${requestId}] GEMINI_API_KEY not configured`);
    return Response.json(
      { error: 'Server configuration error', requestId },
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();

    // ========== CACHE CREATION REQUEST ==========
    if (body.operation === 'createCache') {
      console.log(`[${requestId}] Cache creation request: ${body.cacheKey}`);

      const { cacheKey, model, systemInstruction, content, ttl } = body;

      if (!model || !systemInstruction || !content) {
        return Response.json(
          { error: 'Missing required cache parameters (model, systemInstruction, content)', requestId },
          { status: 400, headers: corsHeaders }
        );
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1alpha/cachedContents?key=${process.env.GEMINI_API_KEY}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);

      try {
        const cacheResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: content }] }],
            ttl: ttl || '3600s',
            display_name: cacheKey,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!cacheResponse.ok) {
          const errorText = await cacheResponse.text();
          console.error(`[${requestId}] Cache creation failed: ${cacheResponse.status} - ${errorText.substring(0, 200)}`);
          return Response.json(
            { error: 'Cache creation failed', requestId, details: errorText.substring(0, 200) },
            { status: cacheResponse.status, headers: corsHeaders }
          );
        }

        const cache = await cacheResponse.json();
        console.log(`[${requestId}] Cache created: ${cache.name}, tokens: ${cache.usageMetadata?.totalTokenCount || 'unknown'}`);

        return Response.json({
          success: true,
          cache: {
            name: cache.name,
            expireTime: cache.expireTime,
            createTime: cache.createTime,
            updateTime: cache.updateTime,
            usageMetadata: cache.usageMetadata,
          },
          requestId,
        }, { headers: corsHeaders });

      } catch (error) {
        clearTimeout(timeoutId);
        const isTimeout = error.name === 'AbortError';
        console.error(`[${requestId}] Cache creation error: ${error.message}`);
        return Response.json(
          { error: isTimeout ? 'Cache creation timed out' : 'Cache creation failed', requestId, details: error.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ========== GENERATION REQUEST ==========
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.warn(`[${requestId}] Invalid request: missing messages`);
      return Response.json(
        { error: 'Missing or invalid messages array', requestId },
        { status: 400, headers: corsHeaders }
      );
    }

    const model = body.model || 'gemini-3-flash-preview';
    const isGemini3 = model.includes('gemini-3');
    const hasSchema = !!body.responseSchema;
    const cachedContent = body.cachedContent;
    const useStreaming = body.stream !== false;

    console.log(`[${requestId}] Request: model=${model}, messages=${body.messages.length}, hasSchema=${hasSchema}, streaming=${useStreaming}, cached=${!!cachedContent}`);

    // Build Gemini request
    const apiVersion = cachedContent ? 'v1alpha' : 'v1beta';
    const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiBody = {
      contents: body.messages.map(msg => {
        // Build part with optional thought signature for reasoning continuity (Gemini 3)
        const part = { text: msg.content };
        if (msg.thoughtSignature) {
          part.thoughtSignature = msg.thoughtSignature;
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [part],
        };
      }),
      generationConfig: {
        temperature: isGemini3 ? 1.0 : (body.temperature ?? 0.7),
        ...(body.maxTokens && { maxOutputTokens: body.maxTokens }),
        ...((!isGemini3 && body.topP) && { topP: body.topP }),
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
      ...(cachedContent && { cached_content: cachedContent }),
    };

    if (isGemini3) {
      geminiBody.generationConfig.thinkingConfig = {
        // Default to 'high' for story generation - latency-tolerant, quality-critical
        // Client can override with body.thinkingLevel if needed
        thinkingLevel: body.thinkingLevel ?? 'high',
      };
    }

    if (body.systemPrompt) {
      geminiBody.systemInstruction = { parts: [{ text: body.systemPrompt }] };
    }

    if (body.responseSchema) {
      geminiBody.generationConfig.responseMimeType = 'application/json';
      geminiBody.generationConfig.responseSchema = body.responseSchema;
    }

    // ========== STREAMING RESPONSE WITH TRUE EDGE STREAMING ==========
    if (useStreaming) {
      // Create a TransformStream for writing heartbeats and response
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      let heartbeatCount = 0;
      let heartbeatTimer = null;
      let geminiController = null;
      let geminiTimeoutId = null;

      const sendHeartbeat = async () => {
        heartbeatCount++;
        // SSE format: "data: {...}\n\n"
        const heartbeat = `data: ${JSON.stringify({
          type: 'heartbeat',
          seq: heartbeatCount,
          elapsed: Date.now() - startTime
        })}\n\n`;
        try {
          await writer.write(encoder.encode(heartbeat));
          console.log(`[${requestId}] Heartbeat ${heartbeatCount} sent`);
        } catch (e) {
          console.warn(`[${requestId}] Failed to send heartbeat: ${e.message}`);
        }
      };

      const cleanup = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (geminiTimeoutId) {
          clearTimeout(geminiTimeoutId);
          geminiTimeoutId = null;
        }
      };

      // Start async operation (don't await - let it run in background)
      (async () => {
        try {
          // Send first heartbeat immediately - THIS WILL REACH CLIENT IMMEDIATELY (Edge Runtime!)
          await sendHeartbeat();
          console.log(`[${requestId}] Heartbeat streaming active (Edge Runtime - no buffering)`);

          // Then send heartbeats every 10 seconds
          heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

          // Call Gemini
          const geminiStartTime = Date.now();
          console.log(`[${requestId}] Calling Gemini API...`);

          geminiController = new AbortController();
          geminiTimeoutId = setTimeout(() => {
            console.error(`[${requestId}] Gemini API timeout after ${GEMINI_FETCH_TIMEOUT_MS / 1000}s`);
            geminiController.abort();
          }, GEMINI_FETCH_TIMEOUT_MS);

          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
            signal: geminiController.signal,
          });

          clearTimeout(geminiTimeoutId);
          geminiTimeoutId = null;

          const geminiDuration = Date.now() - geminiStartTime;
          cleanup();

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error(`[${requestId}] Gemini error after ${geminiDuration}ms: ${geminiResponse.status}`);

            // SSE format: "data: {...}\n\n"
            const errorResponse = `data: ${JSON.stringify({
              type: 'error',
              error: geminiResponse.status === 429 ? 'API rate limit exceeded' :
                     geminiResponse.status === 403 ? 'API quota exceeded' : 'Failed to generate content',
              requestId,
              geminiStatus: geminiResponse.status,
              details: errorText.substring(0, 200),
            })}\n\n`;
            await writer.write(encoder.encode(errorResponse));
            await writer.close();
            return;
          }

          const geminiData = await geminiResponse.json();
          const finishReason = geminiData.candidates?.[0]?.finishReason || 'UNKNOWN';
          const contentPart = geminiData.candidates?.[0]?.content?.parts?.[0] || {};
          const content = contentPart.text || '';
          // Capture thought signature for multi-call reasoning continuity (Gemini 3)
          const thoughtSignature = contentPart.thoughtSignature || null;
          const usage = geminiData.usageMetadata || {};

          if (finishReason === 'SAFETY') {
            console.error(`[${requestId}] Content blocked by safety filters`);
            // SSE format: "data: {...}\n\n"
            const safetyError = `data: ${JSON.stringify({
              type: 'error',
              error: 'Content blocked by safety filters',
              requestId,
              finishReason,
            })}\n\n`;
            await writer.write(encoder.encode(safetyError));
            await writer.close();
            return;
          }

          const totalDuration = Date.now() - startTime;
          const cachedTokens = usage.cachedContentTokenCount || 0;
          console.log(`[${requestId}] Complete: ${geminiDuration}ms, ${content.length} chars, ${heartbeatCount} heartbeats${cachedTokens > 0 ? ` (${cachedTokens} cached)` : ''}`);

          // Send the final response in SSE format: "data: {...}\n\n"
          const finalResponse = `data: ${JSON.stringify({
            type: 'response',
            success: true,
            content,
            // Include thought signature for multi-call reasoning continuity (Gemini 3)
            ...(thoughtSignature && { thoughtSignature }),
            usage: {
              promptTokens: usage.promptTokenCount || 0,
              cachedTokens: cachedTokens,
              completionTokens: usage.candidatesTokenCount || 0,
              totalTokens: usage.totalTokenCount || 0,
            },
            finishReason,
            requestId,
            timing: { total: totalDuration, gemini: geminiDuration },
          })}\n\n`;
          await writer.write(encoder.encode(finalResponse));
          await writer.close();

        } catch (error) {
          cleanup();
          const totalDuration = Date.now() - startTime;
          const isTimeout = error.name === 'AbortError';
          const errorMessage = isTimeout
            ? `Gemini API timed out after ${GEMINI_FETCH_TIMEOUT_MS / 1000}s`
            : 'Internal server error';

          console.error(`[${requestId}] Error after ${totalDuration}ms: ${error.message}`);

          try {
            // SSE format: "data: {...}\n\n"
            const errorResponse = `data: ${JSON.stringify({
              type: 'error',
              error: errorMessage,
              requestId,
              details: error.message,
              isTimeout,
            })}\n\n`;
            await writer.write(encoder.encode(errorResponse));
            await writer.close();
          } catch (writeError) {
            console.error(`[${requestId}] Failed to write error: ${writeError.message}`);
            try { await writer.close(); } catch (e) { /* ignore */ }
          }
        }
      })();

      // Return the readable stream immediately - client will receive heartbeats in real-time
      // Using SSE format (text/event-stream) for better mobile streaming support
      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ========== NON-STREAMING RESPONSE ==========
    const geminiStartTime = Date.now();
    console.log(`[${requestId}] Calling Gemini API (non-streaming)...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_FETCH_TIMEOUT_MS);

    try {
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const geminiDuration = Date.now() - geminiStartTime;

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error(`[${requestId}] Gemini error: ${geminiResponse.status}`);

        if (geminiResponse.status === 429) {
          return Response.json(
            { error: 'API rate limit exceeded', retryAfter: 60, requestId, geminiStatus: 429 },
            { status: 429, headers: corsHeaders }
          );
        }
        if (geminiResponse.status === 403) {
          return Response.json(
            { error: 'API quota exceeded', requestId, geminiStatus: 403 },
            { status: 503, headers: corsHeaders }
          );
        }
        return Response.json(
          { error: 'Failed to generate content', requestId, geminiStatus: geminiResponse.status, details: errorText.substring(0, 200) },
          { status: 502, headers: corsHeaders }
        );
      }

      const geminiData = await geminiResponse.json();
      const finishReason = geminiData.candidates?.[0]?.finishReason || 'UNKNOWN';
      const contentPart = geminiData.candidates?.[0]?.content?.parts?.[0] || {};
      const content = contentPart.text || '';
      // Capture thought signature for multi-call reasoning continuity (Gemini 3)
      const thoughtSignature = contentPart.thoughtSignature || null;
      const usage = geminiData.usageMetadata || {};

      if (finishReason === 'SAFETY') {
        return Response.json(
          { error: 'Content blocked by safety filters', requestId, finishReason },
          { status: 400, headers: corsHeaders }
        );
      }

      const totalDuration = Date.now() - startTime;
      const cachedTokens = usage.cachedContentTokenCount || 0;
      console.log(`[${requestId}] Complete: ${geminiDuration}ms, ${content.length} chars${cachedTokens > 0 ? ` (${cachedTokens} cached)` : ''}${thoughtSignature ? ' (has signature)' : ''}`);

      return Response.json({
        success: true,
        content,
        // Include thought signature for multi-call reasoning continuity (Gemini 3)
        ...(thoughtSignature && { thoughtSignature }),
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          cachedTokens: cachedTokens,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
        finishReason,
        requestId,
        timing: { total: totalDuration, gemini: geminiDuration },
      }, { headers: corsHeaders });

    } catch (error) {
      clearTimeout(timeoutId);
      const isTimeout = error.name === 'AbortError';
      console.error(`[${requestId}] Error: ${error.message}`);
      return Response.json(
        { error: isTimeout ? 'Request timed out' : 'Internal server error', requestId, details: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] Proxy error after ${totalDuration}ms:`, error.message);
    return Response.json(
      { error: 'Internal server error', requestId, details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
