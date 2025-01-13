import User from "../models/user.model.js";

// Search users by username
export const searchUsers = async (req, res) => {
  try {
    // Get search query
    const { query } = req.query;
    
    // If there's a search query and we're authenticated, try to search DB first
    if (query && req.user) {
      const dbUsers = await User.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } }
        ],
        _id: { $ne: req.user._id } // Exclude the current user
      }).select("username fullName profilePic");
      
      if (dbUsers.length > 0) {
        // Process database users to add relationship flags
        const usersWithFlags = await Promise.all(dbUsers.map(async (user) => {
          const userId = user._id.toString();
          const currentUser = await User.findById(req.user._id);
          
          return {
            _id: userId,
            username: user.username,
            fullName: user.fullName,
            profilePic: user.profilePic || "/avatar.png",
            isAlreadyFriend: currentUser.friends.includes(userId),
            hasPendingRequest: currentUser.sentRequests.some(req => req.to.toString() === userId),
            hasRequestedYou: currentUser.friendRequests.some(req => req.from.toString() === userId)
          };
        }));
        
        return res.status(200).json(usersWithFlags);
      }
    }
    
    // Return empty array if no users found
    const users = [];
    
    // If a query is provided, filter the users
    let results = users;
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      results = users.filter(user => 
        user.username.toLowerCase().includes(lowercaseQuery) || 
        user.fullName.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    // Add relationship flags for frontend
    const usersWithFlags = results.map(user => ({
      ...user,
      isAlreadyFriend: false,
      hasPendingRequest: false,
      hasRequestedYou: false
    }));
    

    return res.status(200).json(usersWithFlags);
  } catch (error) {
    console.error("Error in search:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Search existing friends
export const searchFriends = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    
    // Find the current user with populated friends
    const user = await User.findById(req.user._id)
      .populate({
        path: "friends",
        select: "-password -__v",
        match: {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { fullName: { $regex: query, $options: "i" } }
          ]
        }
      });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    return res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error searching friends:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    

    

    // Check if users exist
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);
    
    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    
    if (!receiver) {
      console.error("Receiver not found:", receiverId);
      return res.status(404).json({ error: "Receiver not found" });
    }
    
    // Check if they are already friends
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ error: "Already friends with this user" });
    }
    
    // Check if a request is already sent
    const alreadySent = sender.sentRequests.some(
      request => request.to.toString() === receiverId
    );
    
    if (alreadySent) {
      return res.status(400).json({ error: "Friend request already sent" });
    }
    
    // Check if the receiver has already sent a request to the sender
    const hasReceivedRequest = sender.friendRequests.some(
      request => request.from.toString() === receiverId
    );
    
    if (hasReceivedRequest) {
      // If there's already a request from the receiver, accept it instead
      return acceptFriendRequest(req, res);
    }
    
    // Add request to sender's sentRequests
    sender.sentRequests.push({ to: receiverId });
    
    // Add request to receiver's friendRequests
    receiver.friendRequests.push({ from: senderId });
    
    // Save both users
    await Promise.all([sender.save(), receiver.save()]);
    
    return res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    
    // Check if users exist
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);
    
    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if there is a pending request
    const requestIndex = receiver.friendRequests.findIndex(
      request => request.from.toString() === senderId
    );
    
    if (requestIndex === -1) {
      return res.status(400).json({ error: "No pending friend request from this user" });
    }
    
    // Remove from friendRequests array
    receiver.friendRequests.splice(requestIndex, 1);
    
    // Remove from sentRequests array of the sender
    const sentRequestIndex = sender.sentRequests.findIndex(
      request => request.to.toString() === receiverId
    );
    
    if (sentRequestIndex !== -1) {
      sender.sentRequests.splice(sentRequestIndex, 1);
    }
    
    // Add to friends array for both users
    if (!receiver.friends.includes(senderId)) {
      receiver.friends.push(senderId);
    }
    
    if (!sender.friends.includes(receiverId)) {
      sender.friends.push(receiverId);
    }
    
    // Save both users
    await Promise.all([sender.save(), receiver.save()]);
    
    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Reject a friend request
export const rejectFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    
    // Find the receiver
    const receiver = await User.findById(receiverId);
    
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if there is a pending request
    const requestIndex = receiver.friendRequests.findIndex(
      request => request.from.toString() === senderId
    );
    
    if (requestIndex === -1) {
      return res.status(400).json({ error: "No pending friend request from this user" });
    }
    
    // Remove from friendRequests array
    receiver.friendRequests.splice(requestIndex, 1);
    await receiver.save();
    
    // Also remove from sentRequests of the sender
    const sender = await User.findById(senderId);
    if (sender) {
      const sentRequestIndex = sender.sentRequests.findIndex(
        request => request.to.toString() === receiverId
      );
      
      if (sentRequestIndex !== -1) {
        sender.sentRequests.splice(sentRequestIndex, 1);
        await sender.save();
      }
    }
    
    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get all friend requests
export const getFriendRequests = async (req, res) => {
  try {
    // Find the user and populate the friendRequests
    const user = await User.findById(req.user._id)
      .populate({
        path: "friendRequests.from",
        select: "username fullName profilePic"
      });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Format the response
    const formattedRequests = user.friendRequests.map(request => ({
      _id: request._id,
      user: request.from,
      createdAt: request.createdAt
    }));
    
    return res.status(200).json(formattedRequests);
  } catch (error) {
    console.error("Error getting friend requests:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Get all friends
export const getFriends = async (req, res) => {
  try {
    // Find the user and populate friends
    const user = await User.findById(req.user._id)
      .populate({
        path: "friends",
        select: "username fullName profilePic"
      });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Import Message model for aggregation
    const Message = (await import("../models/message.model.js")).default;
    
    // Get the last message timestamp for each friend to sort by recent interaction
    const friendsWithLastMessage = await Promise.all(
      user.friends.map(async (friend) => {
        // Find the most recent message between current user and this friend
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: req.user._id, receiverId: friend._id },
            { senderId: friend._id, receiverId: req.user._id }
          ]
        })
        .sort({ createdAt: -1 })
        .select('createdAt');
        
        return {
          ...friend.toObject(),
          lastMessageAt: lastMessage ? lastMessage.createdAt : new Date(0) // Use epoch time if no messages
        };
      })
    );
    
    // Sort friends by most recent interaction (lastMessageAt descending)
    const sortedFriends = friendsWithLastMessage.sort((a, b) => {
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });
    
    // Remove the lastMessageAt field before sending to client (it was just for sorting)
    const friendsResponse = sortedFriends.map(friend => {
      const { lastMessageAt, ...friendData } = friend;
      return friendData;
    });
    
    return res.status(200).json(friendsResponse);
  } catch (error) {
    console.error("Error getting friends:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}; 