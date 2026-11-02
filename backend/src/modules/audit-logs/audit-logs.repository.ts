import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface AuditLogRow {
  log_id: string;
  tenant_id: string;
  user_id: string | null;
  username: string | null;
  user_display_name: string | null;
  action_type: string;
  ip_address: string;
  device_info: string;
  metadata: Record<string, any>;
  created_at: string;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly db: DbContextService) {}

  async findAuditLogs(query: AuditQueryDto): Promise<{ items: AuditLogRow[]; total: number }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['a.tenant_id = app_tenant_id()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.action_type) {
      conditions.push(`a.action_type = $${paramIndex++}`);
      params.push(query.action_type);
    }

    if (query.user_id) {
      conditions.push(`a.user_id = $${paramIndex++}`);
      params.push(query.user_id);
    }

    if (query.from) {
      conditions.push(`(a.created_at AT TIME ZONE 'Asia/Bangkok')::date >= $${paramIndex++}::date`);
      params.push(query.from.slice(0, 10));
    }

    if (query.to) {
      conditions.push(`(a.created_at AT TIME ZONE 'Asia/Bangkok')::date <= $${paramIndex++}::date`);
      params.push(query.to.slice(0, 10));
    }

    const whereClause = conditions.join(' AND ');

    // 1. นับจำนวนรวม
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM audit_logs a
      WHERE ${whereClause}
    `;
    const countRes = await this.db.query<{ total: number }>(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    // 2. ดึงรายการพร้อม user details
    const listSql = `
      SELECT
        a.log_id,
        a.tenant_id,
        a.user_id,
        u.username,
        u.display_name AS user_display_name,
        a.action_type,
        a.ip_address,
        a.device_info,
        a.metadata,
        a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON u.tenant_id = a.tenant_id AND u.users_id = a.user_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const listParams = [...params, limit, offset];
    const listRes = await this.db.query<AuditLogRow>(listSql, listParams);

    return {
      items: listRes.rows,
      total,
    };
  }
}

