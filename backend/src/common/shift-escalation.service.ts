import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DbContextService } from '../database/db-context.service';

@Injectable()
export class ShiftEscalationService implements OnModuleInit {
  private readonly logger = new Logger(ShiftEscalationService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly db: DbContextService) {}

  onModuleInit() {
    // เรียกทุก 5 นาที
    this.timer = setInterval(() => {
      this.run().catch((err) => {
        this.logger.error('shift escalation failed', err?.message ?? err);
      });
    }, 5 * 60 * 1000);
    // รันครั้งแรกหลังเริ่มเล็กน้อย
    setTimeout(() => {
      this.run().catch((err) => {
        this.logger.error('shift escalation failed', err?.message ?? err);
      });
    }, 10 * 1000);
  }

  async run() {
    try {
      // timer ไม่มี request → ไม่มี tenant context; ฟังก์ชันเป็น SECURITY DEFINER ไล่ทุก tenant เอง
      const res = await this.db.query('SELECT escalate_overdue_shifts() AS n');
      const n = res.rows[0]?.n ?? 0;
      if (n > 0) {
        this.logger.log(`escalated ${n} shift(s)`);
      }
    } catch (err: any) {
      this.logger.error('shift escalation failed', err?.message ?? err);
    }
  }
}
