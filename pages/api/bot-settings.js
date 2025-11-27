// pages/api/bot-settings.js
import dbConnect from "@/lib/db";
import BotSettings from "@/models/BotSettings";

export default async function handler(req, res) {
  await dbConnect();

  // GET → Return saved bot settings
  if (req.method === "GET") {
    const settings = await BotSettings.findOne().lean();
    return res.status(200).json({ ok: true, settings });
  }

  // POST → Save/update bot settings
  if (req.method === "POST") {
    const {
      ownerName,
      botName,
      botUsername,
      gender,
      personality,
      groupLink,
    } = req.body || {};

    // Validation (simple but effective)
    if (!ownerName || !botName) {
      return res
        .status(400)
        .json({ ok: false, error: "ownerName and botName are required" });
    }

    // Replace @ from username automatically
    const cleanUsername =
      (botUsername || "").startsWith("@")
        ? botUsername.substring(1)
        : botUsername || "";

    // Upsert (create if not exist, update if exists)
    const settings = await BotSettings.findOneAndUpdate(
      {},
      {
        ownerName,
        botName,
        botUsername: cleanUsername,
        gender: gender || "female",
        personality: personality || "normal",
        groupLink: groupLink || "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({ ok: true, settings });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
