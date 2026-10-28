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
        display_name: string,
        pin:string
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
            SELECT u.users_id, u.role_id, u.tenant_id, u.username, u.display_name, u.password_hash, u.is_active, u.token_version
            FROM users u
            WHERE tenant_id = $1 AND lower(username) = lower($2);
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
     * เธ”เธถเธเธฃเธฒเธขเธเธทเนเธญเธเธนเนเนเธเนเธ—เธฑเนเธเธซเธกเธ”เธเธญเธเธฃเนเธฒเธ
     * RLS เธเธฃเธญเธ tenant เนเธซเนเธญเธขเธนเนเนเธฅเนเธง เนเธ•เนเนเธชเนเน€เธเธทเนเธญเธเนเธเธเนเธณเนเธงเนเธเธฑเธเน€เธซเธเธตเธขเธง
     * เน€เธฃเธตเธขเธ: เธ—เธตเนเธขเธฑเธเนเธเนเธเธฒเธเธญเธขเธนเนเธเนเธญเธ โ’ เธ•เธฒเธกเธ•เธณเนเธซเธเนเธ โ’ เธ•เธฒเธกเธเธทเนเธญ
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
     * เธซเธฒเธเธนเนเนเธเนเธเธเน€เธ”เธตเธขเธงเธเธญเธเธฃเนเธฒเธ
     * เธเธทเธ null = เนเธกเนเธเธ เธซเธฃเธทเธญเน€เธเนเธเธเธญเธเธฃเนเธฒเธเธญเธทเนเธ (RLS เธ•เธฑเธ”เนเธซเนเน€เธเธตเธขเธ เน โ€” เนเธกเนเธเธญเธเธงเนเธฒเธกเธตเธญเธขเธนเนเธเธฃเธดเธ)
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
     * เนเธเนเนเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเน โ€” เธชเนเธเน€เธเธเธฒเธฐเธเนเธญเธเธ—เธตเนเน€เธเธฅเธตเนเธขเธ (null = เนเธกเนเนเธ•เธฐ)
     * เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธ = เธเธฑเธเธเธฑเธเน€เธเธดเนเธก token_version เน€เธเธทเนเธญเนเธซเน session เน€เธเนเธฒเธ—เธตเนเธขเธฑเธเธเนเธฒเธเธญเธขเธนเนเนเธเนเนเธกเนเนเธ”เน
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
                                     ELSE token_version + 1 END
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
     * เธเธดเธ”เนเธเนเธเธฒเธเธเธฑเธเธเธต (soft delete โ€” USR-01)
     * เธฅเธเธเธฃเธดเธเนเธกเนเนเธ”เน: pos_app เธ–เธนเธ REVOKE DELETE เธเธเธ•เธฒเธฃเธฒเธ users เธญเธขเธนเนเนเธฅเนเธง
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
     * เน€เธเธดเธ”เนเธเนเธเธฒเธเธเธฑเธเธเธตเธ—เธตเนเธ–เธนเธเธเธดเธ”เนเธงเนเธเธฅเธฑเธเธกเธฒ
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
     * เธ–เธญเธ refresh token เธ—เธดเนเธเธ—เธฑเนเธเธซเธกเธ”เธเธญเธเธเธนเนเนเธเน
     * เน€เธฃเธตเธขเธเธ•เธญเธเธเธดเธ”เนเธเนเธเธฒเธ/เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธ เน€เธเธทเนเธญเนเธกเนเนเธซเน session เน€เธเนเธฒเธขเธฑเธเธขเธทเธ”เธญเธขเธนเน
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
}

