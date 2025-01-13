import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    file: {
      fileId: String,
      filename: String,
      originalname: String,
      fileSize: Number,
      fileType: String,
      url: String,
    },
    tag: {
      type: String,
      enum: ['taskRequest', 'statusUpdate', 'clarificationNeeded', 'deadlineReminder', 'bugReport', 'messageAcknowledged', 'urgentNotice', 'meetingSchedule', 'infoSharing', 'workFeedback'],
      default: null
    },
    metadata: {
      type: Map,
      of: String
    },
    linked_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read'],
      default: 'sent'
    },
    deliveredAt: {
      type: Date,
      default: null
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
