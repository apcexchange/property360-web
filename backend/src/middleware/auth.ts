import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthRequest, UserRole } from '../types';
import config from '../config';

interface JwtPayload {
  id: string;
  role: UserRole;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action',
      });
      return;
    }
    next();
  };
};

export default { protect, authorize };
