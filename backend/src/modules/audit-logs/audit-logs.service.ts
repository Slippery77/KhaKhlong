import { Injectable } from '@nestjs/common';
import { AuditLogsRepository, AuditLogRow } from './audit-logs.repository';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface AuditLogsResponse {
  items: AuditLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly repository: AuditLogsRepository) {}

  async getAuditLogs(query: AuditQueryDto): Promise<AuditLogsResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const { items, total } = await this.repository.findAuditLogs(query);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

