// @ts-check
import mongoose from "mongoose";
import { MONGO_URI } from "./config.js";

/** @type {Promise<typeof mongoose> | undefined} */
let connectionPromise;

/** Reuse one pool and initialization promise per function instance. */
const connectDB = async () => {
  // Tests and scripts may establish their own isolated connection first.
  if (!connectionPromise && mongoose.connection.readyState === 1) return mongoose;
  if (!connectionPromise) connectionPromise = initialize();
  return connectionPromise;
};

async function initialize() {
  try {
    mongoose.set("strictQuery", true);
    const connection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    return connection;
  } catch (error) {
    connectionPromise = undefined;
    console.error('Database initialization failed:', error instanceof Error ? error.name : 'UnknownError');
    throw error;
  }
}

export default connectDB;
