// commands/ban.js

async function resolveTarget(message, botToken) {
  const chatId = message.chat.id;

  // 1) Reply based
  if (message.reply_to_message) {
    const u = message.reply_to_message.from;
    return {
      ok: true,
      userId: u.id,
      label: u.username ? `@${u.username}` : u.first_name,
    };
  }

  const parts = message.text.trim().split(/\s+/);
  if (!parts[1]) {
    return {
      ok: false,
      error: "❌ Reply karke ya username/id dekar /ban use karo.",
    };
  }

  let raw = parts[1].trim();
  if (raw.startsWith("@")) raw = raw.slice(1);

  // numeric id
  if (/^-?\d+$/.test(raw)) {
    return { ok: true, userId: Number(raw), label: raw };
  }

  // try getChat with @username
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=@${raw}`
    );
    const data = await res.json();
    if (data.ok && data.result && data.result.id) {
      return {
        ok: true,
        userId: data.result.id,
        label: `@${data.result.username || raw}`,
      };
    }
  } catch (e) {
    // ignore
  }

  return {
    ok: false,
    error: `❌ User @${raw} nahi mila.`,
  };
}

export default async function banCommand(
  message,
  sendMessage,
  doBan,
  botToken
) {
  const chatId = message.chat.id;

  const target = await resolveTarget(message, botToken);
  if (!target.ok) {
    return sendMessage(chatId, target.error);
  }

  await doBan(target.userId);
  await sendMessage(
    chatId,
    `⛔ User Banned: ${target.label}`
  );
}
