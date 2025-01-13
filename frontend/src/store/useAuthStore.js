import { create } from "zustand";
import axios from "axios";
import { axiosInstance, getBaseUrl } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  
  // Map to store user profile pics for quick access
  userProfiles: {},

  // Update a user's profile picture in the cache
  updateUserProfile: (userId, profilePic) => {
    const userProfiles = { ...get().userProfiles };
    userProfiles[userId] = profilePic;
    set({ userProfiles });
    
    // If it's the auth user, update that too
    if (get().authUser && get().authUser._id === userId) {
      const updatedUser = { ...get().authUser, profilePic };
      set({ authUser: updatedUser });
    }
  },
  
  // Get a user's profile picture from cache or fallback
  getUserProfilePic: (userId) => {
    if (get().userProfiles[userId]) {
      return get().userProfiles[userId];
    }
    if (get().authUser && get().authUser._id === userId) {
      return get().authUser.profilePic;
    }
    return "/avatar.png"; // Default avatar
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      
      // Initialize user profiles map with auth user
      const userProfiles = { ...get().userProfiles };
      userProfiles[res.data._id] = res.data.profilePic;
      set({ userProfiles });
      
      get().connectSocket();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error in checkAuth:", error);
      }
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      // Use axios directly with full URL
      const response = await axios({
        method: 'post',
        url: 'http://localhost:5001/api/auth/signup',
        data: data,
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });
      
      set({ authUser: response.data });
      
      // Add to user profiles map
      const userProfiles = { ...get().userProfiles };
      userProfiles[response.data._id] = response.data.profilePic;
      set({ userProfiles });
      
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = error.response?.data?.message || "Failed to create account";
      toast.error(errorMessage);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      // Simple direct axios call
      const response = await axios.post('http://localhost:5001/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      // Store token
      if (response.data.token) {
        localStorage.setItem("jwt", response.data.token);
      }
      
      set({ authUser: response.data });
      
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Invalid username or password");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // Test login function removed for security reasons

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      // Check if we're updating username to validate first
      if (data.username) {
        console.log("Updating username to:", data.username);
        
        // Username validation
        if (data.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }
      }
      
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      
      // Update in profiles map
      const userProfiles = { ...get().userProfiles };
      userProfiles[res.data._id] = res.data.profilePic;
      set({ userProfiles });
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to update profile");
      throw error; // Rethrow for component handling
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    console.log("Connecting socket for user:", authUser._id);

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true
    });

    set({ socket: socket });

    socket.on("connect", () => {
      console.log("Socket connected successfully:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("getOnlineUsers", (userIds) => {
      console.log("Online users updated:", userIds);
      set({ onlineUsers: userIds });
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
