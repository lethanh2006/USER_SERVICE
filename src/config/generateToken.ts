import jwt from 'jsonwebtoken';
// thu vien doc file .env
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateToken = (user: any) => {
    return jwt.sign({user}, JWT_SECRET as string, {expiresIn: '7d'});
}