import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DbContextService } from '../database/db-context.service';

/**
 * ยกกะที่ค้างรับรองนานเกิน `shift_escalation_hours` (default 4 ชม.) ไปหาเจ้าของร้าน
 * โดยเรียกฟังก์ชัน `escalate_overdue_shifts()` ของ DB
 *
 * ฟังก์ชันนั้นเป็น SECURITY DEFINER (เจ้าของ = postgres) จึงไล่ทุก tenant ได้เอง
 * และข้าม RLS ได้ตามที่ออกแบบไว้ — ต้องเรียกด้วย `referenceQuery()` เท่านั้น
 * เพราะ `query()` ต้องมี tenant context จาก request ซึ่ง cron ไม่มี
 * (เดิมเรียก `query()` → throw `ไม่มี tenant context` ทุก 5 นาที escalation จึงไม่เคยทำงาน)
 */
@Injectable()
export class ShiftEscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShiftEscalationService.name);
  private timer: NodeJS.Timeout | null = null;
  private firstRunTimer: NodeJS.Timeout | null = null;

  constructor(private readonly db: DbContextService) {}

  onModuleInit() {
    this.timer = setInterval(
      () => {
        void this.run();
      },
      5 * 60 * 1000,
    );
    // อย่าให้ timer ค้าง process ไว้ (สำคัญเวลาเทสต์/สคริปต์)
    this.timer.unref?.();

    // รันครั้งแรกหลังเริ่มเล็กน้อย
    this.firstRunTimer = setTimeout(() => {
      void this.run();
    }, 10 * 1000);
    this.firstRunTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.firstRunTimer) clearTimeout(this.firstRunTimer);
    this.timer = null;
    this.firstRunTimer = null;
  }

  /** คืนจำนวนกะที่ถูก escalate — ใช้ในเทสต์/ตรวจสอบด้วย */
  async run(): Promise<number> {
    try {
      const res = await this.db.referenceQuery<{ n: number }>(
        'SELECT escalate_overdue_shifts() AS n',
      );
      const escalated = Number(res.rows[0]?.n ?? 0);
      if (escalated > 0) {
        this.logger.log(`escalated ${escalated} shift(s)`);
      }
      return escalated;
    } catch (err) {
      // ต้องเป็น error ไม่ใช่ debug — เคยซ่อนบั๊ก "ไม่มี tenant context" ไว้นาน
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`shift escalation failed: ${reason}`);
      return 0;
    }
  }
}
