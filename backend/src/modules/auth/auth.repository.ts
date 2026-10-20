import { Injectable } from "@nestjs/common";
import { DbContextService } from "../../database/db-context.service";

@Injectable()
export class AuthRepository{
    constructor(private readonly db: DbContextService){}

    async writeLogoutAudit(){
        const sql = `
            SELECT audit_write(app_tenant_id(), 'logout', '{}'::jsonb)
        `;
        await this.db.query(sql)
    }
}