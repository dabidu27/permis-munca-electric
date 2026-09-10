import type { Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient.js';
import { compare, hash } from 'bcryptjs';
import jwt from 'jsonwebtoken'
import { redis } from '../lib/redisClient.js';
import crypto from 'node:crypto'
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

const INVITE_TOKEN_TTL_DAYS = 7;

const secretKey = process.env.JWT_SECRET;
if (!secretKey) {
    console.error('JWT Secret not loaded from env');
    throw new Error('Server misconfiguration' );
}

type Role =  'superuser' | 'admin'| 'user';

export const login = async(req: Request, res: Response) => {


    const {email, password} = req.body;

    if(!email || !password){
        return res.status(400).json({'error': 'Credentials are mandatory'});
    }

    const {data, error} = await supabase.from('users').select('id, role, password_hash').eq('email', email).maybeSingle();

    if(error){
        return res.status(500).json({'error': `DB Error: ${error.message}`});
    }

    if(!data){
       return res.status(401).json({'error': 'Invalid credentials'});
    }

    const passwordsMatch = await compare(password, data.password_hash);

    if(!passwordsMatch){
        return res.status(401).json({'error': 'Invalid credentials'});
    }

    //generate an id for the JWT token, so we can also place it in redis when the user logs out, to blacklist the token
    const jwtId = crypto.randomUUID();

    const token = jwt.sign({userId: data?.id, role: data?.role, jwtId: jwtId}, secretKey, {expiresIn: '1d'}); //expiresIn is injected into the {userId: data.id} payload
    return res.status(200).json({'success': true, 'token': token});

}

export const logout = async(req: Request, res: Response) => {

    //logout - user clicks logout, we place their jwt token in a redis blacklist
    try{

        if(req.user && req.jwtId && req.exp){
            const now = Math.floor(Date.now()/1000);
            //we set the ttl in redis to how many seconds there are until the jwt expires
            //while the jwt is not expired, we have to keep it in the blacklist, to mark it as logged out
            //after the jwt expires, it will invalid anyway, meaning a user cannot use it to log in, so there is no reason to keep it in redis anymore
            const ttl = req.exp - now;
            if(ttl > 0){
                await redis.setex(`bl_${req.jwtId}`, ttl, 'blacklist'); //jwtId - 'blacklist' pair, with ttl as expiration time
            }
        }

        return res.status(200).json({success: true, message: 'Logged out succesfully'})
    }catch(err){
        return res.status(500).json({error: 'Failed to process logout.'})
    }

}

export const invite = async(req: Request, res: Response) => {

    try{
        const resendKey = process.env.RESEND_API_KEY;
        if(!resendKey){
            console.log('[resend error] Missing Resend API key');
            throw new Error('[resend error] Missing Resend API key')
        }
        const resend = new Resend(resendKey);

        const appUrl = process.env.APP_URL!;
        if(!appUrl){
            console.log('[app url error] Missing APP URL');
            throw new Error('[app url error] Missing APP URL key')
        }

        if(req.role === 'user')
            return res.status(403).json({error: 'Forbidden'})

        const {email, username, role} = req.body;

        if(typeof email !== 'string' || typeof username !== 'string')
            return res.status(400).json({error: 'Invalid invite'});

        const cleanEmail = email.trim();
        const cleanUsername = username.trim();

        const validRole = role === 'admin' || role === 'user' || role === 'superuser';
        if(!validRole || cleanEmail === '' || cleanUsername === ''){
            return res.status(400).json({error: 'Invalid invite'});
        }

        if(req.role === 'admin' && role !== 'user')
            return res.status(403).json({error: 'Forbidden'});

        if (req.role === 'superuser' && !['admin', 'user'].includes(role)) 
            return res.status(403).json({error: 'Forbidden'});

        const placeholderSecret = crypto.randomUUID()
        const passwordHash = await bcrypt.hash(placeholderSecret, 10) //unguessable, gets replaced when lm sets a password(workaround for NOT NULL constraint in db)

        const token = crypto.randomBytes(32).toString('hex')
        const hashedToken = await crypto.hash('sha256', token);
        const {data: user, error: insertError} = await supabase.from('users').insert({
            'email': cleanEmail,
            'username': cleanUsername,
            'password_hash': passwordHash,
            'role': role,
            'set_password_token': hashedToken,
            'set_password_expiry': new Date(Date.now() + INVITE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
        }).select('id').single();

        if (insertError) {
        console.error('Invite insert error:', insertError);

        const isEmailConflict =
            insertError.code === '23505' &&
            insertError.details?.includes('(email)');

        if (isEmailConflict) {
            return res.status(409).json({
            error: 'An account with this email already exists',
            });
        }

        return res.status(500).json({
            error: 'Internal database error',
        });
        }
        
        const escapeHtml = (value: string) =>
            value
                .replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
                .replaceAll("'", '&#39;');

        const safeUsername = escapeHtml(cleanUsername);

        const url = `${appUrl}/signup/${token}`

        let sendError: unknown = null;
        try{
            const {error} = await resend.emails.send({
            from: 'Permis Electric Munca <ssm@razvanchiru.ro>',
            to: [cleanEmail],
            subject: 'Permis Electric Munca invitatie',
            html: `
                <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#F4F5F7;padding:24px">
                <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
                    
                    <div style="background:linear-gradient(135deg,#1E293B,#334155);padding:28px 30px">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                        <td>
                            <h1 style="color:#fff;margin:0;font-size:18px;font-weight:600;letter-spacing:0.3px">Permis electric de munca</h1>
                        </td>
                        </tr>
                    </table>
                    </div>

                    <div style="padding:32px 30px">
                    <p style="font-size:15px;color:#1E293B;margin:0 0 20px">Buna ziua, <strong>${safeUsername}</strong>!</p>

                    <div style="display:flex;align-items:center;gap:10px;background:#ECFDF5;border-left:4px solid #10B981;border-radius:6px;padding:14px 16px;margin-bottom:20px">
                        <p style="color:#047857;margin:0;font-size:14px">
                        Ati fost adaugat in platforma Permis Electric Munca.
                        </p>
                    </div>

                    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px">
                        Pentru a finaliza crearea contului, va rugam sa va setati parola contului, accesand link-ul de mai jos.
                    </p>


                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                        <td align="center">
                            <a href="${url}" style="background:#1E293B;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
                            Setare parola
                            </a>
                        </td>
                        </tr>
                    </table>
                    </div>

                    <div style="background:#F8FAFC;padding:16px 30px;border-top:1px solid #E2E8F0">
                    <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">Permis Electric Munca — Chiru & Asociatii</p>
                    </div>
                </div>
                </div>
            `
            })

            if(error)
                sendError = error

        }catch(err){ //catch any network failure for clean up
            sendError = err
        }

        if (sendError) {
            //clean up if email sending failed (resend error or network failure) to be ready for another try
            const {error: deleteError} = await supabase.from('users').delete().eq('id', user.id);
            if (deleteError)
               console.error('Invite cleanup failed for user', user.id, deleteError);
            throw new Error(`Resend email failed: ${String(sendError)}`);
        }
        
        return res.status(200).json({success: true, message: 'Invitatia a fost trimisa cu success'})
            
    }catch(err: any){
        console.error('Catch block error:', err.message);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
    
}

export const signup = async(req: Request, res: Response) => {

    const {password, token} = req.body;

    if(typeof password !== 'string' || password.length < 8)
        return res.status(400).json({error: 'Invalid credentials'})

    if (typeof token !== 'string' || token.length === 0) {
        return res.status(400).json({ error: 'Invalid invitation token' });
    }

    try{
        //find the user with that token
        const hashedToken = await crypto.hash('sha256', token)
        const{data: existingUser, error: checkError} = await supabase.from('users').select('id, email, username, set_password_expiry')
                                                    .eq('set_password_token', hashedToken).maybeSingle();
        if(checkError){
            console.log('User check error:', checkError);
            return res.status(500).json({ error: 'Database check failed' });
        }

        //if no user with that token
        if(!existingUser){
            return res.status(401).json({error: 'Forbidden'})
        }

        //check token expiry
        if(new Date() > new Date(existingUser.set_password_expiry)){
            return res.status(400).json({error: 'Invitation expired'})
        }

        //set the password if checks pass
        const password_hash = await hash(password, 10);
        const {data: updateUser, error: updateError} = await supabase.from('users').update({
            'password_hash': password_hash,
            'set_password_token': null, // single-use
            'set_password_expiry': null,
        }).eq('id', existingUser.id).not('set_password_token', 'is', null).select('id').maybeSingle();

        if (updateError) {
            console.error('Update error:', updateError);
            return res.status(500).json({
                error: 'Failed to process signup',
            });
        }

        if (!updateUser) {
            return res.status(409).json({
                error: 'Invitation already used',
            });
        }

        return res.status(200).json({success: true, message: 'Contul a fost creat. Te poți autentifica.'});

    }catch(err: any){
        console.error('Catch block error:', err.message);
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }

}

export const me = async (req: Request, res: Response) => {

    const userId = req.user;
    const {data: userData, error: userError} = await supabase.from('users').select('id, email, username, role').eq('id', userId).maybeSingle();
    if(userError){
        return res.status(500).json({error: 'Internal server error'})
    }

    if(!userData){
        return res.status(401).json({error: 'User not found'});
    }

    return res.status(200).json({success: true, 'data': userData})

}