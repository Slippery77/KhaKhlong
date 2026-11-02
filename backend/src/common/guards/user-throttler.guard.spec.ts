import { Reflector } from '@nestjs/core';
import { ThrottlerException, ThrottlerStorage } from '@nestjs/throttler';
import { UserThrottlerGuard } from './user-throttler.guard';

class TestUserThrottlerGuard extends UserThrottlerGuard {
  public testGetTracker(req: Record<string, unknown>): Promise<string> {
    return this.getTracker(req);
  }

  public testThrowThrottlingException(): Promise<void> {
    return this.throwThrottlingException();
  }
}

describe('UserThrottlerGuard', () => {
  let guard: TestUserThrottlerGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    const mockOptions = [{ ttl: 60000, limit: 300 }];
    const mockStorage: ThrottlerStorage = {
      increment: jest.fn().mockResolvedValue({
        totalHits: 1,
        timeToExpire: 60,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    };
    guard = new TestUserThrottlerGuard(mockOptions, mockStorage, reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return user tracker key when user is authenticated with tenantID and sub', async () => {
      const req = {
        user: {
          tenantID: 'tenant-123',
          sub: 'user-456',
        },
        ip: '192.168.1.100',
      };

      const tracker = await guard.testGetTracker(req);
      expect(tracker).toBe('user:tenant-123:user-456');
    });

    it('should fallback to ip tracker when req.user is undefined', async () => {
      const req = {
        ip: '192.168.1.100',
      };

      const tracker = await guard.testGetTracker(req);
      expect(tracker).toBe('192.168.1.100');
    });

    it('should fallback to ip tracker when req.user lacks sub or tenantID', async () => {
      const req = {
        user: { tenantID: 'tenant-123' },
        ip: '192.168.1.100',
      };

      const tracker = await guard.testGetTracker(req);
      expect(tracker).toBe('192.168.1.100');
    });
  });

  describe('throwThrottlingException', () => {
    it('should throw ThrottlerException with custom Thai message', async () => {
      await expect(guard.testThrowThrottlingException()).rejects.toThrow(
        ThrottlerException,
      );

      await expect(guard.testThrowThrottlingException()).rejects.toThrow(
        'คำขอถี่เกินกำหนด กรุณารอสักครู่แล้วลองใหม่',
      );
    });
  });
});
