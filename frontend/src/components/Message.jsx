import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";
import { File, Download, Reply, Trash2, CornerUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getBaseUrl } from "../lib/axios";
import toast from "react-hot-toast";
import MessageStatus from "./MessageStatus";
import SendingImageMessage from "./SendingImageMessage";
import SendingTextMessage from "./SendingTextMessage";
import ImageWithFallback from "./ImageWithFallback";

const Message = ({ message, messageEndRef }) => {
  const { authUser, userProfiles } = useAuthStore();
  const { selectedUser, deleteMessage, setReplyingTo } = useChatStore();
  const [senderProfile, setSenderProfile] = useState({
    pic: "/avatar.png",
    name: "User"
  });
  const [imageUrl, setImageUrl] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const isOwnMessage = (message.senderId === authUser._id) || 
                   (message.senderId?._id === authUser._id) ||
                   (message.senderId?.toString() === authUser._id?.toString()) ||
                   (message.senderId?._id?.toString() === authUser._id?.toString());

  // Mark message as read when it comes into view (for incoming messages)
  useEffect(() => {
    if (!isOwnMessage && message._id && !message._id.startsWith('temp_')) {
      const socket = useAuthStore.getState().socket;
      if (socket) {
        // Mark message as read
        socket.emit("markMessageRead", message._id);
      }
    }
  }, [message._id, isOwnMessage]);

  useEffect(() => {
    // Debug the message object to understand its structure (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log("[Message Debug]", { 
        messageId: message._id,
        senderId: message.senderId,
        senderIdId: message.senderId?._id,
        senderIdType: typeof message.senderId,
        authUserId: authUser._id,
        authUserIdType: typeof authUser._id,
        isOwn: message.senderId === authUser._id,
        isOwnId: message.senderId?._id === authUser._id,
        isOwnString: message.senderId?.toString() === authUser._id?.toString(),
        finalIsOwn: isOwnMessage,
        message: message
      });
    }
  }, [message, authUser]);

  // Function to ensure image path has the correct URL prefix
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    const BASE_URL = getBaseUrl();
    
    // Already a Cloudinary or absolute URL
    if (imagePath.startsWith('http')) return imagePath;
    
    // Local uploads path - fix double slash issue
    if (imagePath.startsWith('/uploads/')) {
      // Remove any double slashes that might occur
      const cleanPath = imagePath.replace(/\/+/g, '/');
      return `${BASE_URL}${cleanPath}`;
    }
    
    // Without leading slash
    if (imagePath.startsWith('uploads/')) return `${BASE_URL}/uploads/${imagePath.substring(8)}`;
    
    // Plain filename - assume it's in uploads
    return `${BASE_URL}/uploads/${imagePath}`;
  };
  
  // Set up sender profile and image URLs
  useEffect(() => {
    // Set up profile info
    const senderId = message.senderId?._id || message.senderId;
    const senderData = message.senderId;
    const profile = {
      pic: "/avatar.png",
      name: "User"
    };

    // Handle own messages
    if (senderId === authUser._id || senderId?.toString() === authUser._id?.toString()) {
      profile.pic = authUser.profilePic || "/avatar.png";
      profile.name = authUser.fullName || "You";
    } 
    // Handle others' messages - check if senderId is populated
    else if (senderData && typeof senderData === 'object' && senderData.fullName) {
      // SenderId is populated with user data
      profile.pic = senderData.profilePic || "/avatar.png";
      profile.name = senderData.fullName || "User";
    }
    // Handle others' messages - senderId is just an ID
    else if (selectedUser && (selectedUser._id === senderId || selectedUser._id?.toString() === senderId?.toString())) {
      profile.pic = selectedUser.profilePic || "/avatar.png";
      profile.name = selectedUser.fullName || "User";
    }

    // Try userProfiles as fallback
    if (profile.pic === "/avatar.png" && userProfiles[senderId]) {
      profile.pic = userProfiles[senderId];
    }
    
    console.log(`[Message] Setting sender profile for message ${message._id}:`, profile);
    setSenderProfile(profile);
    
    // Set up image URL if it exists
    if (message.image) {
      const url = getImageUrl(message.image);
      console.log(`[Message] Setting image URL for message ${message._id}: ${message.image} -> ${url}`);
      setImageUrl(url);
    }
  }, [message, authUser, selectedUser, userProfiles]);

  const handleDelete = async () => {
    try {
      console.log(`Attempting to delete message:`, {
        messageId: message._id,
        isOwnMessage,
        senderId: message.senderId,
        authUserId: authUser._id
      });
      
      if (isOwnMessage) {
        await deleteMessage(message._id);
      } else {
        toast.error("You can only delete your own messages");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");
    }
  };

  const handleReply = () => {
    setReplyingTo(message);
    setIsMenuOpen(false);
    
    // Explicitly focus the input field
    setTimeout(() => {
      const inputField = document.querySelector('form input[type="text"]');
      if (inputField) {
        inputField.focus();
      }
    }, 10);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setIsMenuOpen(!isMenuOpen);
  };

  const getTagStyle = (tag) => {
    const tagStyles = {
      taskRequest: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      statusUpdate: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      clarificationNeeded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      deadlineReminder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      bugReport: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      messageAcknowledged: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      urgentNotice: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      meetingSchedule: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      infoSharing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      workFeedback: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    };
    return tagStyles[tag] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getTagDisplayName = (tag) => {
    const tagDisplayNames = {
      taskRequest: 'Task Request',
      statusUpdate: 'Status Update',
      clarificationNeeded: 'Clarification Needed',
      deadlineReminder: 'Deadline Reminder',
      bugReport: 'Bug Report',
      messageAcknowledged: 'Message Acknowledged',
      urgentNotice: 'Urgent Notice',
      meetingSchedule: 'Meeting Schedule',
      infoSharing: 'Info Sharing',
      workFeedback: 'Work Feedback'
    };
    return tagDisplayNames[tag] || tag;
  };

  const cleanMessageText = (text, tag) => {
    if (!text || !tag) return text;
    
    // Remove the tag pattern from the message text
    const tagPattern = new RegExp(`@${tag}(?:\\s*\\[([^\\]]*)\\])?`, 'g');
    return text.replace(tagPattern, '').trim();
  };

  return (
    <div
      className={`chat ${isOwnMessage ? "chat-end" : "chat-start"} relative`}
      ref={messageEndRef}
      onContextMenu={handleContextMenu}
      data-message-id={message._id}
    >
      <div className="chat-image avatar">
        <div className="size-8 rounded-full border">
          <img
            src={senderProfile.pic}
            alt={`${senderProfile.name}'s profile`}
            onError={(e) => {
              console.log(`[Message] Profile image failed to load: ${senderProfile.pic}`);
              e.target.src = "/avatar.png";
            }}
            className="object-cover"
          />
        </div>
      </div>
      <div className="chat-header mb-1">
        <span className="font-medium text-sm mr-2">{senderProfile.name}</span>
        <time className="text-xs opacity-50">
          {formatMessageTime(message.createdAt)}
        </time>
      </div>

      {/* Reply context display if this message is a reply */}
      {message.replyTo && (
        <div className={`chat-bubble mb-1 opacity-70 bg-base-200 dark:bg-gray-700 flex items-center text-sm ${isOwnMessage ? "chat-bubble-primary bg-primary/30" : ""}`}>
          <CornerUpRight size={14} className="mr-2 text-primary" />
          <div className="truncate max-w-[200px]">
            {message.replyTo.text || 
             (message.replyTo.image && "Image") || 
             (message.replyTo.file && "File: " + message.replyTo.file.originalname)}
          </div>
        </div>
      )}

      {message.text && !(message.status === 'sending' && message.isOptimistic && message.image) && (
        <>
          {message.status === 'sending' && message.isOptimistic && !message.image ? (
            <SendingTextMessage text={message.text} />
          ) : (
            <div className="chat-bubble max-w-xs sm:max-w-sm md:max-w-md break-words text-sm leading-relaxed">
              <div>{message.tag ? cleanMessageText(message.text, message.tag) : message.text}</div>
              {message.tag && (
                <div className="mt-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagStyle(message.tag)}`}>
                      @{getTagDisplayName(message.tag)}
                    {message.metadata && Object.keys(message.metadata).length > 0 && 
                     Object.entries(message.metadata).filter(([key]) => key !== 'tag' && key !== 'timestamp').length > 0 && (
                      <span className="ml-1 opacity-75 text-xs">
                        [{Object.entries(message.metadata)
                          .filter(([key]) => key !== 'tag' && key !== 'timestamp')
                          .map(([key, value]) => `${key}:${value}`)
                          .join(', ')}]
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {message.image && (
        <>
          {message.status === 'sending' && message.isOptimistic ? (
            <SendingImageMessage imagePreview={message.image} text={message.text} />
          ) : (
            <div className="chat-bubble p-1">
              <ImageWithFallback
                src={imageUrl}
                fallbackSrc={message.originalBlobUrl}
                alt="message attachment"
                className="rounded-lg max-w-full max-h-[300px]"
                onError={(e) => {
                  console.error(`[Message] Failed to load image: ${message.image} → ${imageUrl}`);
                  
                  // Try to fetch the image directly to see response
                  fetch(imageUrl)
                    .then(response => console.log(`[Message] Image fetch test: ${response.status} ${response.statusText}`))
                    .catch(err => console.error(`[Message] Image fetch error: ${err}`));
                  
                  // Set a fallback image instead of just alt text
                  e.target.src = "/avatar.png"; // Use a placeholder image
                  e.target.classList.add("error-image");
                  e.target.style.opacity = "0.6";
                  e.target.style.maxHeight = "80px"; // Smaller fallback image
                }}
              />
            </div>
          )}
        </>
      )}

      {message.file && (
        <div className="chat-bubble flex items-center gap-2">
          <File className="w-5 h-5" />
          <a
            href={getImageUrl(message.file.url)}
            download={message.file.originalname}
            target="_blank"
            rel="noreferrer"
            className="hover:underline flex items-center gap-2"
          >
            <span>
              {message.file.originalname.length > 30
                ? message.file.originalname.substring(0, 30) + "..."
                : message.file.originalname}
            </span>
            <Download className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Message Status */}
      <MessageStatus status={message.status || 'sent'} isOwnMessage={isOwnMessage} />

      {/* Message Actions Menu */}
      {isMenuOpen && (
        <div 
          className={`absolute ${isOwnMessage ? 'left-0' : 'right-0'} top-10 bg-base-100 dark:bg-gray-800 shadow-lg rounded-lg p-2 z-10 border dark:border-gray-700`}
          onClick={e => e.stopPropagation()}
        >
          <div 
            className="flex items-center gap-2 p-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded cursor-pointer"
            onClick={handleReply}
          >
            <Reply size={16} />
            <span>Reply</span>
          </div>
          
          {isOwnMessage && (
            <div 
              className="flex items-center gap-2 p-2 hover:bg-base-200 dark:hover:bg-gray-700 text-red-500 rounded cursor-pointer"
              onClick={handleDelete}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </div>
          )}
        </div>
      )}

      {/* Message action buttons that appear on hover */}
      <div className={`message-actions absolute ${isOwnMessage ? 'left-0' : 'right-0'} -top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
        <button 
          onClick={handleReply}
          className="p-1.5 rounded-full bg-base-200 dark:bg-gray-700 hover:bg-primary/20"
          title="Reply"
        >
          <Reply size={14} />
        </button>
        
        {isOwnMessage && (
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded-full bg-base-200 dark:bg-gray-700 hover:bg-red-500/20 text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Message;