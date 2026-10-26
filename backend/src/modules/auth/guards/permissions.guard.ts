import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSIONS_KEY, ANY_AUTHENTICATED_KEY } from './permissions.decorator';
import { PermissionCacheService } from '../permission-cache.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionCache: PermissionCacheService,
    ) {}
    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[
            context.getHandler  (),
            context.getClass(),
        ])
        
        if (isPublic){
            return true;
        }
        const anyAuth = this.reflector.get<boolean>(ANY_AUTHENTICATED_KEY, context.getHandler());
        if (anyAuth) {
            return true;   // JwtAuthGuard ผ่านมาแล้ว แปลว่าล็อกอินแล้ว
        }

        const anyRequired = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (anyRequired && anyRequired.length > 0) {
            const { user } = context.switchToHttp().getRequest();
            if (!user?.role) throw new ForbiddenException('No role in token');
            const hasAny = anyRequired.some(p => this.permissionCache.hasPermission(user.role, p));
            if (!hasAny) {
                throw new ForbiddenException(`Missing permission (requires one of): ${anyRequired.join(', ')}`);
            }
            return true;
        }

        const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // ตรงนี้เอาไว้เช็คว่าลืมแปะ decorator หรือป่าว
        if (!required || required.length === 0) {
            throw new ForbiddenException('Access denied');
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user?.role) throw new ForbiddenException('No role in token');

        if (!this.permissionCache.hasAllPermissions(user.role, required)) {
            throw new ForbiddenException(`Missing permission: ${required.join(', ')}`);
        }
        return true;
    }
}