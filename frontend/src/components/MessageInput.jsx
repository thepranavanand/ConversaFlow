import { useRef, useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Send, X, File, Upload, CornerUpRight } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

const MAX_MESSAGE_CHARS = 500;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [charsLeft, setCharsLeft] = useState(MAX_MESSAGE_CHARS);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const { sendMessage, selectedUser, replyingTo, cancelReply } = useChatStore();

  const availableTags = ['task', 'decision', 'deadline', 'defer', 'confirm', 'wait', 'done', 'fail', 'abort', 'retry'];

  const getDisplayText = () => {
    const existingTagPattern = /@(task|decision|deadline|defer|confirm|wait|done|fail|abort|retry)(?:\s*\[([^\]]*)\])?/;
    const match = text.match(existingTagPattern);
    
    if (match) {
      return text;
    }
    return text;
  };

  const hasExistingTag = () => {
    const existingTagPattern = /@(task|decision|deadline|defer|confirm|wait|done|fail|abort|retry)(?:\s*\[([^\]]*)\])?/;
    return existingTagPattern.test(text);
  };

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  useEffect(() => {
    setCharsLeft(MAX_MESSAGE_CHARS - text.length);
    
    const existingTagPattern = /@(task|decision|deadline|defer|confirm|wait|done|fail|abort|retry)(?:\s*\[([^\]]*)\])?/;
    const hasExistingTag = existingTagPattern.test(text);
    
    if (hasExistingTag) {
      setShowTagSuggestions(false);
      setTagSuggestions([]);
    } else {
      const words = text.split(' ');
      const currentWord = words[words.length - 1];
      
      if (currentWord.startsWith('@') && currentWord.length > 1) {
        const query = currentWord.slice(1).toLowerCase();
        const filtered = availableTags.filter(tag => 
          tag.toLowerCase().includes(query)
        );
        setTagSuggestions(filtered);
        setShowTagSuggestions(filtered.length > 0);
      } else {
        setShowTagSuggestions(false);
        setTagSuggestions([]);
      }
    }
  }, [text]);

  const insertTag = (tag) => {
    const words = text.split(' ');
    words[words.length - 1] = `@${tag}`;
    setText(words.join(' ') + ' ');
    setShowTagSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
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
    
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
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
      
      if (!text && !selectedFile) {
        return;
      }

      setIsUploading(true);
      
      const { authUser } = useAuthStore.getState();
      
      if (!authUser || !authUser._id) {
        toast.error("You must be logged in to send messages");
        return;
      }
      
      if (replyingTo) {
        console.log('Replying to message:', replyingTo._id, replyingTo.text);
      }
      
      if (selectedFile && selectedFile.type.startsWith("image/")) {
        console.log('Uploading image via Cloudinary:', selectedFile.name);
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            console.log('Image converted to base64, size:', reader.result.length);
            
            const messageData = {
              text: text || '',
              image: reader.result,
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
            
            useChatStore.setState((state) => ({
              messages: [...state.messages, response.data],
              replyingTo: null
            }));
            
            setText("");
            setSelectedFile(null);
            setImagePreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            
          } catch (error) {
            console.error("Error sending image:", error);
            console.error("Error details:", error.response?.data);
            toast.error("Failed to send image: " + (error.response?.data?.error || error.message));
          } finally {
            setIsUploading(false);
          }
        };
        
        reader.onerror = () => {
          console.error("Error reading image file");
          toast.error("Failed to read image file");
          setIsUploading(false);
        };
        
        reader.readAsDataURL(selectedFile);
        return;
      } 
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
          
          useChatStore.setState((state) => ({
            messages: [...state.messages, response.data],
            replyingTo: null
          }));
          
        } catch (error) {
          console.error("Error uploading file:", error);
          console.error("Error response:", error.response?.data);
          console.error("Error status:", error.response?.status);
          toast.error("Failed to upload file: " + (error.response?.data?.error || error.message));
          throw error;
        }
      }
      else if (text) {
        try {
          console.log("Sending text-only message");
          
          const formData = new FormData();
          formData.append('text', text);
          
          if (replyingTo) {
            formData.append('replyTo', replyingTo._id);
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
          
          useChatStore.setState((state) => ({
            messages: [...state.messages, response.data],
            replyingTo: null
          }));
          
        } catch (error) {
          console.error("Error sending text message:", error);
          toast.error("Failed to send message: " + (error.response?.data?.error || error.message));
          throw error;
        }
      }
      
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

  const getFileIcon = () => {
    if (!selectedFile) return <Upload size={20} />;
    
    if (selectedFile.type.startsWith("image/")) {
      return <Image size={20} />;
    } else {
      return <File size={20} />;
    }
  };
  
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

      {showTagSuggestions && (
        <div className="absolute bottom-full left-2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-w-xs">
          <div className="p-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            Tag suggestions:
          </div>
          {tagSuggestions.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(tag)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
            >
              @{tag}
            </button>
          ))}
        </div>
      )}

      {isUploading && (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2 dark:bg-gray-700">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
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
        
        <div className={`text-xs text-right mt-1 ${charsLeft < 50 ? 'text-amber-500' : charsLeft < 20 ? 'text-red-500' : 'text-gray-400'}`}>
          {charsLeft} characters left
        </div>
      </div>
    </form>
  );
};

export default MessageInput;
