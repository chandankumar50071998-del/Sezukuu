export default async function muteCommand(message, sendMessage) {
    const chatId = message.chat.id;

    if (message.reply_to_message) {
        const target = message.reply_to_message.from;
        await sendMessage(chatId, `🔇 User Muted:\n@${target.username || target.first_name}`);
        return;
    }

    const parts = message.text.split(" ");
    if (parts[1]) {
        await sendMessage(chatId, `🔇 User Muted: ${parts[1]}`);
        return;
    }

    await sendMessage(chatId, "ℹ️ Use: /mute or /mute @user");
}