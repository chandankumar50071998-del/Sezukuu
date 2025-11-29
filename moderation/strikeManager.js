const strikes = {}; // memory based

export function addStrike(userId) {
    if (!strikes[userId]) strikes[userId] = 0;
    strikes[userId]++;

    return strikes[userId];
}

export function getStrikes(userId) {
    return strikes[userId] || 0;
}

export function resetStrikes(userId) {
    strikes[userId] = 0;
}