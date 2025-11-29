// commands/warn.js

export default async function warnCommand(message, sendMessage) {
  const chatId = message.chat.id;

  if (!message.reply_to_message) {
    return sendMessage(
      chatId,
      "⚠️ Reply karke /warn use karo.\nExample: Kisi message ko reply → /warn"
    );
  }

  const target = message.reply_to_message.from;

  await sendMessage(
    chatId,
    `⚠️ Warning issued to @${target.username || target.first_name}`
  );
}
