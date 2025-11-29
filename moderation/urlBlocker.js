const blockedPatterns = [
    /bit\.ly/i,
    /tinyurl\.com/i,
    /t\.me\/joinchat/i,
    /telegramweb\.org/i,
    /crypto/i,
    /binancebonus/i,
    /free-money/i,
    /airdrop/i,
    /earn-\d+/i,
    /claimbonus/i,
    /(login|verify|restore)\.(telegram|whatsapp|meta)\.*/i,
    /porn|sex|xxx|18\+/i
];

export default function checkURL(text) {
    for (const pattern of blockedPatterns) {
        if (pattern.test(text)) {
            return true; // URL blocked
        }
    }
    return false;
}