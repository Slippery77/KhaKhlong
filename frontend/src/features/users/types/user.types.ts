// ตำแหน่งของผู้ใช้ในร้าน
export type UserRole = 'owner' | 'manager' | 'employee';

// ตำแหน่งที่เจ้าของร้านเลือกได้ตอนสร้างบัญชีใหม่
export type AssignableRole = 'manager' | 'employee';

export interface AppUser {
    user_id: string;
    username: string;
    display_name: string;
    role_name: UserRole;
    is_active: boolean;
    created_at: string;
    last_login_at: string | null;
    deactivated_at: string | null;
    has_pin: boolean;
}

// ค่าที่ฟอร์มส่งออกไปให้หน้า page
export interface UserFormValues {
    display_name: string;   // ชื่อ-นามสกุล
    username: string;       // ชื่อผู้ใช้สำหรับเข้าสู่ระบบ
    role_name?: AssignableRole;  // ไม่ส่งตอนแก้ไขบัญชีเจ้าของร้าน (เปลี่ยนตำแหน่งไม่ได้)
    pin: string;            // PIN 6 หลัก ว่าง = ไม่ตั้ง/ไม่เปลี่ยน
    password: string;       // ตอนแก้ไข: ว่าง = ไม่เปลี่ยนรหัสผ่าน
    confirm_password: string;
}

export const ROLE_LABEL: Record<UserRole, string> = {
    owner: 'เจ้าของร้าน',
    manager: 'ผู้จัดการ',
    employee: 'พนักงาน',
};

export const ASSIGNABLE_ROLES: AssignableRole[] = ['manager', 'employee'];
