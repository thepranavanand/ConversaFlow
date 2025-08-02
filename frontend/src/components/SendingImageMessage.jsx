import { Loader2 } from "lucide-react";

const SendingImageMessage = ({ imagePreview, text }) => {
  return (
    <div className="chat-bubble max-w-xs sm:max-w-sm md:max-w-md break-words text-sm leading-relaxed">
      {text && (
        <div className="mb-2">{text}</div>
      )}
      
      <div className="relative">
        <img
          src={imagePreview}
          alt="Sending..."
          className="rounded-lg max-w-full max-h-[300px] opacity-70"
        />
        
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center text-white">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-xs font-medium">Sending image...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendingImageMessage; 