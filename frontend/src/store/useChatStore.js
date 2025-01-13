import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Try to get initial selected user from localStorage
const getInitialSelectedUser = () => {
  try {
    const savedUser = localStorage.getItem('selectedUser');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error('Error retrieving selected user from localStorage:', error);
    return null;
  }
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: getInitialSelectedUser(),
  replyingTo: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  optimisticMessages: [], // Store optimistic messages separately

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages, replyingTo } = get();
    try {
      // Only handle text messages through axiosInstance
      if (typeof messageData === 'string' || !messageData.image) {
        const reqData = {
          text: messageData.text || messageData,
        };
        
        // If replying to a message, include the replyTo field
        if (replyingTo) {
          console.log('Including reply context in message:', replyingTo._id);
          reqData.replyTo = replyingTo._id;
        }
        
        // Log the complete request
        console.log('Sending message with data:', reqData);
        
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, reqData);
        
        // Log the response
        console.log('Response from message send:', res.data);
        
        // Only clear the replyingTo state if the message was sent successfully
        set({ 
          messages: [...messages, res.data],
          replyingTo: null // Clear the replyingTo state after sending
        });
        
        // Refresh friends list to update order after sending message
        // Add slight delay to ensure message is saved to database first
        setTimeout(() => {
          import("../store/useFriendStore.js").then(({ useFriendStore }) => {
            const { getFriends } = useFriendStore.getState();
            getFriends().catch(err => {
              console.log("Failed to refresh friends order after sending:", err);
            });
          });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
    },

  // Add optimistic message immediately to UI
  addOptimisticMessage: (messageData) => {
    const { messages, optimisticMessages } = get();
    const { authUser } = useAuthStore.getState();
    
    const optimisticMessage = {
      _id: `temp_${Date.now()}_${Math.random()}`, // Temporary ID
      ...messageData,
      senderId: authUser._id,
      status: 'sending',
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    
    set({ 
      messages: [...messages, optimisticMessage],
      optimisticMessages: [...optimisticMessages, optimisticMessage]
    });
    
    return optimisticMessage._id;
  },

  // Update optimistic message status
  updateMessageStatus: (tempId, status, realMessage = null) => {
    const { messages, optimisticMessages } = get();
    
    if (realMessage) {
      // For images, preserve the blob URL temporarily to prevent flash
      const optimisticMsg = messages.find(msg => msg._id === tempId);
      const updatedRealMessage = { 
        ...realMessage, 
        status,
        // Keep blob URL for smooth transition if it's an image
        originalBlobUrl: optimisticMsg?.image?.startsWith('blob:') ? optimisticMsg.image : null
      };
      
      // Replace optimistic message with real message from server
      const updatedMessages = messages.map(msg => 
        msg._id === tempId ? updatedRealMessage : msg
      );
      const updatedOptimistic = optimisticMessages.filter(msg => msg._id !== tempId);
      
      set({ 
        messages: updatedMessages,
        optimisticMessages: updatedOptimistic
      });
    } else {
      // Just update status
      const updatedMessages = messages.map(msg => 
        msg._id === tempId ? { ...msg, status } : msg
      );
      
      set({ messages: updatedMessages });
    }
  },

  // Remove failed optimistic message
  removeOptimisticMessage: (tempId) => {
    const { messages, optimisticMessages } = get();
    
    const updatedMessages = messages.filter(msg => msg._id !== tempId);
    const updatedOptimistic = optimisticMessages.filter(msg => msg._id !== tempId);
    
    set({ 
      messages: updatedMessages,
      optimisticMessages: updatedOptimistic
    });
  },
  
  deleteMessage: async (messageId) => {
    try {
      const { authUser } = useAuthStore.getState();
      
      if (!authUser || !authUser._id) {
        toast.error("You must be logged in to delete messages");
        return;
      }
      
      console.log(`Attempting to delete message with ID: ${messageId}`);
      console.log(`Authenticated user ID: ${authUser._id}`);
      

      await axiosInstance.post(`/direct/message/delete/${messageId}`, { 
        senderId: authUser._id 
      });
      
      console.log(`Delete request completed for message: ${messageId}`);
      
      // Remove the message from state
      set((state) => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
      
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      console.error("Error details:", error.response?.data);
      toast.error("Failed to delete message: " + (error.response?.data?.error || error.message));
    }
  },
  
  setReplyingTo: (message) => {
    console.log('Setting reply context for message:', message?._id);
    set({ replyingTo: message });
    
    // Give the input field focus after a small delay to ensure the UI has updated
    setTimeout(() => {
      const inputField = document.querySelector('form input[type="text"]');
      if (inputField) {
        inputField.focus();
      }
    }, 50);
  },
  
  cancelReply: () => {
    set({ replyingTo: null });
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // Remove existing listeners
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageDelivered");
    socket.off("messageRead");
    socket.off("userOnline");
    socket.off("userOffline");

    // Listen for new messages
    socket.on("newMessage", (newMessage) => {

      
      const { selectedUser } = get();
      const { authUser } = useAuthStore.getState();
      
      if (!authUser) {
        console.log("No auth user, ignoring message");
        return;
      }
      
      // Extract sender and receiver IDs properly (handle both populated and non-populated)
      const senderId = newMessage.senderId?._id || newMessage.senderId;
      const receiverId = newMessage.receiverId?._id || newMessage.receiverId;
      
      console.log("Message senderId:", senderId, "receiverId:", receiverId);
      console.log("Auth user ID:", authUser._id);
      console.log("Selected user ID:", selectedUser?._id);
      
      // Check if this message belongs to current conversation
      const isForCurrentUser = receiverId === authUser._id || senderId === authUser._id;
      const isCurrentConversation = selectedUser && 
        (senderId === selectedUser._id || receiverId === selectedUser._id);
      
      console.log("Is for current user:", isForCurrentUser);
      console.log("Is current conversation:", isCurrentConversation);
      
      if (isForCurrentUser && isCurrentConversation) {
        const currentMessages = get().messages;
        const exists = currentMessages.find(msg => msg._id === newMessage._id);
        
        if (exists) {
          console.log("Message already exists, skipping");
          return;
        }
        
        // Only receivers should get socket events (senders use optimistic updates)
        const isReceiver = receiverId === authUser._id;
        if (isReceiver) {
          console.log("Adding new message to conversation (receiver)");
          set({ messages: [...currentMessages, newMessage] });
        } else {
          console.log("Ignoring message - sender uses optimistic updates");
        }
      } else {
        console.log("Message not for current conversation, ignoring");
      }
      
      // Refresh friends list to update order after any new message
      // This ensures the most recent conversation appears at the top
      // Add slight delay to ensure message is saved to database first
      setTimeout(() => {
        import("../store/useFriendStore.js").then(({ useFriendStore }) => {
          const { getFriends } = useFriendStore.getState();
          getFriends().catch(err => {
            console.log("Failed to refresh friends order:", err);
          });
        });
      }, 100);
    });

    // Handle message deletions
    socket.on("messageDeleted", (deletionData) => {
      const { messageId } = deletionData;
      
      // Remove the message from current conversation
      set((state) => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
    });

    // Handle message delivery status
    socket.on("messageDelivered", ({ messageId, userId }) => {
      const { messages } = get();
      const { authUser } = useAuthStore.getState();
      
      // Only update if this is our message that was delivered
      if (authUser && authUser._id !== userId) {
        const updatedMessages = messages.map(msg => 
          msg._id === messageId ? { ...msg, status: 'delivered' } : msg
        );
        set({ messages: updatedMessages });
      }
    });

    // Handle message read status
    socket.on("messageRead", ({ messageId, userId }) => {
      const { messages } = get();
      const { authUser } = useAuthStore.getState();
      
      // Only update if this is our message that was read
      if (authUser && authUser._id !== userId) {
        const updatedMessages = messages.map(msg => 
          msg._id === messageId ? { ...msg, status: 'read' } : msg
        );
        set({ messages: updatedMessages });
      }
    });

    // Handle user coming online - mark pending messages as delivered
    socket.on("userOnline", (onlineUserId) => {
      const { messages, selectedUser } = get();
      const { authUser } = useAuthStore.getState();
      
      if (selectedUser && onlineUserId === selectedUser._id) {
        const updatedMessages = messages.map(msg => {
          // Mark sent messages to this user as delivered
          if (msg.senderId === authUser._id && msg.receiverId === selectedUser._id && msg.status === 'sent') {
            return { ...msg, status: 'delivered' };
          }
          return msg;
        });
        set({ messages: updatedMessages });
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messageDelivered");
    socket.off("messageRead");
    socket.off("userOnline");
    socket.off("userOffline");
    socket.off("messagesAutoDeleted");
  },

  setSelectedUser: (selectedUser) => {
    // Save to localStorage when user is selected
    if (selectedUser) {
      localStorage.setItem('selectedUser', JSON.stringify(selectedUser));
    } else {
      // Remove from localStorage when user is deselected
      localStorage.removeItem('selectedUser');
    }
    // Clear the replying state when changing users
    set({ selectedUser, replyingTo: null });
  },
}));
