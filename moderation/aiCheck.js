// moderation/aiCheck.js

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

export default async function aiCheck(messageText) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a content moderation classifier.

Message: "${messageText}"

Classify this message into one of:
safe, abuse, toxic, hate, sexual, threat, scam, spam, harassment

Respond ONLY valid JSON, no explanation, no markdown, like:
{"category":"abuse","score":0.92}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // remove fences if any
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      text = text.slice(first, last + 1);
    }

    const parsed = JSON.parse(text);
    if (!parsed.category) parsed.category = "safe";
    if (typeof parsed.score !== "number") parsed.score = 0;

    return parsed;
  } catch (err) {
    console.log("AI MOD ERROR:", err);
    return { category: "safe", score: 0 };
  }
}
