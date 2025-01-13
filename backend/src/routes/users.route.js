import express from "express";
import { 
  searchUsers, 
  searchFriends,
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  getFriendRequests,
  getFriends
} from "../controllers/users.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

// Search users by username - add protection for DB search but make it optional
router.get("/search", protectRoute, searchUsers);

// Search existing friends
router.get("/search-friends", protectRoute, searchFriends);

// Friend requests
router.post("/friend-request/:id", protectRoute, sendFriendRequest);
router.put("/friend-request/:id/accept", protectRoute, acceptFriendRequest);
router.put("/friend-request/:id/reject", protectRoute, rejectFriendRequest);
router.get("/friend-requests", protectRoute, getFriendRequests);

// Get friends
router.get("/friends", protectRoute, getFriends);

export default router; 