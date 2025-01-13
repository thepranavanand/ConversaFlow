import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserCheck, UserX, RefreshCw } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import toast from "react-hot-toast";

const FriendRequestsPage = () => {
  const { friendRequests, getFriendRequests, acceptFriendRequest, rejectFriendRequest } = useFriendStore();
  
  useEffect(() => {
    loadFriendRequests();
  }, []);
  
  const loadFriendRequests = async () => {
    try {
      await getFriendRequests();
    } catch (error) {
      toast.error("Failed to load friend requests");
    }
  };
  
  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="btn btn-circle btn-sm btn-ghost">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold">Friend Requests</h1>
        </div>
        <button 
          onClick={loadFriendRequests} 
          className="btn btn-sm btn-ghost"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      {friendRequests.length === 0 ? (
        <div className="text-center p-12 bg-base-200 rounded-lg">
          <p className="text-zinc-500">You don't have any friend requests at the moment.</p>
          <Link to="/add-friend" className="btn btn-primary mt-4">Find Friends</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {friendRequests.map((request) => (
            <div 
              key={request._id} 
              className="flex items-center justify-between border border-base-300 p-4 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={request.user.profilePic || "/avatar.png"} 
                  alt={request.user.fullName}
                  className="size-12 rounded-full object-cover" 
                />
                <div>
                  <h3 className="font-medium">{request.user.fullName}</h3>
                  <p className="text-sm text-zinc-500">@{request.user.username}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  className="btn btn-sm btn-success flex items-center gap-1"
                  onClick={() => acceptFriendRequest(request.user._id)}
                >
                  <UserCheck size={16} />
                  Accept
                </button>
                <button 
                  className="btn btn-sm btn-outline btn-error flex items-center gap-1"
                  onClick={() => rejectFriendRequest(request.user._id)}
                >
                  <UserX size={16} />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendRequestsPage; 