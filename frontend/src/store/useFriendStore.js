import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useFriendStore = create((set, get) => ({
  friends: [],
  friendRequests: [],
  searchResults: [],
  isLoading: false,
  isSearching: false,
  
  // Get all friends
  getFriends: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/friends");
      set({ friends: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to get friends");
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Get all friend requests
  getFriendRequests: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/users/friend-requests");
      set({ friendRequests: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to get friend requests");
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Search for users to add as friends
  searchUsers: async (query) => {
    if (!query || query.trim() === "") {
      set({ searchResults: [] });
      return;
    }
    
    set({ isSearching: true });
    try {
      const res = await axiosInstance.get(`/users/search?query=${encodeURIComponent(query)}`);
      set({ searchResults: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to search users");
    } finally {
      set({ isSearching: false });
    }
  },
  
  // Search existing friends
  searchFriends: async (query) => {
    if (!query || query.trim() === "") {
      await get().getFriends();
      return;
    }
    
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/users/search-friends?query=${encodeURIComponent(query)}`);
      set({ friends: res.data });
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to search friends");
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Send a friend request
  sendFriendRequest: async (userId) => {
    try {
      await axiosInstance.post(`/users/friend-request/${userId}`);
      
      // Update the search results to reflect the sent request
      set(state => ({
        searchResults: state.searchResults.map(user => 
          user._id === userId 
            ? { ...user, hasPendingRequest: true } 
            : user
        )
      }));
      
      toast.success("Friend request sent");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to send friend request");
    }
  },
  
  // Accept a friend request
  acceptFriendRequest: async (userId) => {
    try {
      await axiosInstance.put(`/users/friend-request/${userId}/accept`);
      
      // Remove the request from the list and refresh friends
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req.user._id !== userId)
      }));
      
      await get().getFriends();
      toast.success("Friend request accepted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to accept friend request");
    }
  },
  
  // Reject a friend request
  rejectFriendRequest: async (userId) => {
    try {
      await axiosInstance.put(`/users/friend-request/${userId}/reject`);
      
      // Remove the request from the list
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req.user._id !== userId)
      }));
      
      toast.success("Friend request rejected");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to reject friend request");
    }
  },
  
  // Reset search results
  clearSearchResults: () => {
    set({ searchResults: [] });
  }
})); 