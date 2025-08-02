import { MessageSquare, UserPlus } from "lucide-react";
import { useFriendStore } from "../store/useFriendStore";
import { Link } from "react-router-dom";

const NoChatSelected = () => {
  const { friendRequests } = useFriendStore();
  
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center
             justify-center animate-bounce"
            >
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold">Welcome to Conversa!</h2>
        <p className="text-base-content/60 mb-4">
          Select a conversation from the sidebar to start chatting
        </p>
        
        {friendRequests.length > 0 && (
          <div className="alert alert-info shadow-lg">
            <div className="flex items-center">
              <UserPlus className="size-5" />
              <div>
                <h3 className="font-bold">Friend Requests!</h3>
                <div className="text-xs">You have {friendRequests.length} pending friend {friendRequests.length === 1 ? 'request' : 'requests'}</div>
              </div>
            </div>
            <Link to="/requests" className="btn btn-sm btn-primary">
              View Requests
            </Link>
          </div>
        )}
        
        {!friendRequests.length && (
          <Link to="/add-friend" className="btn btn-outline">
            <UserPlus className="size-5 mr-2" />
            Find Friends
          </Link>
        )}
      </div>
    </div>
  );
};

export default NoChatSelected;
