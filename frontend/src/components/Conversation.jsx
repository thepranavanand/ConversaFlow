import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState } from "react";

const Conversation = ({ conversation }) => {
  const { authUser, onlineUsers, userProfiles } = useAuthStore();
  const { selectedUser, setSelectedUser } = useChatStore();
  const [profilePic, setProfilePic] = useState("/avatar.png");

  const isOnline = onlineUsers.includes(conversation._id);
  const isSelected = selectedUser?._id === conversation._id;
  
  // Ensure profile picture is always up to date
  useEffect(() => {
    if (!conversation || !conversation._id) return;
    
    const userId = conversation._id;
    const picSource = userProfiles[userId] || conversation.profilePic || "/avatar.png";
    
    console.log(`[Conversation] Setting profile for ${conversation.fullName}: ${picSource}`);
    setProfilePic(picSource);
  }, [conversation, userProfiles]);

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-base-200 
        ${isSelected ? "bg-base-200" : ""}
      `}
      onClick={() => setSelectedUser(conversation)}
    >
      {/* Avatar */}
      <div className="avatar">
        <div className="size-10 rounded-full relative">
          <img 
            src={profilePic}
            alt={conversation.fullName}
            onError={(e) => {
              console.log(`[Conversation] Profile image failed for ${conversation.fullName}`);
              e.target.src = "/avatar.png";
            }}
          />
          <span
            className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-100 
              ${isOnline ? "bg-green-500" : "bg-zinc-500"}
            `}
          ></span>
        </div>
      </div>

      {/* User info */}
      <div>
        <h3 className="font-medium">{conversation.fullName}</h3>
        <p className="text-sm text-base-content/70">{isOnline ? "Online" : "Offline"}</p>
      </div>
    </div>
  );
};
export default Conversation; 