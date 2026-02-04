const jwt = require('jsonwebtoken');

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  // Remove 'Bearer ' prefix if present
  const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    const decoded = jwt.verify(actualToken, JWT_SECRET);
    req.user = {
      ...decoded,
      profileId: decoded.profileId ?? decoded.userId, 
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { verifyToken, JWT_SECRET };