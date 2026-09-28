// @ts-check
import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["info", "warn", "error"], required: true },
    method: { type: String, required: true, maxlength: 32 },
    path: { type: String, required: true, maxlength: 2048 },
    ip: { type: String, required: true, maxlength: 64 },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusCode: { type: Number, required: true, min: 100, max: 599 },
    durationMs: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 86400000) },
  },
  {
    timestamps: true,
    strict: "throw",
    versionKey: false,
    bufferCommands: false,
  },
);

LogSchema.index({ createdAt: -1 });
LogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("Log", LogSchema, "auditLogs");
