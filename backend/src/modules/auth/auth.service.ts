import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../auth/dto/login.dto';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { DbContextService } from '../../database/db-context.service';
import { AuthRepository } from './auth.repository';
import { generateRefreshToken, hashToken, refreshExpireAt } from './refresh-token.util';
import { ConfigService } from '@nestjs/config';

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
        private config: ConfigService,
    ) {}

    // สร้าง payload สำหรับ JWT โดยใส่ข้อมูลสำคัญของผู้ใช้
    private async buildAccessToken(user:{users_id: string; username: string; tenant_id: string; role_name: string;}){
        const payload ={
            sub: user.users_id,
            username: user.username,
            tenantID: user.tenant_id,
            role: user.role_name,
        };
        return this.jwtService.signAsync(payload)
    }

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

                //สร้าง refresh_token 
                const refreshToken = generateRefreshToken();
                await this.authRepository.insertRefreshToken(users.users_id, hashToken(refreshToken), deviceInfo, refreshExpireAt(this.config.getOrThrow<number>('REFRESH_EXPIRES_HOURS')));

                const role = await this.rolesService.findRoleByID(users.role_id); 
                // สร้าง access token จาก payload ที่เตรียมไว้
                const accessToken = await this.buildAccessToken({
                    users_id: users.users_id,
                    username: users.username,
                    tenant_id: users.tenant_id,
                    role_name: role.role_name,
                });
                // คืนค่า response ที่ประกอบด้วย token และข้อมูลผู้ใช้
                return {
                    accessToken,
                    refreshToken,
                    user: {
                        sub: users.users_id,
                        username: users.username,
                        // ชื่อที่แสดงบน Header — ใส่ fallback เป็น username เผื่อแถวที่ยังไม่ได้ตั้ง display_name
                        display_name: users.display_name ?? users.username,
                        tenantID: users.tenant_id, // TODO ไว้เดี๋ยวลบถ้าไม่มีตัวไหนใช้
                        role: role.role_name,
                        tenantSlug:dto.tenantSlug
                    },
                };
            }
        );
    }
    
    async logout(refreshToken?:string){
        
        await this.authRepository.writeLogoutAudit();
        //เช็คว่ามีค่า refresh_token หรือป่าวถ้ามีก็เข้าเงื่อนไข
        if(refreshToken){
            await this.authRepository.deleteRefreshToken(hashToken(refreshToken));
        }
        return { status:'success', message:'ออกจากระบบสำเร็จ'}
    }    

    async refresh(rawToken:string, clientIp='unknown', deviceInfo='unknown'){
        const hash = hashToken(rawToken);

        const owner = await this.authRepository.resolveRefreshToken(hash);
        if(!owner){
            throw new UnauthorizedException('กรุณาเข้าสู่ระบบใหม่');
        }

        const result = await this.db.runInTransaction(
            {tenantId:owner.tenant_id, userId:owner.user_id,role: null, clientIp, deviceInfo},
            async () => {
                const row = await this.authRepository.lockRefreshToken(hash);
                if (!row) return { ok: false as const };

                if (row.revoked_at) {
                    // TODO: revoke ทุกใบของ user นี้
                    await this.authRepository.revokeAllForUser(row.user_id)
                    return { ok: false as const };
                }
                // TODO: ถ้า row.expires_at <= new Date() คืน ok: false
                if(row.expires_at <= new Date()){
                    return {ok:false as const};
                }
                // TODO: หา user ด้วย findActiveById ถ้าไม่เจอหรือ !is_active คืน ok: false
                const activeUser = await this.userService.findActiveById(owner.user_id)
                if(!activeUser || !activeUser.is_active){
                    return {ok:false as const};
                }
                // TODO: revoke ใบเก่าด้วย revokeByHash(hash)
                await this.authRepository.revokeByHash(hash)
                // TODO: สร้างใบใหม่ แล้ว insert ด้วย row.expires_at
                const newRefresh = generateRefreshToken();
                await this.authRepository.insertRefreshToken(
                        activeUser.users_id, hashToken(newRefresh), deviceInfo, row.expires_at,
                );   
                // TODO: accessToken = await this.buildAccessToken(user)
                const accessToken = await this.buildAccessToken({
                    users_id: activeUser.users_id,
                    username: activeUser.username,
                    tenant_id: activeUser.tenant_id,
                    role_name: activeUser.role_name,
                })
            return { ok: true as const, accessToken, refreshToken: newRefresh };            }
        )
        if (!result.ok) throw new UnauthorizedException('กรุณาเข้าสู่ระบบใหม่');
            return { accessToken: result.accessToken, refreshToken: result.refreshToken };
    }
}
