import type { AuthUser } from "./types/auth.types";

const refreshKey = 'pos_refresh';
const userKey = 'pos_user';

export function saveSession(refreshToken:string, user:AuthUser){
    sessionStorage.setItem(refreshKey, refreshToken);
    sessionStorage.setItem(userKey, JSON.stringify(user));
}

export function getSavedUser():AuthUser|null{
    const raw = sessionStorage.getItem(userKey); 
    if(!raw){
        return null
    }
    try {
        const parsed = JSON.parse(raw) as AuthUser & { id?: string };
        // เซสชันเก่าที่ยังไม่ได้ล็อกอินใหม่จะไม่มี field sub — แปลงจาก id เดิมให้ใช้ต่อได้
        if (!parsed.sub && parsed.id) {
            parsed.sub = parsed.id;
        }
        return parsed;
    } catch (error) {
        sessionStorage.removeItem(userKey);
        return null;
    }
}

export function setRefreshToken(token:string){
    sessionStorage.setItem(refreshKey,token);
}

export function clearSession(){
    sessionStorage.removeItem(refreshKey);
    sessionStorage.removeItem(userKey);
}

export function getRefreshToken():string|null{
    return sessionStorage.getItem(refreshKey)
}

