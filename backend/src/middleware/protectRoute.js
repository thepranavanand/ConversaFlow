import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protectRoute = async (req, res, next) => {
  try {
    // Get token from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    
    // Alternative: get token from cookies
    const cookieToken = req.cookies?.jwt;
    
    // Check if we're accessing the search endpoint and no token is provided
    if ((!token && !cookieToken) && req.path === '/search') {
      // For search endpoint, continue without authentication
      console.log('Search endpoint accessed without authentication - continuing');
      next();
      return;
    }
    
    if (!token && !cookieToken) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Use whichever token is available
    const actualToken = token || cookieToken;
    
    // Verify token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    // Special handling for search endpoint
    if (req.path === '/search') {
      console.log('Auth error in search endpoint - continuing without auth');
      next();
      return;
    }
    
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
}; 