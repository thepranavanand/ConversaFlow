import { Server } from "socket.io";

let io;
const userSocketMap = {}; // {userId: socketId}

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", "http://localhost:3000"], // Allow both origins
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
      userSocketMap[userId] = socket.id;
      console.log("User socket map updated:", userSocketMap);
    }

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
      if (userId) {
        delete userSocketMap[userId];
        console.log("User removed from socket map:", userId);
        console.log("Updated socket map:", userSocketMap);
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
