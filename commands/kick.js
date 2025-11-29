export default async function kickCommand(message, sendMessage, kickUser) {
    const chatId = message.chat.id;

    if (!message.reply_to_message) {
        return sendMessage(chatId, "âŒ Reply karke /kick use karo.");
    }

    const target = message.reply_to_message.from;

    await kickUser(chatId, target.id);
    await sendMessage(chatId, `ðŸš« User Kicked:\n@${target.username || target.first_name}`);
}
