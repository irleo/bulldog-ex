// @ts-check
import mongoose from "mongoose";
const RequestQuotaSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    hits: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { strict: "throw", versionKey: false },
);
RequestQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model(
  "RequestQuota",
  RequestQuotaSchema,
  "requestQuotas",
);
