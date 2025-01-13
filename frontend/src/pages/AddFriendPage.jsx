import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useFriendStore } from "../store/useFriendStore";
import { Search, ArrowLeft, UserPlus, Clock, Check, X, RefreshCw } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const AddFriendPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  
  const { 
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    clearSearchResults 
  } = useFriendStore();
  
  // Clear search results when unmounting
  useEffect(() => {
    return () => clearSearchResults();
  }, [clearSearchResults]);
  
  // Handle search with debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim() === "") {
      setSearchResults([]);
      return;
    }
    
    const delaySearch = setTimeout(() => {
      searchUsers(searchQuery);
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery]);
  
  // Direct API call to search users
  const searchUsers = async (query) => {
    try {
      setIsSearching(true);
      setError(null);
      
      console.log("Searching for users with query:", query);
      
      // Use axiosInstance which has proper CORS configuration
      const response = await axiosInstance.get(`/users/search?query=${encodeURIComponent(query)}`);
      console.log("Search results received:", response.data);
      
      // Set search results
      setSearchResults(response.data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Failed to find users. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleSendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId);
      // Update UI to show pending
      setSearchResults(results => 
        results.map(user => 
          user._id === userId 
            ? { ...user, hasPendingRequest: true } 
            : user
        )
      );
    } catch (error) {
      toast.error("Failed to send request");
    }
  };
  
  const handleAcceptRequest = async (userId) => {
    try {
      await acceptFriendRequest(userId);
      // Remove from search results
      setSearchResults(results => 
        results.filter(user => user._id !== userId)
      );
    } catch (error) {
      toast.error("Failed to accept request");
    }
  };
  
  const handleRejectRequest = async (userId) => {
    try {
      await rejectFriendRequest(userId);
      // Update UI
      setSearchResults(results => 
        results.map(user => 
          user._id === userId 
            ? { ...user, hasRequestedYou: false } 
            : user
        )
      );
    } catch (error) {
      toast.error("Failed to reject request");
    }
  };
  
  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="btn btn-circle btn-sm btn-ghost">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold">Add Friends</h1>
      </div>
      
      {/* Search input */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-500 mt-2">
          Search for users by their username or full name to send friend requests
        </p>
      </div>
      
      {/* Search results */}
      <div className="space-y-4">
        {isSearching ? (
          <div className="flex justify-center p-8">
            <div className="loading loading-spinner"></div>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <p className="text-error mb-4">{error}</p>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => searchUsers(searchQuery)}
            >
              <RefreshCw size={16} className="mr-2" /> Try Again
            </button>
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map(user => (
            <div key={user._id} className="flex items-center justify-between border border-base-300 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <img 
                  src={user.profilePic || "/avatar.png"} 
                  alt={user.fullName}
                  className="size-12 rounded-full object-cover" 
                />
                <div>
                  <h3 className="font-medium">{user.fullName}</h3>
                  <p className="text-sm text-zinc-500">@{user.username}</p>
                </div>
              </div>
              
              <div>
                {user.hasPendingRequest ? (
                  <button className="btn btn-sm btn-disabled flex items-center gap-2">
                    <Clock size={16} />
                    Request Sent
                  </button>
                ) : user.hasRequestedYou ? (
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-sm btn-success flex items-center gap-1"
                      onClick={() => handleAcceptRequest(user._id)}
                    >
                      <Check size={16} />
                      Accept
                    </button>
                    <button 
                      className="btn btn-sm btn-error flex items-center gap-1"
                      onClick={() => handleRejectRequest(user._id)}
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                ) : (
                  <button 
                    className="btn btn-sm btn-primary flex items-center gap-2"
                    onClick={() => handleSendRequest(user._id)}
                  >
                    <UserPlus size={16} />
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          ))
        ) : searchQuery ? (
          <div className="text-center p-8 text-zinc-500">
            No users found matching "{searchQuery}"
          </div>
        ) : (
          <div className="text-center p-8 text-zinc-500">
            Search for users to add them as friends
          </div>
        )}
      </div>
    </div>
  );
};

export default AddFriendPage; 