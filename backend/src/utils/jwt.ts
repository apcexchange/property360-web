import jwt from 'jsonwebtoken';
import config from '../config';
import { IUser } from '../types';

export const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, config.jwt.secret);
};

export default { generateToken, verifyToken };
