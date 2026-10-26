/**
 * ความจำของ "เครื่องนี้" ว่าเคยเข้าร้านไหน
 *
 * เก็บใน localStorage (ไม่ใช่ sessionStorage) เพราะเป้าหมายคือ
 * เปิด PWA ขึ้นมาแล้วเด้งเข้าหน้าร้านเดิมได้ทันที ไม่ต้องพิมพ์รหัสร้านซ้ำทุกกะ
 *
 * ไม่ใช่ข้อมูลลับ — รหัสร้านไม่ใช่รหัสผ่าน ตัวกันจริงคือ RLS + tenant_id ใน token
 */
const lastTenantSlugKey = 'pos_last_tenant_slug';

/** บันทึกร้านที่ล็อกอินสำเร็จล่าสุด (เรียกหลัง login ผ่านเท่านั้น) */
export function saveLastTenantSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return;
  try {
    localStorage.setItem(lastTenantSlugKey, normalized);
  } catch {
    // โหมดส่วนตัว/พื้นที่เต็ม — จำไม่ได้ก็ยังใช้งานได้ แค่ต้องกรอก slug เอง
  }
}

/** ร้านที่ใช้ล่าสุดบนเครื่องนี้ หรือ null ถ้ายังไม่เคยล็อกอิน */
export function getLastTenantSlug(): string | null {
  try {
    const value = localStorage.getItem(lastTenantSlugKey)?.trim();
    return value ? value.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** ลบร้านที่จำไว้ (ใช้เมื่อต้องการเริ่มใหม่ทั้งเครื่อง) */
export function clearLastTenantSlug() {
  try {
    localStorage.removeItem(lastTenantSlugKey);
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}
