import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { UpdateTenantDTO } from './dto/update-tenant.dto';

// คอลัมน์ที่ PATCH /store แก้ได้ ใช้เป็น whitelist กันชื่อคอลัมน์แปลกปลอมเข้าไปใน SQL
// เพิ่ม field ใน UpdateTenantDTO เมื่อไหร่ ต้องเพิ่มที่นี่ด้วย
const UPDATE_TENANTS = ['restaurant_name','tax_id','phone','house_number','moo','soi','road','subdistrict','district','province','postal_code','promptpay_id']
// คอลัมน์ที่คืนให้ client (ไม่คืน tenant_id, tenant_slug, is_active)
const TENANTS_COLS = `restaurant_name,tax_id,phone,house_number,moo,soi,road,subdistrict,district,province,postal_code,updated_at,promptpay_id`;

@Injectable()
export class TenantsRepository{
    constructor(private readonly db: DbContextService){}

    /**
     * INSERT ร้านใหม่ลงตาราง tenants คืน { tenant_id }
     * หลัง INSERT trigger seed_config จะสร้างค่า config เริ่มต้นของร้านให้อัตโนมัติ
     */
    async createTenant(
        tenant_id:string,
        restaurant_name:string,
        tenant_slug:string,
        phone:string,
        house_number:string,
        moo:string,
        soi:string,
        road:string,
        subdistrict:string,
        district:string,
        province:string,
        postal_code:string
    ){
        const sql = `INSERT INTO tenants (
        tenant_id, restaurant_name, tenant_slug , phone , house_number, moo, soi, road, subdistrict, district, province, postal_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING tenant_id;
        `
        const result = await this.db.query(sql,[tenant_id, restaurant_name, tenant_slug, phone, house_number, moo, soi, road, subdistrict, district, province, postal_code]);
        return  result.rows[0];
    }

   /** หาร้านจาก slug คืน { tenant_id, is_active } หรือ undefined ถ้าไม่พบ */
   async findTenantSlug(tenant_slug:string){
        // resolve_tenant เป็น SECURITY DEFINER จึงข้าม RLS ได้
        // ใช้ referenceQuery เพราะตอน login ยังไม่มี context
        const sql = `SELECT tenant_id, is_active FROM resolve_tenant($1)`;    
    
        //const sql = `SELECT tenant_id from tenants where tenant_slug =$1;`
        const result = await this.db.referenceQuery(sql,[tenant_slug]);
        return result.rows[0]
   }

   /**
    * อ่านข้อมูลร้านปัจจุบัน (ร้านจาก app_tenant_id() ที่ interceptor ตั้งไว้)
    * คืน null ถ้าไม่พบ
    */
   async listStore(){
    const sql=`
        SELECT ${TENANTS_COLS}
        FROM tenants
        WHERE tenant_id = app_tenant_id();
    `;
    const result = await this.db.query(sql);
    return result.rows[0]??null;
   }

   /**
    * UPDATE เฉพาะคอลัมน์ใน fields โดยดึงค่าจาก dto
    * สร้าง SET แบบ dynamic: ชื่อคอลัมน์ต้องอยู่ใน UPDATE_TENANTS ส่วนค่าส่งเป็น $1, $2, ... เสมอ
    * คืนแถวหลังแก้ หรือ null ถ้าไม่มีคอลัมน์ให้แก้ / ไม่พบร้าน
    */
   async updateTenants(dto:UpdateTenantDTO,fields:string[]){
    const params: unknown[] = [];
    const sets:string[] = [];
    for(const f of fields){
        if(!UPDATE_TENANTS.includes(f)){
            continue;
        }
        params.push(dto[f as keyof UpdateTenantDTO]);
        sets.push(`${f} = $${params.length}`);
    }
    if(sets.length === 0 ) return null;
    const sql = `
        UPDATE tenants
        SET ${sets.join(',')} , updated_at = now()
        where tenant_id = app_tenant_id()
        RETURNING ${TENANTS_COLS}
    `;
    const result = await this.db.query(sql,params);
    return result.rows[0]??null;
    }
    
    /**
     * อ่าน vat_mode ของร้าน: 'none' | 'inclusive' | 'exclusive'
     * cfg() คืนค่าที่ร้านตั้งไว้ ถ้าไม่ได้ตั้งใช้ค่า default จาก config_definitions
     */
    async getVatMode(){
        const sql = `
            SELECT cfg(app_tenant_id(), 'vat_mode') as vat_mode
        `;
        const result = await this.db.query(sql);
        return result.rows[0].vat_mode as string;
    }

    /**
     * อ่านข้อมูลร้านพร้อมล็อกแถว (FOR UPDATE) ก่อนแก้
     * ค่าที่ได้ใช้เป็นค่า "old" ใน audit log
     * ล็อกค้างจนจบ transaction ของ request นี้ request อื่นที่จะแก้ร้านเดียวกันต้องรอ
     * จึงไม่มีทางที่สองคนแก้พร้อมกันแล้ว log ค่าเดิมผิด
     */
    async findForUpdate() {
        const sql = `
            SELECT ${TENANTS_COLS}
            FROM tenants
            WHERE tenant_id = app_tenant_id()
            FOR UPDATE 
        `;
    // lock ไว้ให้แค่คนเดียวสามารถแก้ค่าได้ แก้ค่าพร้อมกันไม่ได้
    const result = await this.db.query(sql);
    return result.rows[0] ?? null;
    }

    /**
     * เขียน audit log action 'tenant_updated'
     * metadata = { changed: { field: { old, new } } }
     * audit_write() เติม user_id, IP, device จาก context ของ request ให้เอง
     */
    async writeAudit(changed: Record<string, { old: unknown; new: unknown }>) {
    const sql = `SELECT audit_write(app_tenant_id(), 'tenant_updated', $1::jsonb)`;
    await this.db.query(sql, [JSON.stringify({ changed })]);
    }
}