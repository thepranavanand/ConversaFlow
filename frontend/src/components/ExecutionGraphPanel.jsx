import { useEffect, useState, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Filter, Download, X, ChevronLeft, ChevronDown, ChevronRight, Trash2, User, RefreshCw } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ExecutionGraphPanel = ({ setShowExecutionGraph }) => {
  const [taggedMessages, setTaggedMessages] = useState([]);
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { selectedUser } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const prevSelectedUserRef = useRef(null);

  const tagTypes = ['all', 'taskRequest', 'statusUpdate', 'clarificationNeeded', 'deadlineReminder', 'bugReport', 'messageAcknowledged', 'urgentNotice', 'meetingSchedule', 'infoSharing', 'workFeedback'];

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

  const fetchTaggedMessages = async (tagFilter = 'all') => {
    if (!selectedUser?._id) return;
    
    setIsRefreshing(true);
    try {
      console.log('Fetching tagged messages for user:', selectedUser._id, 'filter:', tagFilter);
      const response = await axiosInstance.get(`/messages/${selectedUser._id}/tagged`, {
        params: { tag: tagFilter }
      });
      console.log('Fetched tagged messages:', response.data.length);
      setTaggedMessages(response.data);
    } catch (error) {
      console.error("Error fetching tagged messages:", error);
      toast.error("Failed to fetch tagged messages");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedUser && selectedUser._id !== prevSelectedUserRef.current) {
      fetchTaggedMessages(selectedTagFilter);
      prevSelectedUserRef.current = selectedUser._id;
    }
  }, [selectedUser, selectedTagFilter]);

  // Auto-refresh mechanism as fallback for real-time updates
  useEffect(() => {
    if (!selectedUser) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing execution graph...');
      fetchTaggedMessages(selectedTagFilter);
    }, 3000); // Refresh every 3 seconds for better responsiveness

    return () => clearInterval(interval);
  }, [selectedUser, selectedTagFilter]);

  // Real-time sync for message additions and deletions
  useEffect(() => {
    if (!socket) {
      console.log('ExecutionGraph: No socket available');
      return;
    }
    
    console.log('ExecutionGraph: Setting up socket listeners, socket connected:', socket.connected);

    const handleNewMessage = (newMessage) => {
      console.log('ExecutionGraph received newMessage:', newMessage);
      console.log('Message has tag:', newMessage.tag);
      console.log('Current selectedUser:', selectedUser?._id);
      console.log('Message senderId:', newMessage.senderId?._id || newMessage.senderId);
      console.log('Message receiverId:', newMessage.receiverId?._id || newMessage.receiverId);
      
      // Only add if message has a tag and belongs to current conversation
      if (newMessage.tag && selectedUser) {
        const senderMatch = newMessage.senderId === selectedUser._id || newMessage.senderId?._id === selectedUser._id;
        const receiverMatch = newMessage.receiverId === selectedUser._id || newMessage.receiverId?._id === selectedUser._id;
        const isFromAuthUser = newMessage.senderId === authUser._id || newMessage.senderId?._id === authUser._id;
        
        const belongsToConversation = senderMatch || receiverMatch || isFromAuthUser;
        
        console.log('Belongs to conversation:', belongsToConversation);
        console.log('Sender match:', senderMatch);
        console.log('Receiver match:', receiverMatch);
        console.log('Is from auth user:', isFromAuthUser);
        
        if (belongsToConversation) {
          // Check if message matches current filter
          const matchesFilter = selectedTagFilter === 'all' || newMessage.tag === selectedTagFilter;
          console.log('Matches filter:', matchesFilter, 'Filter:', selectedTagFilter, 'Tag:', newMessage.tag);
          
          if (matchesFilter) {
            console.log('Adding message to execution graph');
            // Add to execution graph if not already exists
            setTaggedMessages(prev => {
              const exists = prev.find(msg => msg._id === newMessage._id);
              if (!exists) {
                const updated = [...prev, newMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                console.log('Updated tagged messages count:', updated.length);
                return updated;
              }
              console.log('Message already exists, not adding');
              return prev;
            });
          }
        }
      } else {
        console.log('Message ignored - no tag or no selected user');
      }
    };

    const handleMessageDeleted = (deletionData) => {
      const { messageId, deletedBy, isTagged, tag } = deletionData;
      
      if (isTagged) {
        // Find the deleted message to get user info
        const deletedMessage = taggedMessages.find(msg => msg._id === messageId);
        
        // Remove from execution graph
        setTaggedMessages(prev => prev.filter(msg => msg._id !== messageId));
        
        // Show contextual message
        const contextualMessages = {
          'taskRequest': 'Task request completed',
          'statusUpdate': 'Status updated',
          'clarificationNeeded': 'Clarification provided', 
          'deadlineReminder': 'Deadline reminder handled',
          'bugReport': 'Bug report addressed',
          'messageAcknowledged': 'Message acknowledged',
          'urgentNotice': 'Urgent notice resolved',
          'meetingSchedule': 'Meeting scheduled',
          'infoSharing': 'Information shared',
          'workFeedback': 'Feedback provided'
        };
        
        const isOwnDeletion = deletedBy === authUser._id;
        let message = contextualMessages[tag] || 'Tagged message updated!';
        
        if (!isOwnDeletion) {
          // Try multiple sources for the user name
          let userName = 'other user';
          
          // 1. Check if it's the selectedUser
          if (selectedUser && selectedUser._id === deletedBy) {
            userName = selectedUser.fullName || selectedUser.username;
          }
          // 2. Check the deleted message's sender info
          else if (deletedMessage && deletedMessage.senderId) {
            if (typeof deletedMessage.senderId === 'object') {
              userName = deletedMessage.senderId.fullName || deletedMessage.senderId.username;
            }
          }
          // 3. Check the deleted message's receiver info  
          else if (deletedMessage && deletedMessage.receiverId) {
            if (typeof deletedMessage.receiverId === 'object') {
              userName = deletedMessage.receiverId.fullName || deletedMessage.receiverId.username;
            }
          }
          // 4. Fallback to users list
          else {
            const { users } = useChatStore.getState();
            const deletedByUser = users.find(user => user._id === deletedBy);
            userName = deletedByUser?.fullName || deletedByUser?.username || 'other user';
          }
          
          message += ` (by ${userName})`;
        }
          
        toast.success(message);
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, authUser._id, taggedMessages, selectedUser, selectedTagFilter]);

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const scrollToMessage = (messageId) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 2000);
    }
  };

  const deleteTaggedMessage = async (messageId) => {
    try {
      const response = await axiosInstance.delete(`/messages/${messageId}`);
      
      // The real-time sync will handle removing the message from the list
      // and showing the contextual message, so we don't need to do it here
      
    } catch (error) {
      console.error("Error deleting message:", error);
      
      // Show specific error messages based on the response
      if (error.response?.status === 403) {
        toast.error(error.response.data.error || "You don't have permission to delete this message");
      } else {
        toast.error("Failed to delete message");
      }
    }
  };

  const exportData = (format) => {
    if (format === 'json') {
      const dataStr = JSON.stringify(taggedMessages, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `execution-graph-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'markdown') {
      let markdown = `# Execution Graph - ${selectedUser?.fullName || 'Chat'}\n\n`;
      taggedMessages.forEach(msg => {
        const cleanText = msg.text?.replace(/@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/g, '').trim();
                  markdown += `## @${getTagDisplayName(msg.tag)}\n`;
        markdown += `**Time:** ${new Date(msg.createdAt).toLocaleString()}\n`;
        markdown += `**From:** ${msg.senderId?.fullName || 'Unknown'}\n`;
        if (msg.metadata && Object.keys(msg.metadata).length > 0) {
          const metaEntries = Object.entries(msg.metadata).filter(([key]) => key !== 'tag' && key !== 'timestamp');
          if (metaEntries.length > 0) {
            markdown += `**Metadata:** ${metaEntries.map(([key, value]) => `${key}:${value}`).join(', ')}\n`;
          }
        }
        markdown += `**Content:** ${cleanText}\n\n`;
      });
      
      const dataBlob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `execution-graph-${new Date().toISOString().split('T')[0]}.md`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getTagStyle = (tag) => {
    const styles = {
      taskRequest: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      statusUpdate: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      clarificationNeeded: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      deadlineReminder: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      bugReport: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      messageAcknowledged: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      urgentNotice: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      meetingSchedule: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      infoSharing: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
      workFeedback: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
    };
    return styles[tag] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  };

  const generateTaggedMessagesList = () => {
    if (taggedMessages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-sm">
          <span>No tagged messages found</span>
          <span className="text-xs mt-1">Use @task, @decision, etc. in your messages</span>
        </div>
      );
    }

    return taggedMessages.map((msg, index) => {
              const cleanText = msg.text?.replace(/@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/g, '').trim() || 'No message content';
      const isExpanded = expandedMessages.has(msg._id);
      const shouldShowExpand = cleanText.length > 40; // Shorter for sidebar
      
      // Handle context messages
      if (msg.isContext) {
        return (
          <div key={msg._id} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                Context
              </span>
              <span className="text-xs text-gray-500">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="cursor-pointer" onClick={() => scrollToMessage(msg._id)}>
              <p className={`text-xs text-gray-700 dark:text-gray-300 ${!isExpanded && shouldShowExpand ? 'line-clamp-1' : ''}`}>
                {cleanText}
              </p>
              {shouldShowExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMessageExpansion(msg._id);
                  }}
                  className="text-xs text-blue-500 mt-1"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          </div>
        );
      }

      // Handle tagged messages
      const tagStyle = getTagStyle(msg.tag);
      
      return (
        <div key={msg._id} className="p-2 bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500 mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${tagStyle}`}>
                @{getTagDisplayName(msg.tag)}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
              {/* Permission indicator */}
              <div className="flex items-center gap-1">
                {msg.senderId?._id === authUser._id && (
                  <User size={10} className="text-blue-500" title="You created this" />
                )}
                {msg.senderId?._id !== authUser._id && (
                  <User size={10} className="text-gray-400" title="Created by other user" />
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTaggedMessage(msg._id);
              }}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title={`Delete this ${msg.tag} (both users can delete tagged messages)`}
            >
              <Trash2 size={12} />
            </button>
          </div>
          
          <div className="cursor-pointer" onClick={() => scrollToMessage(msg._id)}>
            <p className={`text-xs text-gray-700 dark:text-gray-300 mb-1 ${!isExpanded && shouldShowExpand ? 'line-clamp-1' : ''}`}>
              {cleanText}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 truncate">
                {msg.senderId?.fullName || 'Unknown'}
              </span>
              {shouldShowExpand && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMessageExpansion(msg._id);
                  }}
                  className="text-xs text-blue-500"
                >
                  {isExpanded ? '↑' : '↓'}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Execution Graph
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchTaggedMessages(selectedTagFilter)}
              disabled={isRefreshing}
              className={`p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Execution Graph"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowExecutionGraph(false)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
              title="Close Execution Graph"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <select
            value={selectedTagFilter}
            onChange={(e) => setSelectedTagFilter(e.target.value)}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            {tagTypes.map(tag => (
              <option key={tag} value={tag}>
                {tag === 'all' ? 'All Tags' : `@${getTagDisplayName(tag)}`}
              </option>
            ))}
          </select>
          
          <div className="relative">
            <select
              onChange={(e) => exportData(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              defaultValue=""
            >
              <option value="" disabled>Export</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {taggedMessages.length} tagged message{taggedMessages.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {generateTaggedMessagesList()}
      </div>
    </div>
  );
};

export default ExecutionGraphPanel; 