import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDTO } from './dto/createUser.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { RolesService } from '../roles/roles.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly rolesService: RolesService
    ) {}

    async findUsernameAndTenantID(tenantID: string, username: string) {
        return this.usersRepository.findUsernameAndTenantID(tenantID, username);
    }

    async recordPasswordFailureDurable(userId: string, maxAttempts: number, lockMinutes: number) {
        return this.usersRepository.recordPasswordFailureDurable(userId, maxAttempts, lockMinutes);
    }

    async recordLoginSuccess(userId: string) {
        return this.usersRepository.recordLoginSuccess(userId);
    }

    async createOwner(
        tenant_id: string,
        role_id: string,
        username: string,
        email: string,
        password: string,
        pin:string,
        display_name: string
    ) {
        return this.usersRepository.createOwner(
            tenant_id,
            role_id,
            username,
            email,
            password,
            pin,
            display_name
        );
    }

    async findEmail(email: string) {
        return this.usersRepository.findEmail(email);
    }

    async findActiveById(userId:string){
         return await this.usersRepository.findActiveById(userId)
    }

    /**
     * ดึงรายชื่อผู้ใช้ทั้งหมดของร้าน
     */
    async listUsers() {
        const rows = await this.usersRepository.findAllByTenant();
        return {
            status: 'success',
            data: rows.map((r: any) => this.toUserResponse(r)),
        };
    }

    async createUser(tenantID: string, dto: CreateUserDTO) {
        try {
            const isUsernameExisted = await this.usersRepository.findUsernameAndTenantID(tenantID, dto.username);

            if (isUsernameExisted) {
                throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }

            const role = await this.rolesService.findRoleName(dto.role_name);
            if (!role) {
                throw new BadRequestException('ตำแหน่งไม่ถูกต้อง');
            }
            const roleID = role.role_id;

            const hash_password = await bcrypt.hash(dto.password, 10);
            const pin_hash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;
            const result = await this.usersRepository.createUser(tenantID, roleID, dto.username, hash_password, pin_hash, dto.display_name);

            // audit log เขียนให้อัตโนมัติโดย trigger trg_audit_users ใน DB (user_created)

            return {
                status: 'success',
                data: {
                    user_id: result.users_id,
                    username: result.username,
                    display_name: result.display_name,
                    role_name: dto.role_name,
                    is_active: result.is_active,
                    created_at: result.created_at,
                    last_login_at: result.last_login_at,
                    deactivated_at: result.deactivated_at,
                },
            };
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }
            throw err;
        }
    }

    /**
     * แก้ไขข้อมูลผู้ใช้ (ชื่อ-นามสกุล / ชื่อผู้ใช้ / ตำแหน่ง / ตั้งรหัสผ่านใหม่)
     */
    async updateUser(tenantID: string, userId: string, dto: UpdateUserDTO) {
        const target = await this.usersRepository.findById(userId);
        if (!target) {
            throw new NotFoundException('ไม่พบผู้ใช้ที่ต้องการแก้ไข');
        }

        // บัญชีเจ้าของร้านมีตอนสมัครร้านเท่านั้น — เปลี่ยนตำแหน่งหรือปิดใช้งานไม่ได้
        if (target.role_name === 'owner' && dto.role_name) {
            throw new ForbiddenException('ไม่สามารถเปลี่ยนตำแหน่งของเจ้าของร้านได้');
        }

        // ไม่มีอะไรให้แก้ = คำขอไม่มีความหมาย
        if (
            dto.display_name === undefined &&
            dto.username === undefined &&
            dto.role_name === undefined &&
            dto.password === undefined &&
            dto.pin === undefined
        ) {
            throw new BadRequestException('ไม่มีข้อมูลที่เปลี่ยน');
        }

        // เปลี่ยนชื่อผู้ใช้ → ต้องไม่ซ้ำกับคนอื่นในร้าน
        if (dto.username !== undefined && dto.username.toLowerCase() !== target.username.toLowerCase()) {
            const duplicated = await this.usersRepository.findUsernameAndTenantID(tenantID, dto.username);
            if (duplicated && duplicated.users_id !== userId) {
                throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }
        }

        let role_id: string | null = null;
        if (dto.role_name !== undefined) {
            const role = await this.rolesService.findRoleName(dto.role_name);
            if (!role) {
                throw new BadRequestException('ตำแหน่งไม่ถูกต้อง');
            }
            role_id = role.role_id;
        }

        const password_hash = dto.password
            ? await bcrypt.hash(dto.password, 10)
            : null;

        const pin_hash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;    
        try {
            const updated = await this.usersRepository.updateUser(userId, {
                display_name: dto.display_name ?? null,
                username: dto.username ?? null,
                role_id,
                password_hash,
                pin_hash
            });

            if (!updated) {
                throw new NotFoundException('ไม่พบผู้ใช้ที่ต้องการแก้ไข');
            }

            // เปลี่ยนรหัสผ่าน = ให้ session เก่าของเขาหมดอายุทันที
            // (audit log เขียนให้อัตโนมัติโดย trigger trg_audit_users ใน DB)
            if (dto.password !== undefined) {
                await this.usersRepository.revokeRefreshTokens(userId);
            }

            return {
                status: 'success',
                data: this.toUserResponse({ ...updated, role_name: dto.role_name ?? target.role_name }),
            };
        } catch (err: any) {
            if (err.code === '23505') {
                throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้ไปแล้ว');
            }
            throw err;
        }
    }

    /**
     * ปิดใช้งาน / เปิดใช้งานบัญชี (soft delete — ลบจริงไม่ได้)
     */
    async setUserActive(actorId: string, userId: string, isActive: boolean) {
        const target = await this.usersRepository.findById(userId);
        if (!target) {
            throw new NotFoundException('ไม่พบผู้ใช้');
        }

        // ปิดบัญชีตัวเอง = ล็อกตัวเองออกจากระบบถาวร
        if (!isActive && target.users_id === actorId) {
            throw new BadRequestException('ไม่สามารถปิดใช้งานบัญชีของตัวเองได้');
        }

        // บัญชีเจ้าของร้านปิดไม่ได้ ไม่งั้นจะไม่มีใครเข้ามาแก้ได้อีก
        if (!isActive && target.role_name === 'owner') {
            throw new ForbiddenException('ไม่สามารถปิดใช้งานบัญชีเจ้าของร้านได้');
        }

        const result = isActive
            ? await this.usersRepository.reactivateUser(userId)
            : await this.usersRepository.deactivateUser(userId);

        if (!result) {
            throw new BadRequestException(
                isActive ? 'บัญชีนี้ไม่ได้ถูกปิดใช้งานอยู่' : 'บัญชีนี้ถูกปิดใช้งานอยู่แล้ว',
            );
        }

        // ปิดใช้งาน = ตัด session ทิ้งทันที ไม่ให้คนที่ถูกปิดยัง refresh token ได้
        // (audit log เขียนให้อัตโนมัติโดย trigger trg_audit_users ใน DB)
        if (!isActive) {
            await this.usersRepository.revokeRefreshTokens(userId);
        }

        return {
            status: 'success',
            data: this.toUserResponse({ ...result, role_name: target.role_name }),
        };
    }

    /**
     * แปลงแถวจาก DB เป็นรูปแบบที่ส่งให้ frontend
     */
    private toUserResponse(row: any) {
        return {
            user_id: row.users_id,
            username: row.username,
            display_name: row.display_name,
            role_name: row.role_name,
            is_active: row.is_active,
            created_at: row.created_at,
            last_login_at: row.last_login_at ?? null,
            deactivated_at: row.deactivated_at ?? null,
            // ส่งแค่ว่าตั้ง PIN แล้วหรือยัง ห้ามส่ง pin_hash ออกไป
            has_pin: row.has_pin === true,
        };
    }
}
