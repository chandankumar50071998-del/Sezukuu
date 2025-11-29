export default async function banCommand(message, sendMessage) {
    const chatId = message.chat.id;

    // Reply based ban
    if (message.reply_to_message) {
        const target = message.reply_to_message.from;
        await sendMessage(chatId, `ðŸš« User Banned:\n@${target.username || target.first_name}`);
        return;
    }

    // /ban @username
    const parts = message.text.split(" ");
    if (parts[1]) {
        await sendMessage(chatId, `ðŸš« User Banned: ${parts[1]}`);
        return;
    }

    await sendMessage(chatId, "âŒ Reply karke ya username dekar ban karo.");
}
