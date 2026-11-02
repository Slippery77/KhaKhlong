import { Injectable } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';

interface RequestWithUser {
  user?: {
    tenantID?: string;
    sub?: string;
  };
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(
    req: Record<string, unknown>,
  ): Promise<string> {
    const user = (req as RequestWithUser).user;
    if (typeof user?.tenantID === 'string' && typeof user?.sub === 'string') {
      return `user:${user.tenantID}:${user.sub}`;
    }
    return super.getTracker(req as Record<string, any>);
  }

  protected override throwThrottlingException(): Promise<void> {
    return Promise.reject(
      new ThrottlerException('คำขอถี่เกินกำหนด กรุณารอสักครู่แล้วลองใหม่'),
    );
  }
}
