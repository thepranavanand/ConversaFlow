import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    console.log("Cookies received:", req.cookies);
    console.log("Authorization header:", req.headers.authorization);
    
    // Try to get token from cookies first
    let token = req.cookies.jwt;
    
    // If no cookie token, check for Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log("Using token from Authorization header");
    }

    if (!token) {
      console.log("No JWT token found in cookies or headers");
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    console.log("Token found, verifying...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      console.log("Token verification failed");
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    console.log("Token verified, finding user with ID:", decoded.userId);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      console.log("No user found with ID:", decoded.userId);
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User found:", user._id.toString());
    req.user = user;

    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
