import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import { IUser } from '../types';

export const generateToken = (user: IUser): string => {
  const options: SignOptions = {
    expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign({ id: user._id, role: user.role }, config.jwt.secret, options);
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, config.jwt.secret);
};

export default { generateToken, verifyToken };
