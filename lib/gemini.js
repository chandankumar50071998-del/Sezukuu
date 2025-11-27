// lib/gemini.js
import ApiKey from "@/models/ApiKey";
import dbConnect from "@/lib/db";

async function callGeminiWithKey(apiKey, prompt) {
  // New Gemini Flash API endpoint
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
    apiKey;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    })
  });

  if (!res.ok) {
    const text = await res.text();
    const error = new Error("Gemini API error");
    error.status = res.status;
    error.details = text;
    throw error;
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Yuki couldn't generate a response.";

  return text;
}

export async function generateWithYuki(prompt) {
  await dbConnect();

  // Get all active keys sorted by fail history
  const keys = await ApiKey.find({ active: true }).sort({
    failedAt: 1,
    createdAt: 1
  });

  if (!keys.length) {
    throw new Error("No active Gemini API keys configured.");
  }

  let lastError = null;

  for (const keyDoc of keys) {
    try {
      const reply = await callGeminiWithKey(keyDoc.key, prompt);

      // Reset fail
      keyDoc.failedAt = null;
      await keyDoc.save();

      return reply;
    } catch (err) {
      lastError = err;

      const isRateLimit =
        err.status === 429 ||
        err.status === 403 ||
        err.status === 503;

      // Mark failed time
      keyDoc.failedAt = new Date();

      if (isRateLimit) {
        keyDoc.active = false;
      }

      await keyDoc.save();
      continue;
    }
  }

  throw lastError || new Error("All keys failed.");
}
