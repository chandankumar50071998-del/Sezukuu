// models/Group.js
import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, unique: true },

    title: { type: String, default: "" },
    username: { type: String, default: "" },

    type: { type: String, default: "" }, // group / supergroup

    firstSeenAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Group ||
  mongoose.model("Group", GroupSchema);
