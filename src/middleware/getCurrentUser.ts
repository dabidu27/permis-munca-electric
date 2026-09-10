import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { redis } from '../lib/redisClient.js'


interface AppJwtPayload extends jwt.JwtPayload {
  userId: string;
  role: string;
  jwtId: string;
}

const secretKey = process.env.JWT_SECRET;
if(!secretKey){
    console.log('JWT Secret not loaded from env');
    throw new Error('JWT Secret not loaded from env');
}

export const getCurrentUser = async(req: Request, res: Response, next: NextFunction) => {

    const authHeader = req.header('Authorization')?.split(' ') ?? []; //authHeader[0] = 'Bearer', authHeader[1] = the token
    if(authHeader[0]?.toLowerCase() !== 'bearer' || !authHeader[1]){
        return res.status(401).json({'error': 'You are not authenticated'});
    }

    const token = authHeader[1];

    let payload;
    try{
        payload = jwt.verify(token, secretKey) as AppJwtPayload
    }catch(err){
        if(err instanceof jwt.TokenExpiredError)
            return res.status(401).json({'error': 'Token expired', 'code': 'token_expired'})
        return res.status(401).json({'error': 'Could not validate credentials'});
    }


    if(!payload.userId || !payload.jwtId)
        return res.status(401).json({'error': 'Could not validate credentials'});

    if(payload.role !== 'superuser' && payload.role !== 'admin' && payload.role !== 'user')
        return res.status(401).json({'error': 'Could not validate credentials'});

    
    //check if the token is blacklisted => logged out
    const isBlacklisted = await redis.get(`bl_${payload.jwtId}`);
    if(isBlacklisted){
        return res.status(401).json({'error': 'Token has been invalidated (logged out)'});
    }

    req.user = payload.userId;
    req.role = payload.role as 'superuser' | 'admin' | 'user';
    req.jwtId = payload.jwtId;
    req.exp = payload.exp as number;

    next();
}