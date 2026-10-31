import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
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
    static readonly PASSWORD_MAX_ATTEMPTS = 5;
    static readonly PASSWORD_LOCK_MINUTES = 5;

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
    private async buildAccessToken(user:{users_id: string; username: string; tenant_id: string; role_name: string; token_version?: number}){
        const payload ={
            sub: user.users_id,
            username: user.username,
            tenantID: user.tenant_id,
            role: user.role_name,
            token_version: user.token_version ?? 0,
                    };
        return this.jwtService.signAsync(payload)
    }

    private buildAccountLockedException(lockedUntil: Date, now = new Date()): HttpException {
        const remainingSeconds = Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
        const remainingMinutes = Math.max(1, Math.ceil(remainingSeconds / 60));
        const unlockTimeStr = lockedUntil.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Bangkok',
        });
        return new HttpException(
            {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                code: 'ACCOUNT_LOCKED',
                lockedUntil: lockedUntil.toISOString(),
                remainingSeconds,
                message: `บัญชีถูกระงับชั่วคราวเนื่องจากใส่รหัสผ่านผิดครบ ${AuthService.PASSWORD_MAX_ATTEMPTS} ครั้ง กรุณาลองใหม่หลังเวลา ${unlockTimeStr} น. (อีกประมาณ ${remainingMinutes} นาที)`,
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
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
                // ถ้าไม่พบผู้ใช้ บันทึก audit login_failed แล้วส่ง 401
                if(!users){
                    await this.authRepository
                        .writeLoginFailedAuditDurable(null, {
                            username: dto.username,
                            reason: 'user_not_found',
                        })
                        .catch(() => undefined);
                    throw new UnauthorizedException('Invalid credentials');
                }
                if (!users.is_active){
                    await this.authRepository
                        .writeLoginFailedAuditDurable(users.users_id, {
                            username: users.username,
                            reason: 'account_deactivated',
                        })
                        .catch(() => undefined);
                    throw new UnauthorizedException('Account is deactivated');
                }

                // ตรวจสอบว่าบัญชียังติดสถานะล็อกอยู่หรือไม่ (password_locked_until > now())
                if (users.password_locked_until) {
                    const lockedUntil = new Date(users.password_locked_until);
                    const now = new Date();
                    if (lockedUntil > now) {
                        await this.authRepository
                            .writeLoginFailedAuditDurable(users.users_id, {
                                username: users.username,
                                reason: 'account_locked',
                                locked_until: lockedUntil.toISOString(),
                            })
                            .catch(() => undefined);
                        throw this.buildAccountLockedException(lockedUntil, now);
                    }
                }

                // ตรวจสอบว่ารหัสผ่านที่ผู้ใช้ใส่ตรงกับรหัสผ่านที่เก็บไว้ในฐานข้อมูลหรือไม่
                const isPasswordValid = await bcrypt.compare(dto.password, users.password_hash);
                if (!isPasswordValid) {
                    let lockedUntil: Date | null = null;
                    let failedAttempts = (users.password_failed_attempts ?? 0) + 1;
                    try {
                        const updated = await this.userService.recordPasswordFailureDurable(
                            users.users_id,
                            AuthService.PASSWORD_MAX_ATTEMPTS,
                            AuthService.PASSWORD_LOCK_MINUTES,
                        );
                        if (updated?.password_failed_attempts != null) {
                            failedAttempts = Number(updated.password_failed_attempts);
                        }
                        const lock = updated?.password_locked_until ? new Date(updated.password_locked_until) : null;
                        if (lock && lock > new Date()) {
                            lockedUntil = lock;
                        }
                    } catch {
                        // ถ้านับครั้งผิดล้มเหลว ยังต้องปฏิเสธรหัสผ่านนี้ตามปกติ
                    }

                    await this.authRepository
                        .writeLoginFailedAuditDurable(users.users_id, {
                            username: users.username,
                            reason: 'invalid_password',
                            failed_attempts: failedAttempts,
                            ...(lockedUntil ? { locked_until: lockedUntil.toISOString() } : {}),
                        })
                        .catch(() => undefined);

                    if (lockedUntil) {
                        throw this.buildAccountLockedException(lockedUntil, new Date());
                    }

                    const remainingAttempts = Math.max(0, AuthService.PASSWORD_MAX_ATTEMPTS - failedAttempts);
                    throw new UnauthorizedException({
                        statusCode: HttpStatus.UNAUTHORIZED,
                        code: 'INVALID_CREDENTIALS',
                        remainingAttempts,
                        message: 'Invalid password',
                    });
                }

                // ล้างตัวนับรหัสผ่านผิด + อัปเดต last_login_at + บันทึก audit login_success
                await this.userService.recordLoginSuccess(users.users_id);
                await this.authRepository.writeLoginSuccessAudit(users.users_id, {
                    username: users.username,
                });

                //สร้าง refresh_token 
                const refreshToken = generateRefreshToken();
                await this.authRepository.insertRefreshToken(
                    users.users_id,
                    hashToken(refreshToken),
                    deviceInfo,
                    refreshExpireAt(this.config.getOrThrow<number>('REFRESH_EXPIRES_HOURS')),
                    users.token_version ?? 0,
                );

                const role = await this.rolesService.findRoleByID(users.role_id);
                // สร้าง access token จาก payload ที่เตรียมไว้
                const accessToken = await this.buildAccessToken({
                    users_id: users.users_id,
                    username: users.username,
                    tenant_id: users.tenant_id,
                    role_name: role.role_name,
                    token_version: users.token_version ?? 0,
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
                // refresh token ใบนี้ออกมาก่อนที่ token_version จะถูก bump
                // (เช่น เปลี่ยนรหัสผ่าน / ถูกเพิกถอน session) → ใช้ไม่ได้ ต้อง login ใหม่
                if (row.token_version !== (activeUser.token_version ?? 0)) {
                    await this.authRepository.revokeByHash(hash);
                    return {ok:false as const};
                }
                // TODO: revoke ใบเก่าด้วย revokeByHash(hash)
                await this.authRepository.revokeByHash(hash)
                // TODO: สร้างใบใหม่ แล้ว insert ด้วย row.expires_at
                const newRefresh = generateRefreshToken();
                await this.authRepository.insertRefreshToken(
                        activeUser.users_id,
                        hashToken(newRefresh),
                        deviceInfo,
                        row.expires_at,
                        activeUser.token_version ?? 0,
                );   
                // TODO: accessToken = await this.buildAccessToken(user)
                const accessToken = await this.buildAccessToken({
                    users_id: activeUser.users_id,
                    username: activeUser.username,
                    tenant_id: activeUser.tenant_id,
                    role_name: activeUser.role_name,
                    token_version: activeUser.token_version ?? 0,
                })
            return { ok: true as const, accessToken, refreshToken: newRefresh };            }
        )
        if (!result.ok) throw new UnauthorizedException('กรุณาเข้าสู่ระบบใหม่');
            return { accessToken: result.accessToken, refreshToken: result.refreshToken };
    }
}
