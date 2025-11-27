// models/BotSettings.js
import mongoose from "mongoose";

const BotSettingsSchema = new mongoose.Schema(
  {
    ownerName: { type: String, default: "" },
    botName: { type: String, default: "" },

    // @username (stored WITHOUT @)
    botUsername: { type: String, default: "" },

    gender: {
      type: String,
      enum: ["female", "male"],
      default: "female",
    },

    personality: {
      type: String,
      enum: ["normal", "flirty", "professional"],
      default: "normal",
    },

    groupLink: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.BotSettings ||
  mongoose.model("BotSettings", BotSettingsSchema);
