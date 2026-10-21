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

    async resolveRefreshToken(hash:string){
        const sql = `
            SELECT tenant_id, user_id
            FROM resolve_refresh_token($1);
        `;
        const result = await this.db.referenceQuery(sql,[hash]);
        return result.rows[0]??null;
    }

    async insertRefreshToken(userId:string,hash:string,deviceInfo:string,expireAt:Date){
        const sql =`
            INSERT INTO refresh_tokens(tenant_id,user_id,token_hash,device_info,expires_at)
            VALUES (app_tenant_id(),$1,$2,$3,$4)
        `;
        const result = await this.db.query(sql,[userId,hash,deviceInfo,expireAt])
        return result.rows[0]??null;
    }

    async lockRefreshToken(hash:string){
        const sql = `
            SELECT token_id, user_id , expires_at, revoked_at
            FROM refresh_tokens
            WHERE token_hash =$1
            FOR UPDATE
        `;
        const result = await this.db.query(sql,[hash]);
        return result.rows[0]??null;
    }

    async revokeByHash(hash:string){
        const sql = `
        UPDATE refresh_tokens
        SET revoked_at = now()
        WHERE token_hash = $1 AND revoked_at IS NULL
        `;
        return await this.db.query(sql,[hash])
    }

    async revokeAllForUser(user_id:string){
        const sql=`
            UPDATE refresh_tokens
            SET revoked_at = now()
            where user_id = $1 AND revoked_at IS NULL;
        `;
        return await this.db.query(sql,[user_id]);
    }

    async deleteRefreshToken(hash:string){
        const sql =`
            DELETE FROM refresh_tokens
            WHERE token_hash = $1;
        `;
        return await this.db.query(sql,[hash]);
    }
}