import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';

@Injectable()
export class UsersRepository {
    constructor(private readonly db: DbContextService) {}

    async findActiveById(userId:string){
        const sql = `
            SELECT u.users_id, u.username, u.tenant_id, u.is_active, r.role_name
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
        display_name: string
    ) {
        const sql = `INSERT INTO users (tenant_id, role_id, username, email, password_hash, display_name)
                    VALUES ($1,$2,$3,$4,$5,$6)
                    RETURNING users_id, username, display_name;
        `;
        const result = await this.db.query(sql, [tenant_id, role_id, username, email, password, display_name]);
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
            SELECT u.users_id, u.role_id, u.tenant_id, u.username, u.password_hash, u.is_active
            FROM users u
            WHERE tenant_id = $1 AND lower(username) = lower($2);
        `;
        const result = await this.db.query(sql, [tenantID, username]);
        return result.rows[0] ?? null;
    }

    async createUser(tenantID: string, roleID: string, username: string, password: string, pin?: string | null, displayName?: string) {
        const sql = `
            INSERT INTO users(tenant_id, role_id, username, password_hash, pin_hash, display_name) 
            VALUES($1,$2,$3,$4,$5,$6)
            RETURNING *;
        `;
        const result = await this.db.query(sql, [tenantID, roleID, username, password, pin, displayName]);
        return result.rows[0];
    }
}
