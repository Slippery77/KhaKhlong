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

@Global()
@Module({
    imports: [
        UsersModule,
        RolesModule,
        TenantsModule,
        JwtModule.registerAsync({
            global:true,
            useFactory: () => ({
                secret:process.env.JWT_SECRET,
                signOptions: { expiresIn:'1d'},
            }),
        }),
    ],
    providers: [AuthService, PermissionCacheService,
        /*ทุก Controller ในระบบถูก Guard คลุมอัตโนมัติ โดยไม่ต้องเขียน 
         @UseGuards(...) ซ้ำทุกไฟล์ — Controller ไหนต้องการเปิดสาธารณะจริงๆ (เช่น POST /auth/login) 
         ค่อยแปะ @Public() เอา ตรงนี้คือจุดที่ทำให้ระบบ "ปลอดภัยเป็นค่าเริ่มต้น" (Secure by Default) แทนที่จะหวังพึ่งความจำ Dev ทุกคนทุกไฟล์*/
        {provide: APP_GUARD, useClass: JwtAuthGuard},
        {provide: APP_GUARD , useClass: PermissionsGuard},
        AuthRepository
    ],
    controllers: [AuthController],
    exports:[PermissionCacheService]
})
export class AuthModule{}