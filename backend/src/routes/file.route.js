import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import multer from 'multer';
import { uploadFileToGridFS, getFileStream, getFileFromGridFS } from '../lib/gridfs.js';
import crypto from 'crypto';
import Message from '../models/message.model.js';
import { getIO, getReceiverSocketId } from '../lib/socket.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Function to parse tags from text (same as in message controller)
function parseTags(text) {
  const tagPattern = /@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/;
  const match = tagPattern.exec(text);
  
  if (match) {
    const tag = match[1];
    const metadataString = match[2] || '';
    const metadata = new Map();
    
    if (metadataString) {
      const pairs = metadataString.split(',').map(pair => pair.trim());
      pairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          metadata.set(key, value);
        }
      });
    }
    
    return { tag, metadata };
  }
  
  return { tag: null, metadata: new Map() };
}

// Route to upload a file to GridFS
router.post('/upload/:receiverId', protectRoute, upload.single('file'), async (req, res) => {
  try {
    console.log('File upload request received');
    console.log('User from authentication:', req.user ? `ID: ${req.user._id}` : 'Not authenticated');
    
    if (!req.user) {
      console.error('User not authenticated in file upload route');
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);
    
    const { receiverId } = req.params;
    const senderId = req.user._id;
    const { originalname, mimetype, buffer, size } = req.file;
    const { text, replyTo } = req.body;

    console.log(`Uploading file from ${senderId} to ${receiverId}`);

    // Generate unique filename
    const filename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}-${originalname}`;
    console.log(`Generated filename: ${filename}`);
    
    try {
      // Upload to GridFS
      console.log('Uploading to GridFS...');
      const fileData = await uploadFileToGridFS(buffer, filename, mimetype);
      console.log('File uploaded to GridFS, data:', fileData);
      
      // Handle different GridFS response formats
      const fileId = fileData._id || fileData.id || fileData;
      console.log('File ID:', fileId);
      
      // Parse tags from text
      const { tag, metadata } = parseTags(text || '');
      
      // Create message with file data
      const newMessage = new Message({
        senderId,
        receiverId,
        text: text || '',
        file: {
          fileId: fileId.toString(),
          filename: filename,
          originalname: originalname,
          fileSize: size,
          fileType: mimetype,
          url: `/api/files/${fileId}`
        },
        replyTo: replyTo && replyTo !== 'no reply' ? replyTo : null,
        tag: tag,
        metadata: metadata
      });

      console.log('Saving message to database...');
      const savedMessage = await newMessage.save();
      
      // Populate the message before sending
      await savedMessage.populate("senderId", "username");
      await savedMessage.populate("receiverId", "username");
      if (savedMessage.replyTo) {
        await savedMessage.populate("replyTo");
      }
      
      console.log('Message saved, ID:', savedMessage._id);
      
      // Emit socket event for real-time updates
      const io = getIO();
      const receiverSocketId = getReceiverSocketId(receiverId);
      const senderSocketId = getReceiverSocketId(senderId);
      
      if (receiverSocketId) {
        console.log(`Emitting socket event to ${receiverId} via socket ${receiverSocketId}`);
        io.to(receiverSocketId).emit("newMessage", savedMessage);
      }
      if (senderSocketId && senderSocketId !== receiverSocketId) {
        io.to(senderSocketId).emit("newMessage", savedMessage);
      }
      
      console.log('Sending success response');
      return res.status(201).json(savedMessage);
    } catch (innerError) {
      console.error('Error in file processing:', innerError.message, innerError.stack);
      return res.status(500).json({ error: innerError.message, stack: innerError.stack });
    }
  } catch (error) {
    console.error('Error uploading file:', error.message, error.stack);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Route to handle chunked uploads (for future implementation)
router.post('/upload-chunk/:uploadId', protectRoute, upload.single('chunk'), async (req, res) => {
  // For future implementation of chunked uploads
  res.status(200).json({ message: 'Chunk received' });
});

// Route to stream a file from GridFS
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const fileStream = getFileStream(fileId);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      res.status(404).json({ error: 'File not found' });
    });
    
    // Get file metadata to set appropriate headers
    const files = await getFileFromGridFS(fileId);
    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[0];
    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 