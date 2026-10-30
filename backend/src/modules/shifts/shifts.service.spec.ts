import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ShiftsService } from './shifts.service';

describe('ShiftsService — verifyShift ด้วย PIN', () => {
  const pendingShift = { status: 'pending_verification' };
  const verifiedRow = {
    shift_id: 'shift-1',
    business_date: '2026-10-22',
    status: 'verified',
    opening_cash: '1000',
    expected_closing_cash: '1500',
    actual_closing_cash: '1400',
    variance: '-100',
    opened_by: 'employee-1',
    opened_at: new Date('2026-10-22T01:00:00.000Z'),
    closed_by: 'employee-1',
    closed_at: new Date('2026-10-22T10:00:00.000Z'),
    verified_by: 'manager-1',
    verified_at: new Date('2026-10-22T10:05:00.000Z'),
    reopen_count: 0,
  };

  let repository: {
    getShiftStatusForUpdate: jest.Mock;
    findPinVerifiers: jest.Mock;
    verifyShift: jest.Mock;
  };
  let usersRepository: {
    getPinLockState: jest.Mock;
    recordPinFailureDurable: jest.Mock;
    clearPinFailuresForUser: jest.Mock;
  };
  let service: ShiftsService;

  beforeEach(() => {
    repository = {
      getShiftStatusForUpdate: jest.fn().mockResolvedValue(pendingShift),
      findPinVerifiers: jest.fn(),
      verifyShift: jest.fn().mockResolvedValue(verifiedRow),
    };
    usersRepository = {
      getPinLockState: jest.fn().mockResolvedValue({ pin_failed_attempts: 0, pin_locked_until: null }),
      recordPinFailureDurable: jest.fn().mockResolvedValue({ pin_failed_attempts: 1, pin_locked_until: null }),
      clearPinFailuresForUser: jest.fn().mockResolvedValue({ pin_failed_attempts: 0, pin_locked_until: null }),
    };
    service = new ShiftsService(repository as never, {} as never, {} as never, usersRepository as never);
  });

  it('ตั้ง verified_by เป็นเจ้าของ PIN ไม่ใช่คนที่ login อยู่', async () => {
    repository.findPinVerifiers.mockResolvedValue([
      { users_id: 'manager-1', pin_hash: await bcrypt.hash('123456', 4) },
    ]);

    const result = await service.verifyShift('shift-1', '123456', 'employee-1');

    expect(repository.verifyShift).toHaveBeenCalledWith('shift-1', 'manager-1');
    expect(usersRepository.clearPinFailuresForUser).toHaveBeenCalledWith('employee-1');
    expect(result).toMatchObject({
      status: 'success',
      data: { status: 'verified', verifiedBy: 'manager-1', variance: -100 },
    });
  });

  it('รับ PIN ของผู้จัดการคนใดก็ได้ในร้าน', async () => {
    repository.findPinVerifiers.mockResolvedValue([
      { users_id: 'manager-1', pin_hash: await bcrypt.hash('111111', 4) },
      { users_id: 'owner-1', pin_hash: await bcrypt.hash('654321', 4) },
    ]);

    await service.verifyShift('shift-1', '654321', 'employee-1');

    expect(repository.verifyShift).toHaveBeenCalledWith('shift-1', 'owner-1');
  });

  it('ปฏิเสธ PIN ที่ไม่ตรงกับใคร และนับครั้งผิดที่บัญชีผู้ขอ', async () => {
    repository.findPinVerifiers.mockResolvedValue([
      { users_id: 'manager-1', pin_hash: await bcrypt.hash('123456', 4) },
    ]);

    await expect(service.verifyShift('shift-1', '000000', 'employee-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.verifyShift).not.toHaveBeenCalled();
    expect(usersRepository.recordPinFailureDurable).toHaveBeenCalledWith('employee-1', 5, 5);
  });

  it('ปฏิเสธ PIN ที่ไม่ใช่ตัวเลข 6 หลัก โดยไม่นับครั้งผิด', async () => {
    await expect(service.verifyShift('shift-1', '12ab', 'employee-1')).rejects.toMatchObject({
      status: 400,
    });
    expect(usersRepository.recordPinFailureDurable).not.toHaveBeenCalled();
  });

  it('ล็อก 5 นาทีเมื่อกรอก PIN ผิดติดกันครบ 5 ครั้ง', async () => {
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    repository.findPinVerifiers.mockResolvedValue([
      { users_id: 'manager-1', pin_hash: await bcrypt.hash('123456', 4) },
    ]);
    usersRepository.recordPinFailureDurable
      .mockResolvedValueOnce({ pin_failed_attempts: 1, pin_locked_until: null })
      .mockResolvedValueOnce({ pin_failed_attempts: 2, pin_locked_until: null })
      .mockResolvedValueOnce({ pin_failed_attempts: 3, pin_locked_until: null })
      .mockResolvedValueOnce({ pin_failed_attempts: 4, pin_locked_until: null })
      .mockResolvedValueOnce({ pin_failed_attempts: 5, pin_locked_until: lockedUntil });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(service.verifyShift('shift-1', '000000', 'employee-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    }
    // ครั้งที่ 5 ทำให้ครบโควตา → ตอบ 429 ทันที
    await expect(service.verifyShift('shift-1', '000000', 'employee-1')).rejects.toMatchObject({
      status: 429,
    });
    expect(usersRepository.recordPinFailureDurable).toHaveBeenCalledTimes(5);

    // ครั้งถัดไปถูกบล็อกด้วย 429 ก่อนถึงขั้นตรวจ PIN
    usersRepository.getPinLockState.mockResolvedValue({
      pin_failed_attempts: 5,
      pin_locked_until: lockedUntil,
    });
    repository.verifyShift.mockClear();
    await expect(service.verifyShift('shift-1', '123456', 'employee-1')).rejects.toMatchObject({
      status: 429,
    });
    expect(repository.verifyShift).not.toHaveBeenCalled();
    expect(repository.findPinVerifiers).toHaveBeenCalledTimes(5);
  });

  it('ไม่นับครั้งผิดเมื่อ PIN ถูกต้องแต่ transition ล้มเหลว', async () => {
    repository.findPinVerifiers.mockResolvedValue([
      { users_id: 'manager-1', pin_hash: await bcrypt.hash('123456', 4) },
    ]);
    repository.verifyShift.mockRejectedValueOnce(new ForbiddenException('ไม่มีสิทธิ์รับรองยอด'));

    await expect(service.verifyShift('shift-1', '123456', 'employee-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(usersRepository.recordPinFailureDurable).not.toHaveBeenCalled();
  });

  it('ไม่รับรองกะที่ไม่ได้อยู่ในสถานะรอตรวจ', async () => {
    repository.getShiftStatusForUpdate.mockResolvedValue({ status: 'open' });

    await expect(service.verifyShift('shift-1', '123456', 'employee-1')).rejects.toMatchObject({
      status: 409,
    });
    expect(repository.findPinVerifiers).not.toHaveBeenCalled();
  });
});
