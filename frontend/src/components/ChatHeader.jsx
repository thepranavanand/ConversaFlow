import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, getUserProfilePic, socket, userProfiles, authUser } = useAuthStore();
  const [profilePic, setProfilePic] = useState("/avatar.png");

  useEffect(() => {
    if (!selectedUser || !selectedUser._id) return;
    
    const userId = selectedUser._id;
    const picSource = userProfiles[userId] || selectedUser.profilePic || "/avatar.png";
    
    console.log(`[ChatHeader] Setting profile pic for user ${userId}: ${picSource}`);
    setProfilePic(picSource);
    
  }, [selectedUser, userProfiles]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleProfileUpdate = (data) => {
      console.log(`[ChatHeader] Received profile update:`, data);
      if (data.userId === selectedUser._id) {
        console.log(`[ChatHeader] Updating profile picture for ${selectedUser._id} to ${data.profilePic}`);
        setProfilePic(data.profilePic);
      }
    };

    socket.on("profileUpdate", handleProfileUpdate);
    
    return () => {
      socket.off("profileUpdate", handleProfileUpdate);
    };
  }, [socket, selectedUser]);

  if (!selectedUser) return null;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img 
                src={profilePic} 
                alt={selectedUser?.fullName} 
                onError={(e) => {
                  console.log("[ChatHeader] Profile image failed to load, using fallback");
                  e.target.src = "/avatar.png";
                }}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium">{selectedUser?.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser?._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
