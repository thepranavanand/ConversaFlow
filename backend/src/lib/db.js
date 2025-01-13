import mongoose from "mongoose";
import { MongoClient } from "mongodb";
import { initGridFS } from "./gridfs.js";

let mongoClient;

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    
    try {
      // Initialize MongoDB native client for GridFS
      console.log("Initializing MongoDB native client for GridFS...");
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      console.log("MongoDB native client connected");
      
      // Initialize GridFS
      const bucket = initGridFS(mongoClient);
      if (!bucket) {
        throw new Error("Failed to initialize GridFS bucket");
      }
      console.log("GridFS initialization completed successfully");
    } catch (gridfsError) {
      console.error("Error initializing GridFS:", gridfsError.message);
      console.error("Stack trace:", gridfsError.stack);
      // Continue without GridFS - app can still work without file uploads
      console.warn("Application will continue without GridFS functionality");
    }
    
    return mongoClient;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error; // Re-throw to make error visible
  }
};

export const getMongoClient = () => {
  if (!mongoClient) {
    throw new Error("MongoDB client not initialized");
  }
  return mongoClient;
};
