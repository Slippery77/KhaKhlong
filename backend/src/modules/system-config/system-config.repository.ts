import { Injectable } from "@nestjs/common";
import { DbContextService } from "../../database/db-context.service";

@Injectable()
export class SystemConfigRepository{
    constructor(private readonly db:DbContextService){}
    async findAllByTenant() {
        const sql =`
            SELECT cd.config_key, COALESCE(sc.config_value, cd.default_value) AS value,
                cd.value_type, cd.min_value, cd.max_value, cd.allowed_values,
                cd.owner_only, cd.description, sc.updated_at
            FROM config_definitions cd
            LEFT JOIN system_config sc
                ON sc.config_key = cd.config_key AND sc.tenant_id = app_tenant_id()
            ORDER BY cd.config_key;
        `;
        const result = await this.db.query(sql);
        return result.rows;
    }

    async findDefinition(key: string) {
        const sql = `
            SELECT * 
            FROM config_definitions
            WHERE config_key = $1`;
        const result = await this.db.query(sql,[key]);
        return result.rows[0]??null;
    }

    async updateValue(key: string, value: string) {
        const sql = `
            UPDATE system_config 
            SET config_value = $2 , updated_at = now()
            WHERE tenant_id = app_tenant_id() and config_key = $1
            RETURNING config_key, config_value, updated_at;
        `;
        const result = await this.db.query(sql,[key,value])
        return result.rows[0];
    }
}