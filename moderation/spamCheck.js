export default function checkSpam(text) {
    // ALL CAPS spam
    if (text.length > 6 && text === text.toUpperCase()) return true;

    // Repeated characters
    if (/([a-zA-Z])\1{4,}/.test(text)) return true;

    // Emoji spam
    if (/[\u{1F600}-\u{1F64F}]{5,}/u.test(text)) return true;

    // "Free" spam style
    const spamWords = ["free", "earn", "bonus", "join fast", "offer", "click here"];
    for (let word of spamWords) {
        if (text.toLowerCase().includes(word)) return true;
    }

    return false;
}