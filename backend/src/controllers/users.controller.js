import User from "../models/user.model.js";

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (query && req.user) {
      const dbUsers = await User.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullName: { $regex: query, $options: "i" } }
        ],
        _id: { $ne: req.user._id }
      }).select("username fullName profilePic");
      
      if (dbUsers.length > 0) {
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
    
    const users = [];
    
    let results = users;
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      results = users.filter(user => 
        user.username.toLowerCase().includes(lowercaseQuery) || 
        user.fullName.toLowerCase().includes(lowercaseQuery)
      );
    }
    
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

export const searchFriends = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }
    
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

export const sendFriendRequest = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    
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
    
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ error: "Already friends with this user" });
    }
    
    const alreadySent = sender.sentRequests.some(
      request => request.to.toString() === receiverId
    );
    
    if (alreadySent) {
      return res.status(400).json({ error: "Friend request already sent" });
    }
    
    const hasReceivedRequest = sender.friendRequests.some(
      request => request.from.toString() === receiverId
    );
    
    if (hasReceivedRequest) {
      return acceptFriendRequest(req, res);
    }
    
    sender.sentRequests.push({ to: receiverId });
    
    receiver.friendRequests.push({ from: senderId });
    
    await Promise.all([sender.save(), receiver.save()]);
    
    return res.status(200).json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    
    const [sender, receiver] = await Promise.all([
      User.findById(senderId),
      User.findById(receiverId)
    ]);
    
    if (!sender || !receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const requestIndex = receiver.friendRequests.findIndex(
      request => request.from.toString() === senderId
    );
    
    if (requestIndex === -1) {
      return res.status(400).json({ error: "No pending friend request from this user" });
    }
    
    receiver.friendRequests.splice(requestIndex, 1);
    
    const sentRequestIndex = sender.sentRequests.findIndex(
      request => request.to.toString() === receiverId
    );
    
    if (sentRequestIndex !== -1) {
      sender.sentRequests.splice(sentRequestIndex, 1);
    }
    
    if (!receiver.friends.includes(senderId)) {
      receiver.friends.push(senderId);
    }
    
    if (!sender.friends.includes(receiverId)) {
      sender.friends.push(receiverId);
    }
    
    await Promise.all([sender.save(), receiver.save()]);
    
    return res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectFriendRequest = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const receiverId = req.user._id;
    
    const receiver = await User.findById(receiverId);
    
    if (!receiver) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const requestIndex = receiver.friendRequests.findIndex(
      request => request.from.toString() === senderId
    );
    
    if (requestIndex === -1) {
      return res.status(400).json({ error: "No pending friend request from this user" });
    }
    
    receiver.friendRequests.splice(requestIndex, 1);
    await receiver.save();
    
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

export const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "friendRequests.from",
        select: "username fullName profilePic"
      });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
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

export const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: "friends",
        select: "username fullName profilePic"
      });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const Message = (await import("../models/message.model.js")).default;
    
    const friendsWithLastMessage = await Promise.all(
      user.friends.map(async (friend) => {
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
          lastMessageAt: lastMessage ? lastMessage.createdAt : new Date(0)
        };
      })
    );
    
    const sortedFriends = friendsWithLastMessage.sort((a, b) => {
      return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
    });
    
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