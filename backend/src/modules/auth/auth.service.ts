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
    // Inject repository เธชเธณเธซเธฃเธฑเธเธเนเธเธซเธฒเธเนเธญเธกเธนเธฅเธเธนเนเนเธเน เนเธฅเธฐ JwtService เธชเธณเธซเธฃเธฑเธเธชเธฃเนเธฒเธ token
    constructor(
        private userService: UsersService,
        private rolesService :RolesService,
        private jwtService: JwtService,
        private tenantService: TenantsService,
        private readonly db: DbContextService,
        private readonly authRepository: AuthRepository,
        private config: ConfigService,
    ) {}

    // เธชเธฃเนเธฒเธ payload เธชเธณเธซเธฃเธฑเธ JWT เนเธ”เธขเนเธชเนเธเนเธญเธกเธนเธฅเธชเธณเธเธฑเธเธเธญเธเธเธนเนเนเธเน
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

    // เธเธฑเธเธเนเธเธฑเธเธชเธณเธซเธฃเธฑเธเธเธฒเธฃเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธ
    async signIn(dto: LoginDto,clientIp = 'unknown', deviceInfo = 'unknown') {
        // เธเนเธเธซเธฒเธเธนเนเนเธเนเธเธฒเธเธเธฒเธ username เนเธฅเธฐ tenantSlug เธ—เธตเนเธฃเธฑเธเธกเธฒเธเธฒเธ client
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
                // เธ–เนเธฒเนเธกเนเธเธเธเธนเนเนเธเน เนเธซเนเธขเธเน€เธฅเธดเธเธเธณเธเธญเนเธฅเธฐเธชเนเธ error 401 Unauthorized
                if(!users){
                    throw new UnauthorizedException('Invalid credentials');
                }
                if (!users.is_active){
                    throw new UnauthorizedException('Account is deactivated');
                }
                // เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธฃเธซเธฑเธชเธเนเธฒเธเธ—เธตเนเธเธนเนเนเธเนเนเธชเนเธ•เธฃเธเธเธฑเธเธฃเธซเธฑเธชเธเนเธฒเธเธ—เธตเนเน€เธเนเธเนเธงเนเนเธเธเธฒเธเธเนเธญเธกเธนเธฅเธซเธฃเธทเธญเนเธกเน
                const isPasswordValid = await bcrypt.compare(dto.password, users.password_hash);
                if (!isPasswordValid) {
                    throw new UnauthorizedException('Invalid password');
                }

                //เธชเธฃเนเธฒเธ refresh_token 
                const refreshToken = generateRefreshToken();
                await this.authRepository.insertRefreshToken(
                    users.users_id,
                    hashToken(refreshToken),
                    deviceInfo,
                    refreshExpireAt(this.config.getOrThrow<number>('REFRESH_EXPIRES_HOURS')),
                    users.token_version ?? 0,
                );

                const role = await this.rolesService.findRoleByID(users.role_id);
                                // เธชเธฃเนเธฒเธ access token เธเธฒเธ payload เธ—เธตเนเน€เธ•เธฃเธตเธขเธกเนเธงเน
                const accessToken = await this.buildAccessToken({
                    users_id: users.users_id,
                    username: users.username,
                    tenant_id: users.tenant_id,
                    role_name: role.role_name,
                    token_version: users.token_version ?? 0,
                });
                // เธเธทเธเธเนเธฒ response เธ—เธตเนเธเธฃเธฐเธเธญเธเธ”เนเธงเธข token เนเธฅเธฐเธเนเธญเธกเธนเธฅเธเธนเนเนเธเน
                return {
                    accessToken,
                    refreshToken,
                    user: {
                        sub: users.users_id,
                        username: users.username,
                        // เธเธทเนเธญเธ—เธตเนเนเธชเธ”เธเธเธ Header โ€” เนเธชเน fallback เน€เธเนเธ username เน€เธเธทเนเธญเนเธ–เธงเธ—เธตเนเธขเธฑเธเนเธกเนเนเธ”เนเธ•เธฑเนเธ display_name
                        display_name: users.display_name ?? users.username,
                        tenantID: users.tenant_id, // TODO เนเธงเนเน€เธ”เธตเนเธขเธงเธฅเธเธ–เนเธฒเนเธกเนเธกเธตเธ•เธฑเธงเนเธซเธเนเธเน
                        role: role.role_name,
                        tenantSlug:dto.tenantSlug
                    },
                };
            }
        );
    }
    
    async logout(refreshToken?:string){
        
        await this.authRepository.writeLogoutAudit();
        //เน€เธเนเธเธงเนเธฒเธกเธตเธเนเธฒ refresh_token เธซเธฃเธทเธญเธเนเธฒเธงเธ–เนเธฒเธกเธตเธเนเน€เธเนเธฒเน€เธเธทเนเธญเธเนเธ
        if(refreshToken){
            await this.authRepository.deleteRefreshToken(hashToken(refreshToken));
        }
        return { status:'success', message:'เธญเธญเธเธเธฒเธเธฃเธฐเธเธเธชเธณเน€เธฃเนเธ'}
    }    

    async refresh(rawToken:string, clientIp='unknown', deviceInfo='unknown'){
        const hash = hashToken(rawToken);

        const owner = await this.authRepository.resolveRefreshToken(hash);
        if(!owner){
            throw new UnauthorizedException('เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเนเธซเธกเน');
        }

        const result = await this.db.runInTransaction(
            {tenantId:owner.tenant_id, userId:owner.user_id,role: null, clientIp, deviceInfo},
            async () => {
                const row = await this.authRepository.lockRefreshToken(hash);
                if (!row) return { ok: false as const };

                if (row.revoked_at) {
                    // TODO: revoke เธ—เธธเธเนเธเธเธญเธ user เธเธตเน
                    await this.authRepository.revokeAllForUser(row.user_id)
                    return { ok: false as const };
                }
                // TODO: เธ–เนเธฒ row.expires_at <= new Date() เธเธทเธ ok: false
                if(row.expires_at <= new Date()){
                    return {ok:false as const};
                }
                // TODO: เธซเธฒ user เธ”เนเธงเธข findActiveById เธ–เนเธฒเนเธกเนเน€เธเธญเธซเธฃเธทเธญ !is_active เธเธทเธ ok: false
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
                // TODO: revoke เนเธเน€เธเนเธฒเธ”เนเธงเธข revokeByHash(hash)
                await this.authRepository.revokeByHash(hash)
                // TODO: เธชเธฃเนเธฒเธเนเธเนเธซเธกเน เนเธฅเนเธง insert เธ”เนเธงเธข row.expires_at
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
        if (!result.ok) throw new UnauthorizedException('เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเนเธซเธกเน');
            return { accessToken: result.accessToken, refreshToken: result.refreshToken };
    }
}





