import { getRefreshToken ,setRefreshToken } from "../features/auth/authStorage";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// ---------- ช่องให้ AuthProvider ลงทะเบียน ----------
type AuthHandlers={
  onRefreshed:(accessToken:string) => void; // ได้ access ใบใหม่
  onSessionExpired:()=>void; // refresh ไม่ได้แล้ว ต้อง login ใหม่
};

let handlers: AuthHandlers |null = null;

export function setAuthHandlers(h: AuthHandlers|null){
  handlers = h;
}

// ---------- refresh ----------
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });

    if (res.status === 401) return null;                        // session ตายจริง
    if (!res.ok) throw new ApiError(res.status, 'refresh failed'); // อย่างอื่น ไม่เตะออก

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setRefreshToken(data.refreshToken);   // rotation: ต้องเก็บใบใหม่ทุกครั้ง
    handlers?.onRefreshed(data.accessToken);
    return data.accessToken;
}

export function refreshOnce(): Promise<string | null> {
    if (!refreshing) {
        refreshing = doRefresh().finally(() => {
            refreshing = null;
        });
    }
    return refreshing;
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

// ห้าม refresh แล้วยิงซ้ำกับ 2 path นี้
// login ได้ 401 = รหัสผิด ไม่ใช่ token หมดอายุ
// refresh ได้ 401 = จัดการใน doRefresh แล้ว
const NO_RETRY = ['/auth/login', '/auth/refresh'];

function send(path: string, token: string | null, method: Method, body?: unknown) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetch(`/api${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

export async function apiFetch<T>( // function ที่รอข้อมูลจาก request
  path: string,             // ไปที่ไหน เช่น '/menu/admin'
  token: string | null,     // บัตรพนักงาน (null = ยังไม่ล็อกอิน)
  method: Method = 'GET',   // จะทำอะไร ถ้าไม่บอกถือว่าเป็น GET (อ่านอย่างเดียว)
  body?: unknown,           // ของที่ส่งไป มีหรือไม่มีก็ได้ (? = ไม่บังคับ)
): Promise<T> { // <T> มันคือช่องที่รอชนิดข้อมูลที่จะได้กลับมา เช่น เรียก api/categories response ของ Category สมมติเฉยๆ

  // รอการตอบกลับจาก backend (response) จาก path ที่ส่ง request ไปขอข้อมูล
  let res = await send(path, token, method, body);

  if (res.status === 401 && !NO_RETRY.includes(path)) {
      const newToken = await refreshOnce();
      if (newToken) {
        res = await send(path, newToken, method, body); // ยิงซ้ำครั้งเดียว
      }else {
        handlers?.onSessionExpired();
      }
  }

  //ตรวจเช็คว่าตอบกลับ 200 ไหม ถ้าไม่ได้ error อะไรกลับมา
  if (!res.ok) {
      const err = await res.json().catch(() => null);   // บาง error ไม่มี body
      const raw = err?.message ?? res.statusText;
      const message = Array.isArray(raw) ? raw.join(', ') : raw;
      throw new ApiError(res.status, message, err);
    }
    return res.json() as Promise<T>; //ส่งข้อมูลกลับไปยังคนที่เรียก
}
