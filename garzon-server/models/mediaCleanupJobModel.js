import mongoose from "mongoose";

const MediaCleanupJobSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    nextAttemptAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, strict: "throw" },
);
MediaCleanupJobSchema.index({ publicId: 1 }, { unique: true });
MediaCleanupJobSchema.index({ nextAttemptAt: 1 });
export default mongoose.model(
  "MediaCleanupJob",
  MediaCleanupJobSchema,
  "mediaCleanupJobs",
);
