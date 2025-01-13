import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getMessages, getUsersForSidebar, sendMessage, getTaggedMessages, deleteMessage } from "../controllers/message.controller.js";
import { upload } from '../lib/multerConfig.js';
import { getIO, getReceiverSocketId } from '../lib/socket.js';
import Message from '../models/message.model.js';

const router = express.Router();

router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id/tagged", protectRoute, getTaggedMessages);
router.get("/:id", protectRoute, getMessages);
router.post("/send/:id", protectRoute, upload.single('image'), sendMessage);
router.delete("/:id", protectRoute, deleteMessage);

export default router;
