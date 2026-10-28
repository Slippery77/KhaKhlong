import { Module , Global} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController} from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtModule } from '@nestjs/jwt';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { TenantsModule} from '../tenants/tenants.module';
import { AuthRepository } from './auth.repository';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        UsersModule,
        RolesModule,
        TenantsModule,
        JwtModule.registerAsync({
            global:true,
            inject:[ConfigService],
            useFactory: (config:ConfigService) => ({
                secret:config.getOrThrow('JWT_SECRET'),
                signOptions: { expiresIn:config.get('JWT_EXPIRES_IN','1d')},
            }),
        }),
    ],
    providers: [AuthService, PermissionCacheService,
        /*เธ—เธธเธ Controller เนเธเธฃเธฐเธเธเธ–เธนเธ Guard เธเธฅเธธเธกเธญเธฑเธ•เนเธเธกเธฑเธ•เธด เนเธ”เธขเนเธกเนเธ•เนเธญเธเน€เธเธตเธขเธ 
         @UseGuards(...) เธเนเธณเธ—เธธเธเนเธเธฅเน โ€” Controller เนเธซเธเธ•เนเธญเธเธเธฒเธฃเน€เธเธดเธ”เธชเธฒเธเธฒเธฃเธ“เธฐเธเธฃเธดเธเน (เน€เธเนเธ POST /auth/login) 
         เธเนเธญเธขเนเธเธฐ @Public() เน€เธญเธฒ เธ•เธฃเธเธเธตเนเธเธทเธญเธเธธเธ”เธ—เธตเนเธ—เธณเนเธซเนเธฃเธฐเธเธ "เธเธฅเธญเธ”เธ เธฑเธขเน€เธเนเธเธเนเธฒเน€เธฃเธดเนเธกเธ•เนเธ" (Secure by Default) เนเธ—เธเธ—เธตเนเธเธฐเธซเธงเธฑเธเธเธถเนเธเธเธงเธฒเธกเธเธณ Dev เธ—เธธเธเธเธเธ—เธธเธเนเธเธฅเน*/
        {provide: APP_GUARD, useClass: JwtAuthGuard},
        {provide: APP_GUARD , useClass: PermissionsGuard},
        AuthRepository
    ],
    controllers: [AuthController],
    exports:[PermissionCacheService, JwtModule]
})
export class AuthModule{}


