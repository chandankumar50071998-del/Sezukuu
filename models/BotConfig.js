// models/BotConfig.js
import mongoose from "mongoose";

const BotConfigSchema = new mongoose.Schema(
  {
    telegramBotToken: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.BotConfig ||
  mongoose.model("BotConfig", BotConfigSchema);
