
import type { Request, Response, NextFunction } from "express";


export const requireSuperuser = (req: Request, res: Response, next: NextFunction) => {

    if(req.role !== 'superuser')
        return res.status(403).json({message: 'Forbidden'});

    next();
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {

    if(req.role !== 'admin' && req.role !== 'superuser')
        return res.status(403).json({message: 'Forbidden'});

    next();
}
