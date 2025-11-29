export default async function warnCommand(message, sendMessage) {
    const chatId = message.chat.id;

    // Check: reply required
    if (!message.reply_to_message) {
        return sendMessage(
            chatId,
            "⚠️ Reply karke /warn use karo.\nExample: Kisi message ko reply → /warn"
        );
    }

    // Target user (the user whose message is replied)
    const target = message.reply_to_message.from;

    // Send warning message
    await sendMessage(
        chatId,
        `⚠️ Warning issued to @${target.username || target.first_name}`
    );
}