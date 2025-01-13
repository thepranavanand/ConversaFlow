import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, getIO, getUserSocketMap } from "../lib/socket.js";

const parseTags = (text) => {
  if (!text) {
    return { tags: [], metadata: new Map() };
  }
  
  const tagPattern = /@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/;
  const tags = [];
  const metadata = new Map();
  
  // Only find the FIRST tag match, ignore subsequent ones
  const match = tagPattern.exec(text);
  if (match) {
    const tag = match[1];
    const metadataStr = match[2];
    
    tags.push(tag);
    
    // Parse metadata if present (format: assignee:developer,priority:high)
    if (metadataStr) {
      const metaPairs = metadataStr.split(',').map(pair => pair.trim());
      metaPairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          metadata.set(key, value);
        }
      });
    }
    
    // Add default metadata
    metadata.set('tag', tag);
    metadata.set('timestamp', new Date().toISOString());
  }
  
  return { tags, metadata };
};

const extractLinkedMessage = (text, replyTo) => {
  // If it's a reply, link to the replied message
  if (replyTo) return replyTo;
  
  // Look for message references like "ref:messageId" or "#messageId"
  const refPattern = /(?:ref:|#)([a-f0-9]{24})/i;
  const match = text.match(refPattern);
  return match ? match[1] : null;
};

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {

    
    const { text, image, replyTo } = req.body;
    const { id: receiverId } = req.params;
    
    // ALWAYS use the authenticated user's ID, never trust client-provided senderId
    const senderId = req.user._id;
    
    const io = getIO();

    let imageUrl;
    
    // Handle file upload from multer
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } 
    // Handle base64 image from body
    else if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat_images",
        quality: "auto:good",
        fetch_format: "auto",
        flags: "progressive"
      });
      imageUrl = uploadResponse.secure_url;
    }

    const { tags, metadata } = parseTags(text);
    const linkedMessage = extractLinkedMessage(text, replyTo);

    const newMessage = new Message({
      senderId,  // This is now guaranteed to be from req.user._id
      receiverId,
      text: text || '',
      image: imageUrl,
      replyTo: replyTo || null,
      tag: tags[0] || null,
      metadata: Object.fromEntries(metadata),
      linked_to: linkedMessage
    });

    await newMessage.save();

    // Populate the message for response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'fullName profilePic')
      .populate('receiverId', 'fullName profilePic')
      .populate('replyTo', 'text image file')
      .populate('linked_to', 'text tag');



    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId.toString());
    
    // Set delivery status based on receiver's online status
    let deliveryStatus = 'sent';
    if (receiverSocketId) {
      deliveryStatus = 'delivered';
      populatedMessage.status = 'delivered';
      populatedMessage.deliveredAt = new Date();
      await populatedMessage.save();
    }
    
    // Emit to receiver if they're online
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTaggedMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { tag } = req.query;

    let filter = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      tag: { $ne: null }
    };

    if (tag && tag !== 'all') {
      filter.tag = tag;
    }

    const taggedMessages = await Message.find(filter)
      .populate('senderId', 'fullName profilePic')
      .populate('receiverId', 'fullName profilePic')
      .populate('replyTo', 'text tag senderId receiverId createdAt')
      .populate('linked_to', 'text tag senderId receiverId createdAt')
      .sort({ createdAt: 1 });

    // Create a result array that includes both tagged messages and their context
    const messagesWithContext = [];
    const addedMessageIds = new Set();

    for (const taggedMsg of taggedMessages) {
      // Add the original message if this is a reply and we haven't added it yet
      if (taggedMsg.replyTo && !addedMessageIds.has(taggedMsg.replyTo._id.toString())) {
        // Populate the replyTo message fully
        const originalMessage = await Message.findById(taggedMsg.replyTo._id)
          .populate('senderId', 'fullName profilePic')
          .populate('receiverId', 'fullName profilePic');
        
        if (originalMessage) {
          messagesWithContext.push({
            ...originalMessage.toObject(),
            isContext: true, // Flag to indicate this is context for a tagged message
            relatedTaggedMessage: taggedMsg._id
          });
          addedMessageIds.add(originalMessage._id.toString());
        }
      }

      // Add the tagged message
      if (!addedMessageIds.has(taggedMsg._id.toString())) {
        messagesWithContext.push({
          ...taggedMsg.toObject(),
          isContext: false
        });
        addedMessageIds.add(taggedMsg._id.toString());
      }
    }

    // Sort by creation time to maintain chronological order
    messagesWithContext.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(messagesWithContext);
  } catch (error) {
    console.log("Error in getTaggedMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    // Find the message and check permissions
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Enhanced permission logic for tagged messages
    const isCreator = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();
    const isTaggedMessage = message.tag !== null;
    
    if (isTaggedMessage) {
      // For tagged messages: both participants can delete (configurable)
      const allowBothUsersToDelete = true; // This could be a user setting in the future
      
      if (allowBothUsersToDelete) {
        // Both sender and receiver can delete tagged messages
        if (!isCreator && !isReceiver) {
          return res.status(403).json({ error: "You can only delete messages from your conversations" });
        }
      } else {
        // Only creator can delete
        if (!isCreator) {
          return res.status(403).json({ error: "Only the creator can delete this tagged message" });
        }
      }
    } else {
      // For regular messages: only creator can delete
      if (!isCreator) {
        return res.status(403).json({ error: "You can only delete your own messages" });
      }
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    // Real-time sync: emit deletion event to both users
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    
    const deletionData = {
      messageId: messageId,
      deletedBy: userId.toString(),
      isTagged: isTaggedMessage,
      tag: message.tag
    };
    
    // Emit to both participants
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", deletionData);
    }
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("messageDeleted", deletionData);
    }
    
    res.status(200).json({ 
      message: "Message deleted successfully",
      isTagged: isTaggedMessage,
      tag: message.tag 
    });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
