import cron from 'node-cron';
import Message from '../models/message.model.js';
import { getIO } from './socket.js';

/**
 * Scheduled task to automatically delete messages older than 7 days
 * Runs once a day at midnight
 */
export const startScheduledTasks = () => {
  console.log('Setting up scheduled tasks');
  
  // Schedule to run at midnight every day
  cron.schedule('0 0 * * *', async () => {
  // cron.schedule('* * * * *', async () => {
    try {
      console.log('Running scheduled task: deleting old messages');
      
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      // sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setDays(sevenDaysAgo.getDays() - 7);
      
      // Find messages older than 7 days
      const oldMessages = await Message.find({ 
        createdAt: { $lt: sevenDaysAgo }
      });
      
      console.log(`Found ${oldMessages.length} messages older than 7 days to delete`);
      
      // Get list of message IDs to notify clients
      const deletedMessageIds = oldMessages.map(msg => msg._id);
      
      // Delete the messages
      const result = await Message.deleteMany({ 
        createdAt: { $lt: sevenDaysAgo }
      });
      
      console.log(`Deleted ${result.deletedCount} old messages`);
      
      // Notify connected clients about deleted messages
      if (deletedMessageIds.length > 0) {
        const io = getIO();
        io.emit('messagesAutoDeleted', { messageIds: deletedMessageIds });
      }
    } catch (error) {
      console.error('Error in scheduled message cleanup task:', error);
    }
  });
  
  console.log('Scheduled tasks setup complete');
}; 