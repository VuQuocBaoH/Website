import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mở rộng interface Request của Express để thêm thuộc tính user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: 'user' | 'admin'; 
      };
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => { 
  // Get token from header
  const token = req.header('x-auth-token'); 

  // Check if no token
  if (!token) {
    res.status(401).json({ msg: 'No token, authorization denied' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { user: { id: string; role?: 'user' | 'admin' } };
    req.user = decoded.user;
    next();
  } catch (err: any) {
    console.error("JWT Verification Error:", err.message); 
    res.status(401).json({ msg: 'Token is not valid' });
    return;
  }
};

export default authMiddleware;