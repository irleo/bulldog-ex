import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, select: false },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, strict: "throw" },
);
SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("Session", SessionSchema, "sessions");
