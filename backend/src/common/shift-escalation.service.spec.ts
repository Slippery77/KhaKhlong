import { ShiftEscalationService } from './shift-escalation.service';

describe('ShiftEscalationService', () => {
  let db: { referenceQuery: jest.Mock; query: jest.Mock };
  let service: ShiftEscalationService;

  beforeEach(() => {
    db = {
      referenceQuery: jest.fn(),
      query: jest.fn(),
    };
    service = new ShiftEscalationService(db as never);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('run (escalate_overdue_shifts)', () => {
    it('เรียก escalate_overdue_shifts() ด้วย referenceQuery (ไม่ต้องมี tenant context)', async () => {
      db.referenceQuery.mockResolvedValue({ rows: [{ n: 2 }] });

      await expect(service.run()).resolves.toBe(2);

      expect(db.referenceQuery).toHaveBeenCalledWith(
        'SELECT escalate_overdue_shifts() AS n',
      );
      // query() ต้องมี tenant context จาก request — cron ไม่มี จึงห้ามใช้
      expect(db.query).not.toHaveBeenCalled();
    });

    it('คืน 0 และไม่ throw เมื่อ DB ล้มเหลว', async () => {
      db.referenceQuery.mockRejectedValue(new Error('connection refused'));

      await expect(service.run()).resolves.toBe(0);
    });

    it('ทนค่า n ที่เป็น string จาก pg ได้', async () => {
      db.referenceQuery.mockResolvedValue({ rows: [{ n: '3' }] });

      await expect(service.run()).resolves.toBe(3);
    });

    it('คืน 0 เมื่อไม่มีแถวตอบกลับ', async () => {
      db.referenceQuery.mockResolvedValue({ rows: [] });

      await expect(service.run()).resolves.toBe(0);
    });
  });

  describe('runPurgeAuditLogs (purge_old_audit_logs)', () => {
    it('เรียก purge_old_audit_logs() ด้วย referenceQuery', async () => {
      db.referenceQuery.mockResolvedValue({ rows: [{ n: 15 }] });

      await expect(service.runPurgeAuditLogs()).resolves.toBe(15);

      expect(db.referenceQuery).toHaveBeenCalledWith(
        'SELECT purge_old_audit_logs() AS n',
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it('คืน 0 และไม่ throw เมื่อ purge ล้มเหลว', async () => {
      db.referenceQuery.mockRejectedValue(new Error('table locked'));

      await expect(service.runPurgeAuditLogs()).resolves.toBe(0);
    });

    it('ทนค่า n ที่เป็น string จาก pg ได้', async () => {
      db.referenceQuery.mockResolvedValue({ rows: [{ n: '42' }] });

      await expect(service.runPurgeAuditLogs()).resolves.toBe(42);
    });
  });
});
