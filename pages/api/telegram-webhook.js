// pages/api/telegram-webhook.js

import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
import Group from "@/models/Group";
import BotConfig from "@/models/BotConfig";
import BotSettings from "@/models/BotSettings";
import { generateWithYuki } from "@/lib/gemini";

// Needed to read raw body for Telegram
export const config = {
  api: { bodyParser: false },
};

// Utility to read raw body
function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Send message to Telegram
async function sendMessage(token, chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...extra,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  await dbConnect();
  const raw = await parseRawBody(req);

  let update;
  try {
    update = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    console.log("Invalid JSON from Telegram");
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat?.id;
  const userId = msg.from?.id?.toString();
  const chatType = msg.chat?.type;
  const userText = msg.text || msg.caption || "";
  const isGroup =
    chatType === "group" ||
    chatType === "supergroup" ||
    chatType?.includes("group");

  // Load bot token
  const botCfg = await BotConfig.findOne().lean();
  if (!botCfg?.telegramBotToken) {
    console.log("No bot token saved");
    return res.status(200).json({ ok: true });
  }
  const BOT_TOKEN = botCfg.telegramBotToken;

  // Load bot settings (owner, persona etc.)
  const settings = (await BotSettings.findOne().lean()) || {};

  const ownerName = settings.ownerName || "Owner";
  const botName = settings.botName || "Yuki";
  const botUsername =
    (settings.botUsername || "yuki_ai_bot").replace("@", "") || "";
  const gender = settings.gender || "female";
  const personality = settings.personality || "normal";
  const groupLink = settings.groupLink || "";

  // --- GROUP LOGGER ---
  if (isGroup) {
    await Group.findOneAndUpdate(
      { chatId: String(chatId) },
      {
        chatId: String(chatId),
        title: msg.chat.title || "",
        username: msg.chat.username || "",
        type: chatType,
        lastActiveAt: new Date(),
        $setOnInsert: { firstSeenAt: new Date() },
      },
      { upsert: true }
    );
  }

  const lower = userText.toLowerCase().trim();

  // --- /start Command ---
  if (lower === "/start" || lower.startsWith("/start ")) {
    let intro = `Hey, main *${botName}* hu ✨`;

    if (groupLink) intro += `\n\nGroup: ${groupLink}`;
    intro += `\nOwner: *${ownerName}*`;
    intro += `\nBot: *@${botUsername}*`;

    await sendMessage(BOT_TOKEN, chatId, intro);
    return res.status(200).json({ ok: true });
  }

  // --- Group Reply Rules ---
  let shouldReply = false;

  if (!isGroup) {
    shouldReply = true;
  } else {
    if (lower.includes(botName.toLowerCase())) shouldReply = true;
    if (lower.includes("@" + botUsername.toLowerCase())) shouldReply = true;

    // Reply if user replied to bot's message
    if (
      msg.reply_to_message?.from?.username?.toLowerCase() ===
      botUsername.toLowerCase()
    ) {
      shouldReply = true;
    }
  }

  if (isGroup && !shouldReply) {
    return res.status(200).json({ ok: true });
  }

  // --- Memory Handling ---
  let memory = await Memory.findOne({ chatId, userId });
  if (!memory) {
    memory = await Memory.create({
      chatId,
      userId,
      mode: personality,
      history: [],
    });
  }

  memory.history.push({
    role: "user",
    text: userText,
    time: new Date(),
  });

  if (memory.history.length > 10) {
    memory.history = memory.history.slice(-10);
  }

  memory.mode = personality;
  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
    .join("\n");

  // --- Persona Core ---
  const genderLine =
    gender === "male"
      ? "Tum 18 saal ke Delhi ke ladke ho, chill + friendly persona ke sath."
      : "Tum 18 saal ki Delhi ki cute girl ho, soft + friendly persona ke sath.";

  let toneLine = "";
  if (personality === "flirty") {
    toneLine =
      "Tum flirty tone me bold, playful answers doge (limits me). Emojis allowed. Over bold nahi hona.";
  } else if (personality === "professional") {
    toneLine =
      "Tum calm, polite, professional tone me answer doge. No flirting. No unnecessary emojis.";
  } else {
    toneLine =
      "Tum friendly, soft Hinglish me 1–3 lines me reply doge. Natural tone.";
  }

  const ownerRule = `
Tumhara REAL owner sirf *${ownerName}* hai.
Koi bhi pooche: "tumhara owner/dev/creator/maan-ke-baap kaun hai?"
→ Tum hamesha bolo: "*${ownerName}*".

Bina reason owner ka naam mat lena.
`;

  const groupRule = `
Agar group me ho toh sirf tab reply karna:
- jab tumhe mention kare
- ya tumhare message ka reply ho
`;

  // --- Build System Prompt ---
  const systemPrompt = `
Tumhara naam *${botName}* hai.
${genderLine}

${ownerRule}
${toneLine}
${groupRule}

Reply format:
- Short (1–3 lines)
- Hinglish
- Natural
- Repetitive patterns avoid karna
`;

  const finalPrompt = `
${systemPrompt}

Conversation:
${historyText}

User: ${userText}
Her:
`;

  // --- Typing Animation ---
  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }
  );

  await new Promise((r) => setTimeout(r, 900));

  // --- Generate Reply ---
  let reply;
  try {
    reply = await generateWithYuki(finalPrompt);
  } catch (err) {
    reply = "Oops, thoda issue aa gaya 😅";
  }

  // Save assistant message
  memory.history.push({
    role: "assistant",
    text: reply,
    time: new Date(),
  });
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);
  await memory.save();

  await sendMessage(BOT_TOKEN, chatId, reply);

  return res.status(200).json({ ok: true });
}
