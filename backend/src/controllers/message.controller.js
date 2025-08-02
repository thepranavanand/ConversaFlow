import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, getIO } from "../lib/socket.js";

const parseTags = (text) => {
  console.log('parseTags called with text:', text);
  if (!text) {
    console.log('No text provided to parseTags');
    return { tags: [], metadata: new Map() };
  }
  
  const tagPattern = /@(task|decision|deadline|defer|confirm|wait|done|fail|abort|retry)(?:\s*\[([^\]]*)\])?/;
  const tags = [];
  const metadata = new Map();
  
  console.log('Using regex pattern:', tagPattern);
  
  const match = tagPattern.exec(text);
  if (match) {
    console.log('Found first tag match:', match);
    const tag = match[1];
    const metadataStr = match[2];
    
    tags.push(tag);
    
    if (metadataStr) {
      const metaPairs = metadataStr.split(',').map(pair => pair.trim());
      metaPairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        if (key && value) {
          metadata.set(key, value);
        }
      });
    }
    
    metadata.set('tag', tag);
    metadata.set('timestamp', new Date().toISOString());
  }
  
  console.log('Final parsed tags:', tags);
  console.log('Final parsed metadata:', Object.fromEntries(metadata));
  
  return { tags, metadata };
};

const extractLinkedMessage = (text, replyTo) => {
  if (replyTo) return replyTo;
  
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
    console.log('SendMessage controller called with body:', req.body);
    console.log('File from multer:', req.file);
    console.log('Authenticated user:', req.user);
    
    const { text, image, replyTo } = req.body;
    const { id: receiverId } = req.params;
    
    const senderId = req.user._id;
    console.log('Using senderId from auth:', senderId);
    
    const io = getIO();

    let imageUrl;
    
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      console.log('File upload detected, imageUrl:', imageUrl);
    } 
    else if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
      console.log('Base64 image upload, imageUrl:', imageUrl);
    }

    const { tags, metadata } = parseTags(text);
    const linkedMessage = extractLinkedMessage(text, replyTo);
    
    console.log('Parsed tags:', tags);
    console.log('Parsed metadata:', metadata);

    const newMessage = new Message({
      senderId,
      receiverId,
      text: text || '',
      image: imageUrl,
      replyTo: replyTo || null,
      tag: tags[0] || null,
      metadata: Object.fromEntries(metadata),
      linked_to: linkedMessage
    });

    console.log('Message to save:', newMessage);
    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'fullName profilePic')
      .populate('receiverId', 'fullName profilePic')
      .populate('replyTo', 'text image file')
      .populate('linked_to', 'text tag');

    console.log('Saved message with senderId:', populatedMessage.senderId);
    console.log('Message senderId type:', typeof populatedMessage.senderId);
    console.log('ReceiverID:', receiverId, 'SenderID:', senderId);

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);
    
    console.log('Receiver socket ID:', receiverSocketId);
    console.log('Sender socket ID:', senderSocketId);
    
    if (receiverSocketId) {
      console.log(`Emitting newMessage to receiver ${receiverId} via socket ${receiverSocketId}`);
      io.to(receiverSocketId).emit("newMessage", populatedMessage);
    } else {
      console.log(`No socket found for receiver ${receiverId}`);
    }
    
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      console.log(`Emitting newMessage to sender ${senderId} via socket ${senderSocketId}`);
      io.to(senderSocketId).emit("newMessage", populatedMessage);
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

    const messagesWithContext = [];
    const addedMessageIds = new Set();

    for (const taggedMsg of taggedMessages) {
      if (taggedMsg.replyTo && !addedMessageIds.has(taggedMsg.replyTo._id.toString())) {
        const originalMessage = await Message.findById(taggedMsg.replyTo._id)
          .populate('senderId', 'fullName profilePic')
          .populate('receiverId', 'fullName profilePic');
        
        if (originalMessage) {
          messagesWithContext.push({
            ...originalMessage.toObject(),
            isContext: true,
            relatedTaggedMessage: taggedMsg._id
          });
          addedMessageIds.add(originalMessage._id.toString());
        }
      }

      if (!addedMessageIds.has(taggedMsg._id.toString())) {
        messagesWithContext.push({
          ...taggedMsg.toObject(),
          isContext: false
        });
        addedMessageIds.add(taggedMsg._id.toString());
      }
    }

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

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const isCreator = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();
    const isTaggedMessage = message.tag !== null;
    
    if (isTaggedMessage) {
      const allowBothUsersToDelete = true;
      
      if (allowBothUsersToDelete) {
        if (!isCreator && !isReceiver) {
          return res.status(403).json({ error: "You can only delete messages from your conversations" });
        }
      } else {
        if (!isCreator) {
          return res.status(403).json({ error: "Only the creator can delete this tagged message" });
        }
      }
    } else {
      if (!isCreator) {
        return res.status(403).json({ error: "You can only delete your own messages" });
      }
    }

    await Message.findByIdAndDelete(messageId);
    
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    
    const deletionData = {
      messageId: messageId,
      deletedBy: userId.toString(),
      isTagged: isTaggedMessage,
      tag: message.tag
    };
    
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
