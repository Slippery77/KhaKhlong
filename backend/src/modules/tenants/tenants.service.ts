import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantsRepository } from './tenants.repository';
import { UpdateTenantDTO } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
    constructor(
        private readonly tenantsRepository : TenantsRepository 
    ){}

    /**
     * สร้างร้านใหม่ ใช้ตอนสมัครเจ้าของร้าน (RegisterService)
     * ส่งต่อให้ repository ตรง ๆ ไม่มี logic เพิ่ม
     * คืนค่า { tenant_id } ของร้านที่สร้าง
     */
    async createTenant (
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
        return this.tenantsRepository.createTenant(
            tenant_id,
            restaurant_name,
            tenant_slug,
            phone,
            house_number,
            moo,
            soi,
            road,
            subdistrict,
            district,
            province,
            postal_code
        );
    }

    /**
     * หาร้านจาก slug คืน { tenant_id, is_active } หรือ undefined ถ้าไม่พบ
     * ใช้ตอน login (หาว่า user จะเข้าร้านไหน) และตอนสมัคร (เช็คว่า slug ซ้ำไหม)
     */
    async findTenantSlug(tenant_slug:string){
        return this.tenantsRepository.findTenantSlug(tenant_slug);
    }

    /**
     * GET /store — ดึงข้อมูลร้านของ user ที่ login อยู่
     * ร้านมาจาก tenant context ของ request ไม่ต้องส่ง id มา
     * ไม่พบร้าน = 404
     */
    async listStore(){
        const result = await this.tenantsRepository.listStore();
        if(!result){
            throw new NotFoundException('ไม่พบร้านอาหารนี้')
        }
        return {status:'success', data:result};
    }

    /**
     * PATCH /store — แก้ข้อมูลร้าน (ชื่อ ที่อยู่ เบอร์ เลขผู้เสียภาษี)
     *
     * ลำดับการทำงาน:
     * 1. เก็บเฉพาะ field ที่ส่งมาจริง (ไม่ใช่ undefined) ถ้าไม่มีเลย = 400
     * 2. จะลบ tax_id (ส่ง null) ได้ต่อเมื่อ vat_mode = 'none' เพราะออกใบกำกับภาษีต้องมีเลขนี้
     * 3. ล็อกแถวร้านด้วย FOR UPDATE แล้วอ่านค่าเดิม กันคนแก้พร้อมกัน
     * 4. เทียบค่าเดิมกับค่าใหม่ เก็บเฉพาะ field ที่เปลี่ยนจริง
     *    ถ้าไม่มีอะไรเปลี่ยน คืนค่าเดิมเลย ไม่ UPDATE และไม่เขียน audit
     * 5. UPDATE แล้วเขียน audit log (old/new ของแต่ละ field) ใน transaction เดียวกัน
     *    ถ้าขั้นไหนพัง rollback ทั้งคู่
     *
     * error จาก DB ที่แปลงเป็น 400:
     * - 22001 ข้อความยาวเกินคอลัมน์
     * - 23514 ผิด CHECK constraint (เช่น tax_id ไม่ใช่ตัวเลข 13 หลัก)
     */
    async updateStore(dto:UpdateTenantDTO){
        const fields = Object.keys(dto).filter(
            (k) => dto[k as keyof UpdateTenantDTO] !== undefined
        );
        if(fields.length === 0){
            throw new BadRequestException('ข้อมูลที่ส่งมาว่าง');
        }
        if (dto.tax_id === null) {
            const mode = await this.tenantsRepository.getVatMode(); // SELECT cfg(app_tenant_id(), 'vat_mode')
            if (mode !== 'none') throw new BadRequestException('ปิด VAT ก่อนจึงจะลบเลขผู้เสียภาษีได้');
        }
        const before = await this.tenantsRepository.findForUpdate();
            if (!before) throw new NotFoundException('ไม่พบร้านนี้');

        const changed: Record<string, { old: unknown; new: unknown }> = {};
        for (const f of fields) {
            const next = dto[f as keyof UpdateTenantDTO];
            if (before[f] !== next) changed[f] = { old: before[f], new: next };
        }

        if (Object.keys(changed).length === 0) {
            return { status: 'success', data: before };
        }

        try {
            const result = await this.tenantsRepository.updateTenants(dto, Object.keys(changed));
            await this.tenantsRepository.writeAudit(changed);
            return { status: 'success', data: result };
        } catch (err: any) {
            if(err.code === '22001'){
                throw new BadRequestException('กรอกข้อความยาวเกินกำหนด')
            }

            if( err.code === '23514'){
                throw new BadRequestException('ข้อมูลไม่ถูกต้องตามรูปแบบ');
            }
            throw err;
        }
    }
}