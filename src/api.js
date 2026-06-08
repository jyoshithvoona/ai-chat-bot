/**
 * Service to interact with the Google Gemini API.
 * Features: auto model discovery, retry with fallback models on overload.
 */

// Cache discovered models so we don't re-fetch on every call
let cachedModels = null;
let cacheExpiry = 0;

async function discoverModels(apiKey) {
  const now = Date.now();
  if (cachedModels && now < cacheExpiry) return cachedModels;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      const all = (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.split('/').pop());
      cachedModels = all;
      cacheExpiry = now + 5 * 60 * 1000; // Cache for 5 minutes
      return all;
    }
  } catch (e) {
    console.warn('Model discovery failed', e);
  }
  return null;
}

function pickModels(available) {
  // Preferred order: newest flash models first
  const preferred = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash-preview-05-20',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ];

  if (!available) return ['gemini-2.0-flash', 'gemini-2.5-flash'];

  const ordered = [];
  // Add preferred models that exist in the available list
  for (const pref of preferred) {
    if (available.includes(pref)) ordered.push(pref);
  }
  // Add any other flash models we haven't listed
  for (const m of available) {
    if (m.includes('flash') && !ordered.includes(m)) ordered.push(m);
  }
  // Add any remaining models as last resort
  for (const m of available) {
    if (!ordered.includes(m)) ordered.push(m);
  }

  return ordered.length ? ordered : ['gemini-2.0-flash'];
}

async function callModel(apiKey, model, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    const err = new Error(errMsg);
    err.status = response.status;
    err.isOverload = errMsg.toLowerCase().includes('high demand') ||
                     errMsg.toLowerCase().includes('overloaded') ||
                     errMsg.toLowerCase().includes('resource exhausted') ||
                     response.status === 429 || response.status === 503;
    throw err;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model. Please try again.');
  return text;
}

export async function generateContent({ apiKey, prompt, systemInstruction, history = [], jsonMode = false }) {
  if (!apiKey) throw new Error('API Key is missing. Please set it in Settings.');

  // Discover available models
  const available = await discoverModels(apiKey);
  const modelsToTry = pickModels(available);

  console.log('Models to try (in order):', modelsToTry);

  // Build payload
  const contents = [...history];
  if (prompt) contents.push({ role: 'user', parts: [{ text: prompt }] });

  const payload = { contents };
  if (systemInstruction) payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  if (jsonMode) payload.generationConfig = { responseMimeType: 'application/json' };

  // Try models in order; on overload/rate-limit, try the next one
  let lastError = null;
  for (const model of modelsToTry.slice(0, 3)) { // Try up to 3 models
    try {
      console.log(`Trying model: ${model}`);
      const result = await callModel(apiKey, model, payload);
      console.log(`Success with model: ${model}`);
      return result;
    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message);
      lastError = err;
      if (err.isOverload) {
        console.log('Overload detected, trying next model...');
        continue; // Try next model
      }
      throw err; // Non-overload errors should fail immediately
    }
  }

  // All models failed
  throw lastError || new Error('All models are currently overloaded. Please try again in a moment.');
}
