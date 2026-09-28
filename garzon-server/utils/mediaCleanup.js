// @ts-check
import Job from "../models/mediaCleanupJobModel.js";
import Product from "../models/productModel.js";
import cloudinary, { requireCloudinary } from "../config/cloudinary.js";

/** Persist intent before any external upload or product reference change.
 * @param {string|null|undefined} publicId @param {number} [delayMs] */
export async function scheduleCleanup(publicId, delayMs = 86400000) {
  if (!publicId) return;
  if (!/^bulldogs-exchange\/products\/[a-f0-9-]{36}$/.test(publicId))
    throw new Error("Unexpected asset ID");
  await Job.updateOne(
    { publicId },
    {
      $setOnInsert: { publicId, nextAttemptAt: new Date(Date.now() + delayMs) },
    },
    { upsert: true },
  );
}

/** Jobs are explicitly retried by an administrator; no background daemon is needed.
 * @param {string} publicId */
export async function processCleanup(publicId) {
  if (await Product.exists({ imagePublicId: publicId })) {
    await Job.updateOne(
      { publicId },
      { $set: { nextAttemptAt: new Date(Date.now() + 86400000) } },
    );
    return false;
  }
  requireCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
  if (!["ok", "not found"].includes(result.result))
    throw new Error("Asset cleanup was not confirmed");
  await Job.deleteOne({ publicId });
  return true;
}

export async function retryCleanupBatch() {
  let completed = 0;
  // Bound both database results and external calls per request.
  const jobs = await Job.find({ nextAttemptAt: { $lte: new Date() } })
    .sort({ nextAttemptAt: 1 })
    .limit(5)
    .lean();
  for (const job of jobs) {
    const claimed = await Job.updateOne(
      { _id: job._id, nextAttemptAt: job.nextAttemptAt },
      {
        $set: { nextAttemptAt: new Date(Date.now() + 3600000) },
        $inc: { attempts: 1 },
      },
    );
    if (!claimed.modifiedCount) continue;
    try {
      if (await processCleanup(job.publicId)) completed += 1;
    } catch (error) {
      console.error("Media cleanup retry failed", {
        jobId: String(job._id),
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  return { completed, attempted: jobs.length };
}
