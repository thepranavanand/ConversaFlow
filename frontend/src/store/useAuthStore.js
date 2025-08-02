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
  
  userProfiles: {},

  updateUserProfile: (userId, profilePic) => {
    const userProfiles = { ...get().userProfiles };
    userProfiles[userId] = profilePic;
    set({ userProfiles });
    
    if (get().authUser && get().authUser._id === userId) {
      const updatedUser = { ...get().authUser, profilePic };
      set({ authUser: updatedUser });
    }
  },
  
  getUserProfilePic: (userId) => {
    if (get().userProfiles[userId]) {
      return get().userProfiles[userId];
    }
    if (get().authUser && get().authUser._id === userId) {
      return get().authUser.profilePic;
    }
    return "/avatar.png";
  },

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      
      const userProfiles = { ...get().userProfiles };
      userProfiles[res.data._id] = res.data.profilePic;
      set({ userProfiles });
      
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const response = await axios({
        method: 'post',
        url: 'http://localhost:5001/api/auth/signup',
        data: data,
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });
      
      set({ authUser: response.data });
      
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
      const response = await axios.post('http://localhost:5001/api/auth/login', data, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
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

  testLogin: async () => {
    set({ isLoggingIn: true });
    try {
      console.log('Using test login endpoint');
      
      const res = await axiosInstance.post("/auth/test-login");
      console.log('Test login successful, received data:', res.data);
      
      if (res.data.token) {
        localStorage.setItem("jwt", res.data.token);
      }
      
      set({ authUser: res.data });
      
      const userProfiles = { ...get().userProfiles };
      userProfiles[res.data._id] = res.data.profilePic;
      set({ userProfiles });
      
      toast.success("Test login successful");
      get().connectSocket();
    } catch (error) {
      console.error('Test login error:', error);
      toast.error("Test login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

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
      if (data.username) {
        console.log("Updating username to:", data.username);
        
        if (data.username.length < 3) {
          throw new Error("Username must be at least 3 characters");
        }
      }
      
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      
      const userProfiles = { ...get().userProfiles };
      userProfiles[res.data._id] = res.data.profilePic;
      set({ userProfiles });
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to update profile");
      throw error;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: { userId: authUser._id },
    });

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
