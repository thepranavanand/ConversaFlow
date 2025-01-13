import { Loader2 } from "lucide-react";

const SendingTextMessage = ({ text }) => {
  return (
    <div className="chat-bubble max-w-xs sm:max-w-sm md:max-w-md break-words text-sm leading-relaxed opacity-70">
      <div className="flex items-center gap-2">
        <span>{text}</span>
        <Loader2 size={12} className="animate-spin text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
};

export default SendingTextMessage; 