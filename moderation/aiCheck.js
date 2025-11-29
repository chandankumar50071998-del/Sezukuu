import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);

export default async function aiCheck(messageText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Analyze this message for moderation.
        Categories: safe, abuse, spam, toxic, hate, sexual, scam, threat.
        Return JSON like: {"category": "abuse", "score": 0.89}
        
        Message: "${messageText}"
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return JSON.parse(text);
    } catch (err) {
        console.log("AI MOD ERROR:", err);
        return { category: "safe", score: 0 };
    }
}