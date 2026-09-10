//declaration merging - we insert new fields into Express' request type, so we
//don't have to always cast req to CustomRequest in the controllers

declare global {
    namespace Express {
        interface Request {
            user: string;
            role: 'superuser' | 'admin' | 'user',
            jwtId: string;
            exp: number
        }
    }
}
export {};
