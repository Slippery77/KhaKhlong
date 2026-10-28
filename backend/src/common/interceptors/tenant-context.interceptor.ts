import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable, firstValueFrom, from } from 'rxjs';
import { DbContextService } from '../../database/db-context.service';
import { UsersRepository } from '../../modules/users/users.repository';
import type { JwtPayload } from '../../modules/auth/guards/jwtAuth.guard';
//firstValueFrom ทำอะไร — next.handle() คืนค่าเป็น Observable (รูปแบบของ RxJS) แต่ runInTransaction ต้องการ Promise ตัวนี้คือตัวแปลง Observable เป็น Promise เพื่อให้ await ได้
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    constructor(
        private readonly db: DbContextService,
        private readonly usersRepository: UsersRepository,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user = request.user as JwtPayload | undefined;   // JwtAuthGuard ใส่ไว้ให้แล้ว

        // route สาธารณะ (login, register) ไม่มี user
        // ปล่อยผ่านไปเลย ให้ service จัดการ transaction เอง
        if (!user?.tenantID) {
            return next.handle();
        }

        return from(
            this.db.runInTransaction(
                {
                    tenantId: user.tenantID,
                    userId: user.sub ?? null,
                    role: user.role ?? null,
                    clientIp: request.ip ?? 'unknown',
                    deviceInfo: request.headers['user-agent'] ?? 'unknown',
                },
                // แปลง Observable ของ controller เป็น Promise
                // เพื่อให้ transaction ครอบตลอดจนงานเสร็จ ไม่ commit ก่อน
                // รอให้ controller ทำงานจนจบ แล้วค่อย COMMIT
                async () => {
                    // ตรวจ token_version ใน transaction นี้ (เพิ่งมี tenant context ให้ query users)
                    await this.assertSessionStillValid(user);
                    return firstValueFrom(next.handle());
                },
            ),
        );
    }

    /**
     * token ยังใช้ได้อยู่ไหม
     * - user ถูกปิดใช้งาน (is_active = false) → ใช้ไม่ได้ทันที ไม่ต้องรอ token หมดอายุ
     * - token_version ใน DB ถูกเลื่อน (เปลี่ยนรหัสผ่าน/ถูกเพิกถอน) → ใบเก่าใช้ไม่ได้
     */
    private async assertSessionStillValid(user: JwtPayload): Promise<void> {
        const row = await this.usersRepository.findByIdWithTokenVersion(user.sub);
        if (!row || !row.is_active) {
            throw new UnauthorizedException('Invalid token');
        }
        if (user.token_version !== row.token_version) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
