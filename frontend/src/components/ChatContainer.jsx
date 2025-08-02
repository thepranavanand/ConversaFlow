import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import Message from "./Message";

const ChatContainer = ({ showExecutionGraph, setShowExecutionGraph }) => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  
  const { userProfiles, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [showAutoDeletionBanner, setShowAutoDeletionBanner] = useState(true);

  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
    }
    subscribeToMessages();
    
    return () => unsubscribeFromMessages();
  }, [selectedUser?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [userProfiles, authUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const closeBanner = () => {
    setShowAutoDeletionBanner(false);
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900">
        <ChatHeader />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto bg-gray-50 dark:bg-gray-900">
      <ChatHeader />
      
      {showAutoDeletionBanner && (
        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 flex items-center justify-between text-xs">
          <div className="flex items-center">
            <Clock size={12} className="mr-2" />
            <span>Messages are automatically deleted after 7 days for privacy.</span>
          </div>
          <button 
            onClick={closeBanner}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100 text-xs"
          >
            Got it
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((message, index) => (
          <Message 
            key={`${message._id}-${renderKey}`}
            message={message} 
            messageEndRef={index === messages.length - 1 ? messageEndRef : null}
          />
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
