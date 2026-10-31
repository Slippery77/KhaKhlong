import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';

@Injectable()
export class UsersRepository {
    constructor(private readonly db: DbContextService) {}

    async findActiveById(userId:string){
        const sql = `
            SELECT u.users_id, u.username, u.tenant_id, u.is_active, u.token_version, r.role_name
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.users_id = $1
        `;
        const result = await this.db.query(sql,[userId]);
        return result.rows[0]??null
    }

    async createOwner(
        tenant_id: string,
        role_id: string,
        username: string,
        email: string,
        password: string,
        pin: string,
        display_name: string,
    ) {
        const sql = `INSERT INTO users (tenant_id, role_id, username, email, password_hash, pin_hash, display_name)
                    VALUES ($1,$2,$3,$4,$5,$6,$7)
                    RETURNING users_id, username, display_name;
        `;
        const result = await this.db.query(sql, [tenant_id, role_id, username, email, password,pin, display_name]);
        return result.rows[0];
    }

    async findEmail(email: string) {
        const sql = `
            SELECT users_id, tenant_id 
            FROM resolve_user_by_email($1);
        `;
        const result = await this.db.referenceQuery(sql, [email]);
        return result.rows[0] ?? null;
    }

    async findUsernameAndTenantID(tenantID: string, username: string) {
        const sql = `
            SELECT u.users_id, u.role_id, u.tenant_id, u.username, u.display_name, u.password_hash,
                   u.is_active, u.token_version, u.password_failed_attempts, u.password_locked_until
            FROM users u
            WHERE tenant_id = $1 AND lower(username) = lower($2)
        `;
        const result = await this.db.query(sql, [tenantID, username]);
        return result.rows[0] ?? null;
    }

    async createUser(tenantID: string, roleID: string, username: string, password: string, pin?: string | null, displayName?: string) {
        const sql = `
            INSERT INTO users(tenant_id, role_id, username, password_hash, pin_hash, display_name) 
            VALUES(app_tenant_id(),$1,$2,$3,$4,$5)
            RETURNING *;
        `;
        // tenant_id มาจาก app_tenant_id() ใน RLS context — ไม่ต้องส่งเป็น parameter
        const result = await this.db.query(sql, [roleID, username, password, pin ?? null, displayName ?? null]);
        return result.rows[0];
    }

    /**
     * ดึงรายชื่อผู้ใช้ทั้งหมดของร้าน
     * RLS กรอง tenant ให้อยู่แล้ว แต่ใส่เงื่อนไขซ้ำไว้กันเหนียว
     * เรียง: ที่ยังใช้งานอยู่ก่อน -> ตามตำแหน่ง -> ตามชื่อ
     */
    async findAllByTenant() {
        const sql = `
            SELECT
                u.users_id,
                u.username,
                u.display_name,
                r.role_name,
                u.is_active,
                u.created_at,
                u.last_login_at,
                u.deactivated_at,
                (u.pin_hash IS NOT NULL ) as has_pin
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.tenant_id = app_tenant_id()
            ORDER BY u.is_active DESC, r.role_name ASC, u.display_name ASC;
        `;
        const result = await this.db.query(sql);
        return result.rows;
    }

    /**
     * หาผู้ใช้คนเดียวของร้าน
     * คืน null = ไม่พบ หรือเป็นของร้านอื่น (RLS ตัดให้เงียบ ๆ — ไม่บอกว่ามีอยู่จริง)
     */
    async findById(id: string) {
        const sql = `
            SELECT
                u.users_id,
                u.username,
                u.display_name,
                u.role_id,
                u.tenant_id,
                r.role_name,
                u.is_active,
                u.created_at,
                u.last_login_at,
                u.deactivated_at
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.users_id = $1 AND u.tenant_id = app_tenant_id();
        `;
        const result = await this.db.query(sql, [id]);
        return result.rows[0] ?? null;
    }

    /**
     * แก้ไขข้อมูลผู้ใช้ — ส่งเฉพาะช่องที่เปลี่ยน (null = ไม่แตะ)
     * เปลี่ยนรหัสผ่าน = บังคับเพิ่ม token_version เพื่อให้ session เก่าที่ยังค้างอยู่ใช้ไม่ได้
     * และปลดล็อกรหัสผ่าน / PIN ให้ด้วยทันทีเมื่อตั้งค่าใหม่
     */
    async updateUser(id: string, data: {
        display_name?: string | null;
        username?: string | null;
        role_id?: string | null;
        password_hash?: string | null;
        pin_hash?:string|null;
    }) {
        const sql = `
            UPDATE users
            SET display_name  = COALESCE($2::varchar, display_name),
                username      = COALESCE($3::varchar, username),
                role_id       = COALESCE($4::uuid,    role_id),
                password_hash = COALESCE($5::varchar, password_hash),
                pin_hash = COALESCE($6::varchar, pin_hash),
                token_version = CASE WHEN $5::varchar IS NULL
                                     THEN token_version
                                     ELSE token_version + 1 END,
                password_failed_attempts = CASE WHEN $5::varchar IS NULL
                                                THEN password_failed_attempts
                                                ELSE 0 END,
                password_locked_until = CASE WHEN $5::varchar IS NULL
                                             THEN password_locked_until
                                             ELSE NULL END,
                pin_failed_attempts = CASE WHEN $6::varchar IS NULL
                                           THEN pin_failed_attempts
                                           ELSE 0 END,
                pin_locked_until = CASE WHEN $6::varchar IS NULL
                                        THEN pin_locked_until
                                        ELSE NULL END
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
            RETURNING users_id, username, display_name, is_active, created_at, last_login_at, deactivated_at,
                      (pin_hash IS NOT NULL) AS has_pin;
        `;
        const result = await this.db.query(sql, [
            id,
            data.display_name ?? null,
            data.username ?? null,
            data.role_id ?? null,
            data.password_hash ?? null,
            data.pin_hash ?? null,
        ]);
        return result.rows[0] ?? null;
    }

    /**
     * ปิดใช้งานบัญชี (soft delete — USR-01)
     * ลบจริงไม่ได้: pos_app ถูก REVOKE DELETE บนตาราง users อยู่แล้ว
     */
    async deactivateUser(id: string) {
        const sql = `
            UPDATE users
            SET is_active       = false,
                deactivated_at  = now(),
                deactivated_by  = app_user_id()
            WHERE users_id = $1 AND tenant_id = app_tenant_id() AND is_active = true
            RETURNING users_id, username, display_name, is_active, deactivated_at,
                      (pin_hash IS NOT NULL) AS has_pin;
        `;
        const result = await this.db.query(sql, [id]);
        return result.rows[0] ?? null;
    }

    /**
     * เปิดใช้งานบัญชีที่ถูกปิดไว้กลับมา
     */
    async reactivateUser(id: string) {
        const sql = `
            UPDATE users
            SET is_active      = true,
                deactivated_at = NULL,
                deactivated_by = NULL
            WHERE users_id = $1 AND tenant_id = app_tenant_id() AND is_active = false
            RETURNING users_id, username, display_name, is_active, deactivated_at,
                      (pin_hash IS NOT NULL) AS has_pin;
        `;
        const result = await this.db.query(sql, [id]);
        return result.rows[0] ?? null;
    }

    /**
     * ถอน refresh token ทิ้งทั้งหมดของผู้ใช้
     * เรียกตอนปิดใช้งาน/เปลี่ยนรหัสผ่าน เพื่อไม่ให้ session เก่ายังยืดอยู่
     */
    async revokeRefreshTokens(userId: string) {
        const sql = `
            UPDATE refresh_tokens
            SET revoked_at = now()
            WHERE user_id = $1 AND revoked_at IS NULL;
        `;
        await this.db.query(sql, [userId]);
    }

    async findByIdWithTokenVersion(userId: string) {
        const sql = `
            SELECT u.users_id, u.username, u.tenant_id, u.is_active, u.token_version, r.role_name
            FROM users u
            JOIN roles r ON r.role_id = u.role_id
            WHERE u.users_id = $1
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }

    async getPinLockState(userId: string) {
        const sql = `
            SELECT pin_failed_attempts, pin_locked_until
            FROM users
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }

    /**
     * นับ PIN ผิดแบบ "คงอยู่จริง" — เขียนนอก transaction ของ request
     * (ถ้าเขียนใน transaction แล้วโยน 403 ตัวนับจะถูก rollback หายทั้งหมด)
     * นับครบเพดานจะล็อกให้ใน statement เดียว กันสถานะค้างครึ่ง ๆ
     */
    async recordPinFailureDurable(userId: string, maxAttempts: number, lockMinutes: number) {
        const sql = `
            UPDATE users
            SET pin_failed_attempts = pin_failed_attempts + 1,
                pin_locked_until = CASE
                    WHEN pin_failed_attempts + 1 >= $2
                        THEN now() + make_interval(mins => $3)
                    ELSE pin_locked_until
                END
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
            RETURNING pin_failed_attempts, pin_locked_until
        `;
        const result = await this.db.durableQuery(sql, [userId, maxAttempts, lockMinutes]);
        return result.rows[0] ?? null;
    }

    async recordPinFailure(userId: string) {
        const sql = `
            UPDATE users
            SET pin_failed_attempts = pin_failed_attempts + 1
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
            RETURNING pin_failed_attempts, pin_locked_until
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }

    async lockPinUser(userId: string, lockUntil: Date) {
        const sql = `
            UPDATE users
            SET pin_locked_until = $2
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
            RETURNING pin_failed_attempts, pin_locked_until
        `;
        const result = await this.db.query(sql, [userId, lockUntil]);
        return result.rows[0] ?? null;
    }

    async resetPinFailures(userId: string) {
        const sql = `
            UPDATE users
            SET pin_failed_attempts = 0,
                pin_locked_until = NULL
            WHERE users_id = $1 AND tenant_id = app_tenant_id()
            RETURNING pin_failed_attempts, pin_locked_until
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }

    async clearPinFailuresForUser(userId: string) {
        const sql = `
            UPDATE users
            SET pin_failed_attempts = 0,
                pin_locked_until = NULL
            WHERE users_id = $1
            RETURNING pin_failed_attempts, pin_locked_until
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }

    /**
     * นับรหัสผ่านผิดแบบ "คงอยู่จริง" (เขียนนอก transaction ของ request หลัก)
     * หากเคยถูกล็อกแล้วเวลาล็อกหมดอายุไปแล้ว (password_locked_until <= now())
     * จะเริ่มนับรอบใหม่ที่ 1 เพื่อไม่ให้ผิดครั้งแรกหลังปลดล็อกแล้วถูกล็อกซ้ำทันที
     */
    async recordPasswordFailureDurable(userId: string, maxAttempts: number, lockMinutes: number) {
        const sql = `
            UPDATE users
            SET password_failed_attempts = CASE
                    WHEN password_locked_until IS NOT NULL AND password_locked_until <= now()
                        THEN 1
                    ELSE password_failed_attempts + 1
                END,
                password_locked_until = CASE
                    WHEN (CASE
                            WHEN password_locked_until IS NOT NULL AND password_locked_until <= now()
                                THEN 1
                            ELSE password_failed_attempts + 1
                          END) >= $2
                        THEN now() + make_interval(mins => $3)
                    ELSE NULL
                END
            WHERE users_id = $1
            RETURNING password_failed_attempts, password_locked_until
        `;
        const result = await this.db.durableQuery(sql, [userId, maxAttempts, lockMinutes]);
        return result.rows[0] ?? null;
    }

    /**
     * ล้างตัวนับรหัสผ่านผิดและอัปเดตเวลาเข้าสู่ระบบล่าสุดเมื่อ login สำเร็จ
     */
    async recordLoginSuccess(userId: string) {
        const sql = `
            UPDATE users
            SET password_failed_attempts = 0,
                password_locked_until = NULL,
                last_login_at = now()
            WHERE users_id = $1
            RETURNING users_id, last_login_at
        `;
        const result = await this.db.query(sql, [userId]);
        return result.rows[0] ?? null;
    }
}
