
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
  const token = req.header('x-auth-token');


  if (!token) {
    res.status(401).json({ msg: 'Truy cập bị từ chối' });
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

const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {

  if (!req.user || !req.user.role) {
    res.status(401).json({ msg: 'Not authorized, no user data' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ msg: 'Not authorized as an admin' }); 
    return;
  }

  next();
};


export { authMiddleware, adminAuthMiddleware };