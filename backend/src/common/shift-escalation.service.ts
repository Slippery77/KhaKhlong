import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DbContextService } from '../database/db-context.service';

/**
 * 1. ยกกะที่ค้างรับรองนานเกิน `shift_escalation_hours` (default 4 ชม.) ไปหาเจ้าของร้าน
 *    โดยเรียกฟังก์ชัน `escalate_overdue_shifts()` ของ DB ทุก 5 นาที
 * 2. ลบ Audit Logs ที่เก่าเกิน 1 ปี โดยเรียกฟังก์ชัน `purge_old_audit_logs()` ของ DB วันละครั้ง
 *
 * ฟังก์ชันทั้งสองเป็น SECURITY DEFINER (เจ้าของ = postgres) จึงไล่ทุก tenant ได้เอง
 * และข้าม RLS ได้ตามที่ออกแบบไว้ — ต้องเรียกด้วย `referenceQuery()` เท่านั้น
 * เพราะ `query()` ต้องมี tenant context จาก request ซึ่ง background runner ไม่มี
 */
@Injectable()
export class ShiftEscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ShiftEscalationService.name);
  private timer: NodeJS.Timeout | null = null;
  private firstRunTimer: NodeJS.Timeout | null = null;
  private purgeTimer: NodeJS.Timeout | null = null;
  private firstPurgeTimer: NodeJS.Timeout | null = null;

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

    // Audit logs purge: รันวันละ 1 ครั้ง (และรันรอบแรกหลังเปิดระบบ 1 นาที)
    this.purgeTimer = setInterval(
      () => {
        void this.runPurgeAuditLogs();
      },
      24 * 60 * 60 * 1000,
    );
    this.purgeTimer.unref?.();

    this.firstPurgeTimer = setTimeout(() => {
      void this.runPurgeAuditLogs();
    }, 60 * 1000);
    this.firstPurgeTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.firstRunTimer) clearTimeout(this.firstRunTimer);
    if (this.purgeTimer) clearInterval(this.purgeTimer);
    if (this.firstPurgeTimer) clearTimeout(this.firstPurgeTimer);
    this.timer = null;
    this.firstRunTimer = null;
    this.purgeTimer = null;
    this.firstPurgeTimer = null;
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

  /** คืนจำนวนแถว audit logs ที่ถูก purge — ใช้ในเทสต์/ตรวจสอบด้วย */
  async runPurgeAuditLogs(): Promise<number> {
    try {
      const res = await this.db.referenceQuery<{ n: number | string }>(
        'SELECT purge_old_audit_logs() AS n',
      );
      const purged = Number(res.rows[0]?.n ?? 0);
      if (purged > 0) {
        this.logger.log(`purged ${purged} old audit log(s)`);
      }
      return purged;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.error(`purge old audit logs failed: ${reason}`);
      return 0;
    }
  }
}
