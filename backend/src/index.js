import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from 'fs';
import { createServer } from 'http';
import { initSocket } from './lib/socket.js';
import { startScheduledTasks } from './lib/scheduledTasks.js';
import path from "path";
import { fileURLToPath } from 'url';

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import fileRoutes from "./routes/file.route.js";
import directRoutes from "./routes/direct.route.js";
import usersRoutes from "./routes/users.route.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS Configuration - Allow multiple frontend ports
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware for parsing JSON and cookies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Cookie debugging middleware (disabled in production)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Cookies received in request:', req.cookies);
    next();
  });
}

// Create server after CORS and parsers
const server = createServer(app);

// Initialize socket after server creation
initSocket(server);

// Make sure the uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
} else {
  console.log(`Uploads directory exists at: ${uploadsDir}`);
}

// Configure static files with additional debugging
console.log(`Setting up static file serving for uploads at: ${uploadsDir}`);
app.use('/uploads', (req, res, next) => {
  console.log(`[Static] Request for: ${req.path}`);
  
  // Check if the file exists before serving
  const filePath = path.join(uploadsDir, req.path);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`[Static] File not found: ${filePath}`);
      // Instead of showing 404, return a default image
      return res.sendFile(path.join(__dirname, '../uploads/default-image.png'), (err) => {
        if (err) {
          console.error('[Static] Error serving default image:', err);
          return res.status(404).send('File not found');
        }
      });
    }
    console.log(`[Static] File exists: ${filePath}`);
    next();
  });
}, express.static(uploadsDir));

// Set up routes
console.log('Registering routes...');
app.use("/api/auth", authRoutes);
console.log('Auth routes registered at /api/auth');
app.use("/api/messages", messageRoutes);
console.log('Message routes registered at /api/messages');
app.use("/api/files", fileRoutes);
console.log('File routes registered at /api/files');
app.use("/api/direct", directRoutes);
console.log('Direct routes registered at /api/direct');
app.use("/api/users", usersRoutes);
console.log('User routes registered at /api/users');

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log('Port 5001 is busy. Trying to use another port...');
    server.listen(0); // This will automatically find an available port
  } else {
    console.error('Server error:', error);
  }
});

// Start the server and connect to DB
const startServer = async () => {
  try {
    // Connect to MongoDB first to ensure GridFS is initialized
    const client = await connectDB();
    console.log('Database connection established');
    
    // Do additional check for GridFS initialization
    try {
      const { getGridFSBucket } = await import('./lib/gridfs.js');
      const bucket = getGridFSBucket();
      console.log('GridFS is properly initialized and ready to use');
    } catch (gridfsError) {
      console.error('GridFS check failed:', gridfsError.message);
      console.warn('File uploads may not work correctly');
    }
    
    // Then start the server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      
      // Start scheduled tasks after server is running
      startScheduledTasks();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
