export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export async function apiFetch<T>( // function ที่รอข้อมูลจาก request
  path: string,             // ไปที่ไหน เช่น '/menu/admin'
  token: string | null,     // บัตรพนักงาน (null = ยังไม่ล็อกอิน)
  method: Method = 'GET',   // จะทำอะไร ถ้าไม่บอกถือว่าเป็น GET (อ่านอย่างเดียว)
  body?: unknown,           // ของที่ส่งไป มีหรือไม่มีก็ได้ (? = ไม่บังคับ)
): Promise<T> { // <T> มันคือช่องที่รอชนิดข้อมูลที่จะได้กลับมา เช่น เรียก api/categories response ของ Category สมมติเฉยๆ

//เป็นการเก็บข้อมูล header ในการส่งข้อมูลแบบไหน ต้องส่ง token ไปด้วยไหมใช้ในการยืนยันตัวตน เพื่อให้ backend เข้าใจว่าข้อมูลที่ส่งมาเป็นแบบไหน
const headers: Record<string, string> = {};
if (body !== undefined) headers['Content-Type'] = 'application/json';
if (token) headers['Authorization'] = `Bearer ${token}`;

// รอการตอบกลับจาก backend (response) จาก path ที่ส่ง request ไปขอข้อมูล
const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
});

//ตรวจเช็คว่าตอบกลับ 200 ไหม ถ้าไม่ได้ error อะไรกลับมา
if (!res.ok) {
    const err = await res.json().catch(() => null);   // บาง error ไม่มี body
    const raw = err?.message ?? res.statusText;
    const message = Array.isArray(raw) ? raw.join(', ') : raw;
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>; //ส่งข้อมูลกลับไปยังคนที่เรียก
}
