import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../auth/dto/login.dto';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { DbContextService } from '../../database/db-context.service';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
    // Inject repository สำหรับค้นหาข้อมูลผู้ใช้ และ JwtService สำหรับสร้าง token
    constructor(
        private userService: UsersService,
        private rolesService :RolesService,
        private jwtService: JwtService,
        private tenantService: TenantsService,
        private readonly db: DbContextService,
        private readonly authRepository: AuthRepository,
    ) {}

    // ฟังก์ชันสำหรับการเข้าสู่ระบบ
    async signIn(dto: LoginDto,clientIp = 'unknown', deviceInfo = 'unknown') {
        // ค้นหาผู้ใช้งานจาก username และ tenantSlug ที่รับมาจาก client
        const tenant = await this.tenantService.findTenantSlug(dto.tenantSlug);
        if(!tenant){
            throw new UnauthorizedException('Tenant not found');
        }
        if(!tenant.is_active){
            throw new UnauthorizedException('Tenant is deactivated');
        }
        return this.db.runInTransaction(
            {tenantId: tenant.tenant_id,userId:null, role:null, clientIp, deviceInfo }, async () => {
                const users = await this.userService.findUsernameAndTenantID(tenant.tenant_id, dto.username);
                // ถ้าไม่พบผู้ใช้ ให้ยกเลิกคำขอและส่ง error 401 Unauthorized
                if(!users){
                    throw new UnauthorizedException('Invalid credentials');
                }
                if (!users.is_active){
                    throw new UnauthorizedException('Account is deactivated');
                }
                // ตรวจสอบว่ารหัสผ่านที่ผู้ใช้ใส่ตรงกับรหัสผ่านที่เก็บไว้ในฐานข้อมูลหรือไม่
                const isPasswordValid = await bcrypt.compare(dto.password, users.password_hash);
                if (!isPasswordValid) {
                    throw new UnauthorizedException('Invalid password');
                }
                const role = await this.rolesService.findRoleByID(users.role_id); 
                // สร้าง payload สำหรับ JWT โดยใส่ข้อมูลสำคัญของผู้ใช้
                const payload = { sub: users.users_id, username: users.username, tenantID: users.tenant_id, role: role.role_name };
                // สร้าง access token จาก payload ที่เตรียมไว้
                const accessToken = await this.jwtService.signAsync(payload);
                // คืนค่า response ที่ประกอบด้วย token และข้อมูลผู้ใช้
                return {
                    accessToken,
                    user: {
                        sub: users.users_id,
                        username: users.username,
                        tenantID: users.tenant_id, // TODO ไว้เดี๋ยวลบถ้าไม่มีตัวไหนใช้
                        role: role.role_name,
                        tenantSlug:dto.tenantSlug
                    },
                };
            }
        );
    }
    
    async logout(){
        await this.authRepository.writeLogoutAudit();
        return { status:'success', message:'ออกจากระบบสำเร็จ'}
    }
}
