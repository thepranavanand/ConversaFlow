import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

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
      if (typeof messageData === 'string' || !messageData.image) {
        const reqData = {
          text: messageData.text || messageData,
        };
        
        if (replyingTo) {
          console.log('Including reply context in message:', replyingTo._id);
          reqData.replyTo = replyingTo._id;
        }
        
        console.log('Sending message with data:', reqData);
        
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, reqData);
        
        console.log('Response from message send:', res.data);
        
        set({ 
          messages: [...messages, res.data],
          replyingTo: null
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
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

    socket.off("newMessage");
    socket.off("messageDeleted");

    socket.on("newMessage", (newMessage) => {
      const { selectedUser } = get();
      const { authUser } = useAuthStore.getState();
      
      if (!selectedUser || !authUser) return;
      
      const belongsToConversation = 
        (newMessage.senderId === selectedUser._id || newMessage.senderId?._id === selectedUser._id) ||
        (newMessage.receiverId === selectedUser._id);
      
      if (belongsToConversation) {
        const currentMessages = get().messages;
        const exists = currentMessages.find(msg => msg._id === newMessage._id);
        
        if (!exists) {
          set({ messages: [...currentMessages, newMessage] });
        }
      }
    });

    socket.on("messageDeleted", (deletionData) => {
      const { messageId } = deletionData;
      
      set((state) => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("messagesAutoDeleted");
  },

  setSelectedUser: (selectedUser) => {
    if (selectedUser) {
      localStorage.setItem('selectedUser', JSON.stringify(selectedUser));
    } else {
      localStorage.removeItem('selectedUser');
    }
    set({ selectedUser, replyingTo: null });
  },
}));
