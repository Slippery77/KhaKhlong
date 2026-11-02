export interface AuditLogItem {
  log_id: string;
  tenant_id: string;
  user_id: string | null;
  username: string | null;
  user_display_name: string | null;
  action_type: string;
  ip_address: string;
  device_info: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  pagination: AuditPagination;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  action_type?: string;
  user_id?: string;
  from?: string;
  to?: string;
}

export const ACTION_TYPE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; description: string }
> = {
  login_success: {
    label: 'เข้าสู่ระบบสำเร็จ',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    description: 'ผู้ใช้เข้าสู่ระบบด้วยชื่อผู้ใช้และรหัสผ่านถูกต้อง',
  },
  login_failed: {
    label: 'เข้าสู่ระบบไม่สำเร็จ',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    description: 'พยายามเข้าสู่ระบบแต่ใส่รหัสผ่านผิด หรือไม่พบชื่อผู้ใช้',
  },
  logout: {
    label: 'ออกจากระบบ',
    badgeClass: 'bg-stone-100 text-stone-700 border border-stone-200',
    description: 'ผู้ใช้กดออกจากระบบ',
  },
  menu_price_updated: {
    label: 'เปลี่ยนราคาเมนู',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    description: 'มีการเปลี่ยนแปลงราคาของรายการอาหาร',
  },
  role_changed: {
    label: 'เปลี่ยนบทบาทผู้ใช้',
    badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200',
    description: 'มีการแก้ไขสิทธิ์หรือระดับตำแหน่งของผู้ใช้',
  },
  table_status_changed: {
    label: 'เปลี่ยนสถานะโต๊ะ',
    badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    description: 'สถานะโต๊ะอาหารเปลี่ยนแปลง (เช่น ว่าง, ไม่ว่าง, จอง)',
  },
  config_updated: {
    label: 'แก้การตั้งค่าระบบ',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    description: 'มีการแก้ไขคอนฟิกระบบ เช่น อัตราภาษี หรือเปิด/ปิด KDS',
  },
  user_created: {
    label: 'สร้างผู้ใช้ใหม่',
    badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
    description: 'มีการเพิ่มบัญชีผู้ใช้งานใหม่ในร้าน',
  },
  user_deactivated: {
    label: 'ปิดใช้งานผู้ใช้',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    description: 'ระงับการเข้าถึงของบัญชีผู้ใช้',
  },
  user_reactivated: {
    label: 'เปิดใช้งานผู้ใช้',
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    description: 'ยกเลิกการระงับและเปิดให้เข้าสู่ระบบได้อีกครั้ง',
  },
  pin_changed: {
    label: 'เปลี่ยน PIN',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    description: 'มีการตั้งค่าหรือเปลี่ยนรหัส PIN ยืนยันตัวตน',
  },
  password_changed: {
    label: 'เปลี่ยนรหัสผ่าน',
    badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    description: 'มีการเปลี่ยนรหัสผ่านเข้าสู่ระบบ (ยกเลิก token เดิม)',
  },
  pin_locked: {
    label: 'PIN ถูกระงับชั่วคราว',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    description: 'กดรหัส PIN ผิดเกินจำนวนครั้งที่กำหนด (ล็อก 5 นาที)',
  },
  order_closed_unpaid: {
    label: 'ปิดบิลไม่ชำระเงิน (Walkout)',
    badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200',
    description: 'ลูกค้ายกเลิก/หนีบิล ถูกสั่งปิดโดยผู้จัดการ/เจ้าของร้าน',
  },
  shift_reopened: {
    label: 'เปิดกะเดิมซ้ำ',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
    description: 'มีการเปิดกะที่ปิดไปแล้วเพื่อแก้ไขข้อมูล',
  },
  inventory_adjusted: {
    label: 'ปรับสต็อกผิดปกติ',
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
    description: 'นับสต็อกวัตถุดิบแล้วพบส่วนต่างเพี้ยนเกินเกณฑ์ควบคุม',
  },
  tenant_updated: {
    label: 'แก้ไขข้อมูลร้านค้า',
    badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200',
    description: 'มีการปรับปรุงข้อมูลร้าน เช่น ชื่อ, เบอร์โทร หรือที่อยู่',
  },
};

