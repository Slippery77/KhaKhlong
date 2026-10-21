import { createHash, randomBytes } from "crypto";

export const generateRefreshToken = ()=> randomBytes(32).toString('base64url');
export const hashToken = (token:string) => createHash('sha256').update(token).digest('hex');
export const refreshExpireAt = (hours:number):Date => new Date(Date.now() + hours * 60 * 60 * 1000);