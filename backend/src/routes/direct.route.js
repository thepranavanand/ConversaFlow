import express from "express";
import multer from "multer";
import crypto from "crypto";
import Message from "../models/message.model.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { getIO, getReceiverSocketId } from "../lib/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, "../../uploads/");

const router = express.Router();

// Constants for size limits
const MAX_MESSAGE_CHARS = 500; // ~100 words 
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for files

// Create a disk storage configuration that works reliably
const fileStorage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      cb(null, UPLOADS_DIR);
    } catch (err) {
      cb(null, UPLOADS_DIR); // Try anyway
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname) || '';
    cb(null, uniqueSuffix + extension);
  }
});

// Configure direct file upload with disk storage
const fileUpload = multer({
  storage: fileStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  }
});

// Configure multer for direct image messages with same reliable storage
const imageUpload = multer({
  storage: fileStorage,
  limits: {
    fileSize: MAX_IMAGE_SIZE, // 20MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

// Direct route for sending messages with images
router.post("/message/:id", imageUpload.single('image'), async (req, res) => {
  try {
    console.log('Direct message request received');
    
    // Require senderId in the request body
    if (!req.body.senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }
    
    const senderId = req.body.senderId;
    const { id: receiverId } = req.params;
    const { text, replyTo } = req.body;
    
    // Check message length
    if (text && text.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Message too long. Maximum ${MAX_MESSAGE_CHARS} characters allowed.` });
    }
    
    let imageUrl;
    if (req.file) {
      console.log('Image received:', req.file.filename);
      imageUrl = `/uploads/${req.file.filename}`;
    }
    
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || '',
      image: imageUrl,
      replyTo: replyTo || null
    });
    
    const savedMessage = await newMessage.save();
    console.log('Message saved with ID:', savedMessage._id);
    
    // If this is a reply, populate the reply information
    let populatedMessage = savedMessage;
    if (replyTo) {
      populatedMessage = await Message.findById(savedMessage._id).populate('replyTo');
    }
    
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    
    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in direct message:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Direct route for file upload
router.post("/file/:id", fileUpload.single('file'), async (req, res) => {
  try {
    console.log('Direct file upload request received');
    
    // Basic validation
    if (!req.body.senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`File received: ${req.file.originalname}, size: ${req.file.size}`);
    
    const senderId = req.body.senderId;
    const receiverId = req.params.id;
    const { originalname, mimetype, filename, size, path: filePath } = req.file;
    const text = req.body.text || '';
    const replyTo = req.body.replyTo || null;

    // Check message length
    if (text && text.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Message too long. Maximum ${MAX_MESSAGE_CHARS} characters allowed.` });
    }

    // Create file URL
    const fileUrl = `/uploads/${filename}`;
    console.log('File accessible at:', fileUrl);
    
    // Create message with file data
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      replyTo,
      file: {
        fileId: crypto.randomUUID(),
        filename,
        originalname,
        fileSize: size,
        fileType: mimetype,
        url: fileUrl
      }
    });
    
    const savedMessage = await newMessage.save();
    console.log('Message saved with ID:', savedMessage._id);
    
    // If this is a reply, populate the reply information
    let populatedMessage = savedMessage;
    if (replyTo) {
      populatedMessage = await Message.findById(savedMessage._id).populate('replyTo');
    }
    
    // Emit socket event
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    
    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error in file upload:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// Direct text-only message route
router.post("/text/:id", async (req, res) => {
  try {
    console.log('Direct text message request received');
    
    // Require senderId in the request body
    if (!req.body.senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }
    
    const senderId = req.body.senderId;
    const { id: receiverId } = req.params;
    const { text, replyTo } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    // Check message length
    if (text.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Message too long. Maximum ${MAX_MESSAGE_CHARS} characters allowed.` });
    }
    
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      replyTo: replyTo || null
    });
    
    const savedMessage = await newMessage.save();
    console.log('Text message saved with ID:', savedMessage._id);
    
    // If this is a reply, populate the reply information
    let populatedMessage = savedMessage;
    if (replyTo) {
      populatedMessage = await Message.findById(savedMessage._id).populate('replyTo');
    }
    
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }
    
    return res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error in direct text message:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete message route
router.delete("/message/:id", async (req, res) => {
  try {
    console.log('Delete message request received for ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { id: messageId } = req.params;
    const { senderId } = req.body;
    
    if (!senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log('Message not found with ID:', messageId);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    console.log('Found message:', message);
    
    // Check if user is the sender of the message
    if (message.senderId.toString() !== senderId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    console.log('Message deleted with ID:', messageId);
    
    // Notify both users about the deletion
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }
    
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Alternative delete message route using POST 
router.post("/message/delete/:id", async (req, res) => {
  try {
    console.log('POST delete request received for ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { id: messageId } = req.params;
    const { senderId } = req.body;
    
    if (!senderId) {
      return res.status(400).json({ error: 'senderId is required' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log('Message not found with ID:', messageId);
      return res.status(404).json({ error: 'Message not found' });
    }
    
    console.log('Found message:', message);
    
    // Check if user is the sender of the message
    if (message.senderId.toString() !== senderId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    console.log('Message deleted with ID:', messageId);
    
    // Notify both users about the deletion
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", { messageId });
    }
    
    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Test endpoint removed for security reasons

export default router; 