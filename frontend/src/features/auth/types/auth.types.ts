// LoginCredentials สร้าง interface สำหรับข้อมูลการเข้าสู่ระบบของผู้ใช้
export interface LoginCredentials {
    'tenantSlug': string;
    'username': string;
    'password': string;
}

// AuthUser สร้าง interface สำหรับข้อมูลผู้ใช้ที่ได้รับหลังจาก(Backend)เข้าสู่ระบบสำเร็จ 
export interface AuthUser {
    'sub':string;          // รหัสผู้ใช้ (backend ส่ง field นี้กลับมา)
    'username':string;
    'display_name'?:string; // ชื่อ-นามสกุลที่แสดงบน Header (session เก่าจะไม่มีค่านี้)
    'role':string;
    'tenantSlug':string;
    'tenantID'?:string;
}

// LoginResponse สร้าง interface สำหรับข้อมูลการตอบกลับ(Backend)หลังจากเข้าสู่ระบบสำเร็จ
export interface LoginResponse {
    'accessToken': string; // Token สำหรับการเข้าถึง API (JWT Token)
    'user': AuthUser;
    'refreshToken':string;
}
