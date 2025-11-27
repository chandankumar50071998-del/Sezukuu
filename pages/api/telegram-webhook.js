// pages/api/telegram-webhook.js

import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
import Group from "@/models/Group";
import BotConfig from "@/models/BotConfig";
import BotSettings from "@/models/BotSettings";
import { generateWithYuki } from "@/lib/gemini";

// Raw body reader for Telegram
export const config = {
  api: { bodyParser: false },
};

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Telegram send message with reply support
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
  } catch (_) {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const chatType = msg.chat.type;
  const userText = msg.text || msg.caption || "";
  const isGroup =
    chatType === "group" ||
    chatType === "supergroup" ||
    chatType.includes("group");

  // Load bot token
  const botCfg = await BotConfig.findOne().lean();
  if (!botCfg?.telegramBotToken) return res.status(200).json({ ok: true });
  const BOT_TOKEN = botCfg.telegramBotToken;

  // Load panel settings
  const settings = (await BotSettings.findOne().lean()) || {};

  const ownerName = settings.ownerName || "Owner";
  const botName = settings.botName || "Yuki";
  const botUsername = (settings.botUsername || "yuki_ai_bot")
    .replace("@", "")
    .toLowerCase();
  const gender = settings.gender || "female";
  const personality = settings.personality || "normal";
  const groupLink = settings.groupLink || "";

  const lower = userText.toLowerCase().trim();

  // ------------------------
  // GROUP LOGGER
  // ------------------------
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

  // ------------------------
  // /start command
  // ------------------------
  if (lower.startsWith("/start")) {
    let intro = `Hey, main *${botName}* hu ✨`;

    if (groupLink) intro += `\nGroup: ${groupLink}`;
    intro += `\nOwner: *${ownerName}*`;
    intro += `\nBot: *@${botUsername}*`;

    await sendMessage(BOT_TOKEN, chatId, intro, {
      reply_to_message_id: msg.message_id,
    });

    return res.status(200).json({ ok: true });
  }

  // ------------------------
  // SMART GROUP REPLY LOGIC
  // ------------------------
  let shouldReply = false;

  // 1) PRIVATE → always reply
  if (!isGroup) shouldReply = true;

  // Load existing memory
  let memory = await Memory.findOne({ chatId, userId });

  // 2) If user replies to bot
  if (
    msg.reply_to_message?.from?.username?.toLowerCase() === botUsername
  ) {
    shouldReply = true;
  }

  // 3) Natural conversation: last message from bot
  if (memory && memory.history.length > 0) {
    const last = memory.history[memory.history.length - 1];
    if (last.role === "assistant") shouldReply = true;
  }

  // 4) Mention / name
  if (
    lower.includes(botName.toLowerCase()) ||
    lower.includes("@" + botUsername)
  ) {
    shouldReply = true;
  }

  // 5) Anti-spam
  if (isGroup && !shouldReply) {
    return res.status(200).json({ ok: true });
  }

  // ------------------------
  // MEMORY SYSTEM
  // ------------------------
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

  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);

  memory.mode = personality;
  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
    .join("\n");

  // ------------------------
  // BUILD PROMPT
  // ------------------------
  const genderLine =
    gender === "male"
      ? "Tum 18 saal ke Delhi ke ladke ho, chill + friendly tone me."
      : "Tum 18 saal ki Delhi ki cute girl ho, soft + friendly tone me.";

  const toneMap = {
    flirty:
      "Tum flirty, playful, teasing tone me 1–3 lines me natural reply doge.",
    professional:
      "Tum calm, polite, professional Hinglish tone me reply doge.",
    normal:
      "Tum soft Hinglish me friendly natural tone me reply doge.",
  };

  const ownerRule = `
Tumhara real owner sirf *${ownerName}* hai.
Owner ka naam sirf tab lena jab koi specifically pooche.
`;

  const finalPrompt = `
Tumhara naam *${botName}* hai.
${genderLine}
${toneMap[personality]}
${ownerRule}

Conversation:
${historyText}

User: ${userText}
Her:
`;

  // Typing animation
  await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }
  );

  await new Promise((r) => setTimeout(r, 900));

  // Generate response
  let reply;
  try {
    reply = await generateWithYuki(finalPrompt);
  } catch {
    reply = "Oops, thoda issue aa gaya 😅";
  }

  // Save bot response
  memory.history.push({
    role: "assistant",
    text: reply,
    time: new Date(),
  });
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);

  await memory.save();

  // SEND FINAL MESSAGE (THREAD FIX)
  await sendMessage(BOT_TOKEN, chatId, reply, {
    reply_to_message_id: msg.message_id,
  });

  return res.status(200).json({ ok: true });
}
