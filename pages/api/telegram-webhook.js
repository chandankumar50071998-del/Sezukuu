// pages/api/telegram-webhook.js

import dbConnect from "@/lib/db";
import Memory from "@/models/Memory";
import Group from "@/models/Group";
import BotConfig from "@/models/BotConfig";
import BotSettings from "@/models/BotSettings";
import { generateWithYuki } from "@/lib/gemini";

// COMMANDS
import banCommand from "@/commands/ban";
import kickCommand from "@/commands/kick";
import muteCommand from "@/commands/mute";
import warnCommand from "@/commands/warn";

// MODERATION
import checkURL from "@/moderation/urlBlocker";
import checkSpam from "@/moderation/spamCheck";
import { checkFlood } from "@/moderation/floodCheck";
import aiCheck from "@/moderation/aiCheck";

// Telegram raw body
export const config = { api: { bodyParser: false } };

// Parse raw body
function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Telegram API helpers
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

async function deleteMessage(token, chatId, messageId) {
  await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });
}

async function kickUser(token, chatId, userId) {
  await fetch(`https://api.telegram.org/bot${token}/kickChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, user_id: userId }),
  });
}

async function banUser(token, chatId, userId) {
  // For now ban == kick (can extend with until_date if needed)
  await kickUser(token, chatId, userId);
}

async function muteUser(token, chatId, userId) {
  await fetch(`https://api.telegram.org/bot${token}/restrictChatMember`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      user_id: userId,
      permissions: { can_send_messages: false },
    }),
  });
}

// Only admins / owner can use moderation commands (Option C)
async function isAdminOrOwner(token, chatId, userId) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${userId}`
    );
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result.status;
    return status === "administrator" || status === "creator";
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  await dbConnect();
  const raw = await parseRawBody(req);

  let update;
  try {
    update = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(200).json({ ok: true });
  }

  const msg = update.message || update.edited_message;
  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const userText = msg.text || msg.caption || "";
  const lower = userText.toLowerCase();
  const chatType = msg.chat.type;
  const isGroup = chatType.includes("group");

  // CONFIG
  const botCfg = await BotConfig.findOne().lean();
  if (!botCfg?.telegramBotToken) return res.status(200).json({ ok: true });
  const BOT_TOKEN = botCfg.telegramBotToken;

  const settings = (await BotSettings.findOne().lean()) || {};
  const botName = settings.botName || "Yuki";
  const ownerName = settings.ownerName || "Owner";
  const botUsername = (settings.botUsername || "yuki_ai_bot")
    .replace("@", "")
    .toLowerCase();
  const gender = settings.gender || "female";
  const personality = settings.personality || "normal";
  const groupLink = settings.groupLink || "";

  // Clean matching for strict mode
  const cleanText = lower.replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const cleanBotName = botName.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();

  // GROUP LOGGER
  if (isGroup) {
    await Group.findOneAndUpdate(
      { chatId },
      {
        chatId,
        title: msg.chat.title || "",
        username: msg.chat.username || "",
        type: chatType,
        lastActiveAt: new Date(),
        $setOnInsert: { firstSeenAt: new Date() },
      },
      { upsert: true }
    );
  }

  // /start
  if (lower.startsWith("/start")) {
    let intro = `Hey, main *${botName}* hu ✨`;
    if (groupLink) intro += `\nGroup: ${groupLink}`;
    intro += `\nOwner: *${ownerName}*\nBot: *@${botUsername}*`;

    await sendMessage(BOT_TOKEN, chatId, intro, {
      reply_to_message_id: msg.message_id,
    });
    return res.status(200).json({ ok: true });
  }

  // =====================================================
  // MODERATION LAYER (Before commands, only for non-commands)
  // =====================================================

  if (!userText.startsWith("/")) {
    const displayName = msg.from.username
      ? `@${msg.from.username}`
      : msg.from.first_name;

    // URL BLOCK
    if (checkURL(userText)) {
      await deleteMessage(BOT_TOKEN, chatId, msg.message_id);
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `⚠️ Suspicious link blocked from ${displayName}`
      );
      return res.status(200).json({ ok: true });
    }

    // SPAM BLOCK
    if (checkSpam(userText)) {
      await deleteMessage(BOT_TOKEN, chatId, msg.message_id);
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `⚠️ Spam removed from ${displayName}`
      );
      return res.status(200).json({ ok: true });
    }

    // FLOOD PROTECT
    const flood = checkFlood(userId);
    if (flood === "warn") {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `⚠️ Slow down ${msg.from.first_name}`
      );
    }
    if (flood === "mute") {
      await muteUser(BOT_TOKEN, chatId, userId);
      await sendMessage(BOT_TOKEN, chatId, `🔇 Auto-muted (Flooding)`);
      return res.status(200).json({ ok: true });
    }
    if (flood === "kick") {
      await kickUser(BOT_TOKEN, chatId, userId);
      await sendMessage(BOT_TOKEN, chatId, `🚫 Auto-kicked (Flooding)`);
      return res.status(200).json({ ok: true });
    }

    // AI MODERATION (Gemini)
    const mod = await aiCheck(userText);
    if (mod.category !== "safe" && mod.score > 0.7) {
      await deleteMessage(BOT_TOKEN, chatId, msg.message_id);
      await sendMessage(
        BOT_TOKEN,
        chatId,
        `⚠️ AI detected *${mod.category}* message from ${displayName}`
      );
      return res.status(200).json({ ok: true });
    }
  }

  // =====================================================
  // STRICT COMMAND MODE (Option B)
  // =====================================================
  let allowCommand = false;

  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    allowCommand = true;

  if (lower.includes("@" + botUsername)) allowCommand = true;

  if (cleanText.includes(cleanBotName)) allowCommand = true;

  // COMMANDS
  if (userText.startsWith("/")) {
    if (isGroup && !allowCommand) {
      // ignore random commands in group
      return res.status(200).json({ ok: true });
    }

    // Admin / owner check (Option C)
    const isAdmin = await isAdminOrOwner(BOT_TOKEN, chatId, msg.from.id);
    if (!isAdmin) {
      await sendMessage(
        BOT_TOKEN,
        chatId,
        "❌ Sirf group admin/owner ye command use kar sakte hain."
      );
      return res.status(200).json({ ok: true });
    }

    const cmd = lower.split(" ")[0];

    switch (cmd) {
      case "/ban":
        await banCommand(
          msg,
          (t) => sendMessage(BOT_TOKEN, chatId, t),
          (targetId) => banUser(BOT_TOKEN, chatId, targetId),
          BOT_TOKEN
        );
        break;

      case "/kick":
        await kickCommand(
          msg,
          (t) => sendMessage(BOT_TOKEN, chatId, t),
          (targetId) => kickUser(BOT_TOKEN, chatId, targetId),
          BOT_TOKEN
        );
        break;

      case "/mute":
        await muteCommand(
          msg,
          (t) => sendMessage(BOT_TOKEN, chatId, t),
          (targetId) => muteUser(BOT_TOKEN, chatId, targetId),
          BOT_TOKEN
        );
        break;

      case "/warn":
        await warnCommand(msg, (t) => sendMessage(BOT_TOKEN, chatId, t));
        break;

      default:
        break;
    }

    return res.status(200).json({ ok: true });
  }

  // =====================================================
  // AI CHAT SYSTEM (Yuki)
  // =====================================================

  let shouldReply = false;

  if (!isGroup) shouldReply = true;
  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    shouldReply = true;
  if (lower.includes("@" + botUsername)) shouldReply = true;
  if (cleanText.includes(cleanBotName) || lower.includes(botName.toLowerCase()))
    shouldReply = true;

  if (isGroup && !shouldReply) {
    return res.status(200).json({ ok: true });
  }

  // MEMORY SYSTEM
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

  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);

  memory.mode = personality;
  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Her"}: ${m.text}`)
    .join("\n");

  const genderLine =
    gender === "male"
      ? "Tum 18 saal ke Delhi ke ladke ho, friendly + chill tone me."
      : "Tum 18 saal ki Delhi ki cute girl ho, soft + friendly tone me.";

  const toneMap = {
    flirty:
      "Tum flirty, teasing, sweet tone me reply doge. 1–3 lines.",
    professional:
      "Tum calm, polite, respectful tone me reply doge.",
    normal:
      "Tum soft Hinglish me friendly, natural tone me reply doge.",
  };

  const ownerRule = `
Tumhara REAL owner sirf *${ownerName}* hai.
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

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });

  await new Promise((r) => setTimeout(r, 900));

  let reply;
  try {
    reply = await generateWithYuki(finalPrompt);
  } catch {
    reply = "Oops, thoda issue aa gaya 😅";
  }

  memory.history.push({
    role: "assistant",
    text: reply,
    time: new Date(),
  });

  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);

  await memory.save();

  await sendMessage(BOT_TOKEN, chatId, reply, {
    reply_to_message_id: msg.message_id,
  });

  return res.status(200).json({ ok: true });
}
