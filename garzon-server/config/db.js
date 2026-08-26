import mongoose from 'mongoose';
import { MONGO_URI } from './config.js';

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    const connection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB Connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Database connection error: ${reason}`);
    process.exit(1);
  }
};

export default connectDB;
