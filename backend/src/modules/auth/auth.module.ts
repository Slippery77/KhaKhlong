import { Module, Global } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtModule } from '@nestjs/jwt';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtAuthGuard } from './guards/jwtAuth.guard';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthRepository } from './auth.repository';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    UsersModule,
    RolesModule,
    TenantsModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1d') },
      }),
    }),
  ],
  providers: [
    AuthService,
    PermissionCacheService,
    JwtAuthGuard,
    PermissionsGuard,
    AuthRepository,
  ],
  controllers: [AuthController],
  exports: [
    PermissionCacheService,
    JwtModule,
    JwtAuthGuard,
    PermissionsGuard,
    AuthService,
    AuthRepository,
  ],
})
export class AuthModule {}
