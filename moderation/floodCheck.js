const messageHistory = {};

export function checkFlood(userId) {
    const now = Date.now();

    if (!messageHistory[userId]) messageHistory[userId] = [];
    messageHistory[userId].push(now);

    // Only track last 5 seconds
    messageHistory[userId] = messageHistory[userId].filter(t => now - t < 5000);

    const count = messageHistory[userId].length;

    if (count >= 12) return "kick";
    if (count >= 8) return "mute";
    if (count >= 5) return "warn";

    return "ok";
}