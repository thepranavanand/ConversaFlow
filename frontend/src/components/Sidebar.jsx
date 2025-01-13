import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Search, UserPlus, Bell, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { friends, isLoading, getFriends, searchFriends } = useFriendStore();
  const { onlineUsers } = useAuthStore();
  const { friendRequests, getFriendRequests } = useFriendStore();
  
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  // Load friends and requests on component mount
  useEffect(() => {
    loadFriends().catch(err => {
      console.error("Could not load friends:", err);
      setError("Couldn't connect to server. Using app in offline mode.");
    });
    
    getFriendRequests().catch(err => {
      console.error("Could not load friend requests:", err);
    });
  }, []);
  
  const loadFriends = async () => {
    try {
      setError(null);
      await getFriends();
      return true;
    } catch (err) {
      console.error("Failed to load friends:", err);
      setError("Failed to load friends list");
      return false;
    }
  };
  
  // Handle search
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery) {
        searchFriends(searchQuery).catch(() => {
          // Search error is already handled in the store with toast
        });
      }
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery, searchFriends]);

  const filteredFriends = showOnlineOnly
    ? friends.filter((user) => onlineUsers.includes(user._id))
    : friends;

  if (isLoading && friends.length === 0) return <SidebarSkeleton />;

  return (
    <aside className="h-full border-r border-base-300 flex flex-col transition-all duration-200 min-w-0">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-6" />
            <span className="font-medium text-sm truncate">Friends</span>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/requests" 
              className="btn btn-circle btn-sm btn-ghost relative"
              title="Friend Requests"
            >
              <Bell size={18} />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </Link>
            <Link 
              to="/add-friend" 
              className="btn btn-circle btn-sm btn-ghost"
              title="Add Friend"
            >
              <UserPlus size={18} />
            </Link>
          </div>
        </div>
        
        {/* Search friends */}
        <div className="mt-3 relative">
          <div className="relative">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-sm input-bordered w-full pl-9 text-sm"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-zinc-500" />
          </div>
        </div>
        
        {/* Online filter toggle */}
        <div className="mt-3 flex items-center justify-between">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm truncate">Show online only</span>
          </label>
          <button 
            onClick={loadFriends} 
            className="btn btn-ghost btn-xs"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {friendRequests.length > 0 && (
          <div className="hidden lg:block px-4 py-2 mb-2">
            <Link to="/requests" className="w-full btn btn-sm btn-outline btn-primary flex justify-between">
              <span>Friend Requests</span>
              <span className="badge badge-primary">{friendRequests.length}</span>
            </Link>
          </div>
        )}
      
        {error ? (
          <div className="text-center p-4">
            <p className="text-error mb-2">{error}</p>
            <button onClick={loadFriends} className="btn btn-sm btn-outline">
              <RefreshCw size={14} className="mr-2" /> Try Again
            </button>
          </div>
        ) : filteredFriends.length > 0 ? (
          filteredFriends.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-full p-3 flex items-center gap-3
                hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative flex-shrink-0">
                <img
                  src={user.profilePic || "/avatar.png"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                )}
              </div>

              {/* User info - responsive to container width */}
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium truncate text-sm">{user.fullName}</div>
                <div className="text-xs text-zinc-400 truncate">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center text-zinc-500 py-4">
            {isLoading 
              ? "Loading friends..." 
              : searchQuery 
                ? "No friends match your search" 
                : "No friends yet. Add some friends!"}
          </div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
