// models/Memory.js
import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true }, // Telegram chat ID
    userId: { type: String, required: true }, // Telegram user ID

    // Bot personality mode for this user
    mode: {
      type: String,
      enum: ["normal", "flirty", "professional"],
      default: "normal",
    },

    // Last 10 messages
    history: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        text: { type: String, required: true },
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Unique combination → per-user memory
MemorySchema.index({ chatId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Memory ||
  mongoose.model("Memory", MemorySchema);
