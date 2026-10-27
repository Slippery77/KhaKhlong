import { RegisterOwnerDto } from './dto/registerOwner.dto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { TenantsService } from '../tenants/tenants.service';
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { randomUUID } from 'crypto';

@Injectable()
export class RegisterService {
    constructor(
        private userService: UsersService,
        private rolesService: RolesService,
        private tenantsService: TenantsService,
        private readonly db: DbContextService,
    ) {}

    async registrationOwner(dto: RegisterOwnerDto,
        clientIP = 'unknown',
        deviceInfo = 'unknown'
    ) {

        // แปลงรหัสผ่านเป็น hash เพื่อความปลอดภัยก่อนเก็บในฐานข้อมูล
        const hash_password = await bcrypt.hash(dto.password, 10);
        const hash_pin = await bcrypt.hash(dto.pin,10)
        const tenantID = randomUUID();
        try{
            return await this.db.runInTransaction({
                tenantId: tenantID,
                userId:null,
                role:'owner',
                clientIp: clientIP,
                deviceInfo: deviceInfo,
            }, async () => {
                 // ตรวจสอบว่า tenant slug นี้ถูกใช้ไปแล้วหรือยัง
                if (await this.tenantsService.findTenantSlug(dto.tenant_slug)) {
                    throw new ConflictException('Tenant Slug already exist!');
                }

                // ตรวจสอบว่าอีเมลนี้ถูกใช้แล้วหรือยัง
                if (await this.userService.findEmail(dto.email)) {
                    throw new ConflictException('Email already exist!');
                }

                const roleOwner = await this.rolesService.findRoleName('owner');
                // ค้นหา role ของ owner เพื่อใช้เป็นบทบาทเริ่มต้นของผู้สร้าง tenant
                if (!roleOwner) {
                    throw new InternalServerErrorException('Owner role not found!');
                }

                const tenant = await this.tenantsService.createTenant(
                tenantID,
                dto.restaurant_name,
                dto.tenant_slug,
                dto.phone,
                dto.house_number,
                dto.moo,
                dto.soi,
                dto.road,
                dto.subdistrict,
                dto.district,
                dto.province,
                dto.postal_code,
                );
                const owner = await this.userService.createOwner(
                    tenant.tenant_id,
                    roleOwner.role_id,
                    dto.username,
                    dto.email,
                    hash_password,
                    hash_pin,
                    dto.display_name
                );
                return { 
                    message: 'Register Successfully!' ,
                    tenant_id: tenant.tenant_id,
                    tenant_slug: dto.tenant_slug,
                    tenant_name: dto.restaurant_name,
                    users_id: owner.users_id,
                    display_name: dto.display_name,
                    username: dto.username,
                };
            });
        }catch(err:any){
            // ถ้าสomething ผิดพลาดให้ rollback เพื่อไม่ให้ข้อมูลกึ่งสำเร็จค้างอยู่
            if(err.code === '23505'){
                if (err.constraint === 'tenants_tenant_slug_key')      throw new ConflictException('Tenant slug นี้ถูกใช้แล้ว');
                if (err.constraint === 'uq_users_email_lower')          throw new ConflictException('อีเมลนี้ถูกใช้แล้ว');
                if (err.constraint === 'uq_users_tenant_username_lower') throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
                throw new ConflictException('ข้อมูลซ้ำกับที่มีอยู่แล้ว');
            }
            throw err;
        }
    }
}