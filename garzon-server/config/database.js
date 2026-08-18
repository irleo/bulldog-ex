import mongoose from 'mongoose';

/**
 * Opens the MongoDB connection used by the API.
 * @param {string} mongoUri
 * @returns {Promise<typeof mongoose>}
 */
export const connectDatabase = async (mongoUri) => {
  try {
    mongoose.set('strictQuery', true);
    return await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`MongoDB connection failed: ${reason}`, { cause: error });
  }
};

/** @returns {Promise<void>} */
export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`MongoDB disconnection failed: ${reason}`, { cause: error });
  }
};
