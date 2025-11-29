// commands/kick.js

async function resolveTarget(message, botToken) {
  const chatId = message.chat.id;

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
      error: "❌ Reply karke ya username/id dekar /kick use karo.",
    };
  }

  let raw = parts[1].trim();
  if (raw.startsWith("@")) raw = raw.slice(1);

  if (/^-?\d+$/.test(raw)) {
    return { ok: true, userId: Number(raw), label: raw };
  }

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
  } catch (e) {}

  return {
    ok: false,
    error: `❌ User @${raw} nahi mila.`,
  };
}

export default async function kickCommand(
  message,
  sendMessage,
  doKick,
  botToken
) {
  const chatId = message.chat.id;

  const target = await resolveTarget(message, botToken);
  if (!target.ok) {
    return sendMessage(chatId, target.error);
  }

  await doKick(target.userId);
  await sendMessage(
    chatId,
    `🚫 User Kicked: ${target.label}`
  );
}
