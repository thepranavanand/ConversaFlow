import { Server } from "socket.io";
import Message from "../models/message.model.js";

let io;
const userSocketMap = {}; // {userId: socketId}

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://localhost:3001"],
      credentials: true,
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    
    const userId = socket.handshake.query.userId;
    console.log("User connecting with ID:", userId);
    
    if (userId) {
      // Convert to string to ensure consistency
      const userIdStr = userId.toString();
      userSocketMap[userIdStr] = socket.id;
      console.log("User socket map updated:", userSocketMap);
      
      // Emit delivery status for messages sent to this user
      socket.broadcast.emit("userOnline", userIdStr);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle message read status
    socket.on("markMessageRead", async (messageId) => {
      const userIdStr = userId ? userId.toString() : null;
      console.log(`Message ${messageId} read by user ${userIdStr}`);
      
      try {
        // Update message status to 'read' and set readAt timestamp
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { 
            status: 'read',
            readAt: new Date()
          },
          { new: true }
        );
        
        if (updatedMessage) {
          // Broadcast to sender that their message was read
          socket.broadcast.emit("messageRead", { messageId, userId: userIdStr });
        }
      } catch (error) {
        console.error(`Error updating message read status:`, error);
      }
    });

    // Handle message delivery confirmation
    socket.on("confirmDelivery", (messageId) => {
      const userIdStr = userId ? userId.toString() : null;
      console.log(`Message ${messageId} delivered to user ${userIdStr}`);
      socket.broadcast.emit("messageDelivered", { messageId, userId: userIdStr });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      if (userId) {
        const userIdStr = userId.toString();
        delete userSocketMap[userIdStr];
        console.log("User removed from socket map:", userIdStr);
        console.log("Updated socket map:", userSocketMap);
        
        // Emit user offline status
        socket.broadcast.emit("userOffline", userIdStr);
      }
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

export function getUserSocketMap() {
  return userSocketMap;
}
