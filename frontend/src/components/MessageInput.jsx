import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, File, Upload, CornerUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const MAX_MESSAGE_CHARS = 500; // ~100 words
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for images
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for files
const IMAGE_QUALITY = 0.8; // Compression quality for images
const MAX_IMAGE_DIMENSION = 1920; // Max width/height for image compression

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [charsLeft, setCharsLeft] = useState(MAX_MESSAGE_CHARS);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const { sendMessage, selectedUser, replyingTo, cancelReply, addOptimisticMessage, updateMessageStatus, removeOptimisticMessage } = useChatStore();

  // Function to compress image
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxDim = MAX_IMAGE_DIMENSION;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height * maxDim) / width;
            width = maxDim;
          } else {
            width = (width * maxDim) / height;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', IMAGE_QUALITY);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const availableTags = ['taskRequest', 'statusUpdate', 'clarificationNeeded', 'deadlineReminder', 'bugReport', 'messageAcknowledged', 'urgentNotice', 'meetingSchedule', 'infoSharing', 'workFeedback'];

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

  // Function to check if message has a tag and get display text with highlighting
  const getDisplayText = () => {
    const existingTagPattern = /@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/;
    const match = text.match(existingTagPattern);
    
    if (match) {
      // There's a tag, we need to show it highlighted
      return text; // We'll handle highlighting in CSS
    }
    return text;
  };

  const hasExistingTag = () => {
    const existingTagPattern = /@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/;
    return existingTagPattern.test(text);
  };

  // Auto-focus input field when replying to a message
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Update character count when text changes
  useEffect(() => {
    setCharsLeft(MAX_MESSAGE_CHARS - text.length);
    
    // Check if there's already a tag in the message
    const existingTagPattern = /@(taskRequest|statusUpdate|clarificationNeeded|deadlineReminder|bugReport|messageAcknowledged|urgentNotice|meetingSchedule|infoSharing|workFeedback)(?:\s*\[([^\]]*)\])?/;
    const hasExistingTag = existingTagPattern.test(text);
    
    if (hasExistingTag) {
      // If there's already a tag, don't show suggestions
      setShowTagSuggestions(false);
      setTagSuggestions([]);
      setSelectedSuggestionIndex(0);
    } else {
      // Check for @ symbol and show tag suggestions only if no tag exists
      const words = text.split(' ');
      const currentWord = words[words.length - 1];
      
      if (currentWord.startsWith('@') && currentWord.length > 1) {
        const query = currentWord.slice(1).toLowerCase();
        const filtered = availableTags.filter(tag => 
          tag.toLowerCase().includes(query) || 
          getTagDisplayName(tag).toLowerCase().includes(query)
        );
        setTagSuggestions(filtered);
        setShowTagSuggestions(filtered.length > 0);
        setSelectedSuggestionIndex(0); // Reset to first suggestion
      } else {
        setShowTagSuggestions(false);
        setTagSuggestions([]);
        setSelectedSuggestionIndex(0);
      }
    }
  }, [text]);

  const insertTag = (tag) => {
    const words = text.split(' ');
    words[words.length - 1] = `@${tag}`;
    setText(words.join(' ') + ' ');
    setShowTagSuggestions(false);
    setSelectedSuggestionIndex(0);
    inputRef.current?.focus();
  };

  const insertSelectedTag = () => {
    if (tagSuggestions.length > 0 && selectedSuggestionIndex < tagSuggestions.length) {
      insertTag(tagSuggestions[selectedSuggestionIndex]);
    }
  };

  const handleKeyDown = (e) => {
    // Handle tag suggestion navigation
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < tagSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : tagSuggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertSelectedTag();
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowTagSuggestions(false);
        setTagSuggestions([]);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    // If Enter is pressed without Shift, submit the form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Allow sending if there's text OR if there's a file/image (even with empty text)
      if (text.trim() || selectedFile) {
        console.log('Enter key pressed, submitting with reply context:', replyingTo?._id);
        formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    if (newText.length <= MAX_MESSAGE_CHARS) {
      setText(newText);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size limits
    if (file.type.startsWith("image/")) {
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
        return;
      }
    } else if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    setSelectedFile(file);
    
    // Auto-focus the text input when a file is selected
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // If it's an image, compress it and show preview
    if (file.type.startsWith("image/")) {
      // Show immediate preview of original file first
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Then compress in background
      compressImage(file).then(compressedFile => {
        // Update the selected file with compressed version
        setSelectedFile(compressedFile);
        // Keep the same preview (user won't notice compression)
      }).catch(error => {
        console.error("Error compressing image:", error);
        toast.error("Failed to process image");
      });
    } else {
      // Clear image preview if it's not an image
      setImagePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    try {
      if (!selectedUser) {
        toast.error("Please select a user first");
        return;
      }
      
      if (!text.trim() && !selectedFile) {
        return;
      }

      setIsUploading(true);
      
      // Get current user ID
      const { authUser } = useAuthStore.getState();
      
      if (!authUser || !authUser._id) {
        toast.error("You must be logged in to send messages");
        return;
      }
      
      // Log if we're replying to a message
      if (replyingTo) {
        console.log('Replying to message:', replyingTo._id, replyingTo.text);
      }
      
      // Handle image uploads via Cloudinary (base64)
      if (selectedFile && selectedFile.type.startsWith("image/")) {
        console.log('Uploading image via Cloudinary:', selectedFile.name);
        
        // Create blob URL for immediate display
        const blobUrl = URL.createObjectURL(selectedFile);
        
        // Add optimistic message immediately
        const tempId = addOptimisticMessage({
          text: text || '',
          image: blobUrl, // Use blob URL for immediate display
          replyTo: replyingTo?._id || null,
          receiverId: selectedUser._id
        });
        
        // Reset form immediately (optimistic UX)
        setText("");
        setSelectedFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        useChatStore.setState((state) => ({ replyingTo: null }));
        
        // Convert image to base64 and upload in background
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            console.log('Image converted to base64, size:', reader.result.length);
            
            const messageData = {
              text: text || '',
              image: reader.result, // base64 string
              replyTo: replyingTo?._id || null
            };
            
            console.log('Sending image message data:', { ...messageData, image: 'base64_data_truncated' });

            const response = await axiosInstance.post(
              `/messages/send/${selectedUser._id}`, 
              messageData,
              {
                headers: {
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log('Image message sent successfully:', response.data);
            
                      // Update optimistic message with real message data
          updateMessageStatus(tempId, 'sent', response.data);
          
            // Refresh friends list to update order after sending image
            // Add delay to ensure message is saved to database first
            setTimeout(() => {
              import("../store/useFriendStore.js").then(({ useFriendStore }) => {
                const { getFriends } = useFriendStore.getState();
                getFriends().catch(err => {
                  console.log("Failed to refresh friends order after sending image:", err);
                });
              });
            }, 100);
            
            // Clean up blob URL after a small delay to prevent flash
            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 1000);
            
          } catch (error) {
            console.error("Error sending image:", error);
            console.error("Error details:", error.response?.data);
            toast.error("Failed to send image: " + (error.response?.data?.error || error.message));
            
            // Remove failed optimistic message
            removeOptimisticMessage(tempId);
            URL.revokeObjectURL(blobUrl);
          } finally {
            setIsUploading(false);
          }
        };
        
        reader.onerror = () => {
          console.error("Error reading image file");
          toast.error("Failed to read image file");
          removeOptimisticMessage(tempId);
          URL.revokeObjectURL(blobUrl);
          setIsUploading(false);
        };
        
        reader.readAsDataURL(selectedFile);
        return; // Exit early for image upload
      } 
      // Handle file uploads via GridFS
      else if (selectedFile) {
        console.log('Uploading file via GridFS:', selectedFile.name);

        const formData = new FormData();
        formData.append('file', selectedFile);
        if (text) formData.append('text', text);
        if (replyingTo) formData.append('replyTo', replyingTo._id);

        try {
          console.log('Sending file to:', `/api/files/upload/${selectedUser._id}`);
          console.log('FormData contents:', {
            file: selectedFile.name,
            text: text || 'no text',
            replyTo: replyingTo?._id || 'no reply'
          });

          const response = await axiosInstance.post(
            `/files/upload/${selectedUser._id}`, 
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentage);
                console.log('Upload progress:', percentage + '%');
              }
            }
          );
          
          console.log('File uploaded successfully:', response.data);
          
          // Update messages in store
          useChatStore.setState((state) => ({
            messages: [...state.messages, response.data],
            replyingTo: null
          }));
          
          // Refresh friends list to update order after sending file
          // Add delay to ensure message is saved to database first
          setTimeout(() => {
            import("../store/useFriendStore.js").then(({ useFriendStore }) => {
              const { getFriends } = useFriendStore.getState();
              getFriends().catch(err => {
                console.log("Failed to refresh friends order after sending file:", err);
              });
            });
          }, 100);
          
        } catch (error) {
          console.error("Error uploading file:", error);
          console.error("Error response:", error.response?.data);
          console.error("Error status:", error.response?.status);
          toast.error("Failed to upload file: " + (error.response?.data?.error || error.message));
          throw error;
        }
      }
      // Text-only message
      else if (text) {
        console.log("Sending text-only message");
        
        // Add optimistic message immediately
        const tempId = addOptimisticMessage({
          text: text,
          replyTo: replyingTo?._id || null,
          receiverId: selectedUser._id
        });
        
        // Reset form immediately (optimistic UX)
        const currentText = text;
        const currentReplyTo = replyingTo;
        setText("");
        useChatStore.setState((state) => ({ replyingTo: null }));
        
        try {
          const formData = new FormData();
          formData.append('text', currentText);
          
          if (currentReplyTo) {
            formData.append('replyTo', currentReplyTo._id);
          }
          
          const response = await axiosInstance.post(
            `/messages/send/${selectedUser._id}`, 
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          
          console.log("Message sent successfully:", response.data);
          
          // Update optimistic message with real message data
          updateMessageStatus(tempId, 'sent', response.data);
          
          // Refresh friends list to update order after sending text message
          // Add delay to ensure message is saved to database first
          setTimeout(() => {
            import("../store/useFriendStore.js").then(({ useFriendStore }) => {
              const { getFriends } = useFriendStore.getState();
              getFriends().catch(err => {
                console.log("Failed to refresh friends order after sending text:", err);
              });
            });
          }, 100);
          
        } catch (error) {
          console.error("Error sending text message:", error);
          toast.error("Failed to send message: " + (error.response?.data?.error || error.message));
          
          // Remove failed optimistic message
          removeOptimisticMessage(tempId);
          throw error;
        }
      }
      
      // Reset form for text and file uploads (image is handled above)
      if (!selectedFile || !selectedFile.type.startsWith("image/")) {
        setText("");
        setSelectedFile(null);
        setImagePreview(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Message failed to send");
    } finally {
      setIsUploading(false);
    }
  };

  // Function to get the appropriate file icon based on file type
  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={20} />;
    
    if (selectedFile.type.startsWith("image/")) {
      return <Image size={20} />;
    } else {
      return <File size={20} />;
    }
  };
  
  // Only show attachments preview if a file is selected
  const renderAttachmentPreview = () => {
    if (!selectedFile) return null;
    
    return (
      <div className="relative mt-2 rounded-lg border border-gray-200 p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <button 
          onClick={removeFile}
          className="absolute right-1 top-1 text-gray-500 hover:text-red-500"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-2 pl-1">
          {selectedFile ? <File size={20} /> : null}
          <span className="text-sm truncate max-w-[150px]">
            {selectedFile ? selectedFile.name : ""}
          </span>
          <span className="text-xs text-gray-500">
            {selectedFile
            ? ((selectedFile.size / (1024 * 1024)).toFixed(2) + " MB")
            : ""}
          </span>
        </div>
        
        {imagePreview && (
          <div className="mt-2 relative rounded-lg overflow-hidden">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="max-h-[150px] rounded-lg"
            />
          </div>
        )}
      </div>
    );
  };

  // Render reply preview if replying to a message
  const renderReplyPreview = () => {
    if (!replyingTo) return null;
    
    return (
      <div className="relative mt-2 rounded-lg border border-gray-200 p-2 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 flex items-center">
        <CornerUpRight size={16} className="mr-2 text-primary" />
        <div className="flex-1 flex flex-col">
          <span className="text-xs font-medium text-primary">
            Replying to {replyingTo.senderId === useAuthStore.getState().authUser._id ? 'yourself' : 'them'}
          </span>
          <span className="text-sm truncate">
            {replyingTo.text || 
             (replyingTo.image && "Image") || 
             (replyingTo.file && "File: " + replyingTo.file.originalname)}
          </span>
        </div>
        <button 
          onClick={cancelReply}
          className="text-gray-500 hover:text-red-500 ml-2"
        >
          <X size={14} />
        </button>
      </div>
    );
  };

  return (
          <form ref={formRef} onSubmit={handleSendMessage} className="p-2 border-t dark:border-gray-700 relative">
      {renderReplyPreview()}
      {renderAttachmentPreview()}

      {/* Tag Suggestions */}
      {showTagSuggestions && (
        <div className="absolute bottom-full left-2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-w-xs">
          {tagSuggestions.map((tag, index) => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              className={`w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                index === selectedSuggestionIndex 
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              @{getTagDisplayName(tag)}
            </button>
          ))}
        </div>
      )}


    
      <div className="relative flex flex-col">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            className={`w-full p-3 text-sm bg-gray-50 dark:bg-gray-700 border-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
              hasExistingTag() ? 'tag-highlighted' : ''
            }`}
            placeholder=""
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={!selectedUser}
            maxLength={MAX_MESSAGE_CHARS}
          />

          <div className="absolute right-12 flex space-x-2">
            <label
              htmlFor="fileInput"
              className={`cursor-pointer hover:text-blue-500 ${selectedFile ? "text-emerald-500" : "text-zinc-400"}`}
            >
              {selectedFile ? getFileIcon() : <Upload size={20} />}
              <input
                type="file"
                id="fileInput"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
          
          <button
            type="submit"
            disabled={(!text.trim() && !selectedFile) || isUploading}
            className={`absolute right-3 p-1 rounded-full ${
              (!text.trim() && !selectedFile) || isUploading
                ? "text-gray-400 cursor-not-allowed"
                : "text-blue-500 hover:bg-blue-100 dark:hover:bg-gray-700"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        
        {/* Character counter */}
        <div className={`text-xs text-right mt-1 ${charsLeft < 50 ? 'text-amber-500' : charsLeft < 20 ? 'text-red-500' : 'text-gray-400'}`}>
          {charsLeft} characters left
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
