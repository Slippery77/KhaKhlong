import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService — Login Lockout & Audit Logs', () => {
  let service: AuthService;
  let userService: {
    findUsernameAndTenantID: jest.Mock;
    recordPasswordFailureDurable: jest.Mock;
    recordLoginSuccess: jest.Mock;
    findActiveById: jest.Mock;
  };
  let rolesService: { findRoleByID: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let tenantService: { findTenantSlug: jest.Mock };
  let db: { runInTransaction: jest.Mock };
  let authRepository: {
    writeLoginSuccessAudit: jest.Mock;
    writeLoginFailedAuditDurable: jest.Mock;
    insertRefreshToken: jest.Mock;
    writeLogoutAudit: jest.Mock;
    deleteRefreshToken: jest.Mock;
  };
  let config: { getOrThrow: jest.Mock };
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('CorrectPass123!', 4);
  });

  beforeEach(() => {
    userService = {
      findUsernameAndTenantID: jest.fn(),
      recordPasswordFailureDurable: jest.fn(),
      recordLoginSuccess: jest.fn().mockResolvedValue({ users_id: 'user-1' }),
      findActiveById: jest.fn(),
    };
    rolesService = {
      findRoleByID: jest.fn().mockResolvedValue({ role_id: 'role-1', role_name: 'owner' }),
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('jwt-access-token'),
    };
    tenantService = {
      findTenantSlug: jest.fn().mockResolvedValue({
        tenant_id: 'tenant-1',
        is_active: true,
      }),
    };
    db = {
      runInTransaction: jest.fn((_ctx, work) => work()),
    };
    authRepository = {
      writeLoginSuccessAudit: jest.fn().mockResolvedValue(undefined),
      writeLoginFailedAuditDurable: jest.fn().mockResolvedValue(undefined),
      insertRefreshToken: jest.fn().mockResolvedValue(null),
      writeLogoutAudit: jest.fn().mockResolvedValue(undefined),
      deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      getOrThrow: jest.fn().mockReturnValue(16),
    };

    service = new AuthService(
      userService as any,
      rolesService as any,
      jwtService as any,
      tenantService as any,
      db as any,
      authRepository as any,
      config as any,
    );
  });

  it('logs login_failed with user_not_found and throws 401 when username does not exist', async () => {
    userService.findUsernameAndTenantID.mockResolvedValue(null);

    await expect(
      service.signIn({ tenantSlug: 'krua-ban', username: 'ghost', password: 'any' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepository.writeLoginFailedAuditDurable).toHaveBeenCalledWith(null, {
      username: 'ghost',
      reason: 'user_not_found',
    });
    expect(userService.recordPasswordFailureDurable).not.toHaveBeenCalled();
  });

  it('logs login_failed with account_deactivated and throws 401 when user is inactive', async () => {
    userService.findUsernameAndTenantID.mockResolvedValue({
      users_id: 'user-1',
      username: 'staff1',
      is_active: false,
      password_hash: passwordHash,
    });

    await expect(
      service.signIn({ tenantSlug: 'krua-ban', username: 'staff1', password: 'CorrectPass123!' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(authRepository.writeLoginFailedAuditDurable).toHaveBeenCalledWith('user-1', {
      username: 'staff1',
      reason: 'account_deactivated',
    });
  });

  it('increments failure counter Durably, writes login_failed audit, and returns 401 with remainingAttempts on wrong password (attempts 1..4)', async () => {
    userService.findUsernameAndTenantID.mockResolvedValue({
      users_id: 'user-1',
      role_id: 'role-1',
      tenant_id: 'tenant-1',
      username: 'owner1',
      password_hash: passwordHash,
      is_active: true,
      password_failed_attempts: 1,
      password_locked_until: null,
    });
    userService.recordPasswordFailureDurable.mockResolvedValue({
      password_failed_attempts: 2,
      password_locked_until: null,
    });

    try {
      await service.signIn({ tenantSlug: 'krua-ban', username: 'owner1', password: 'WrongPassword!' });
      fail('Expected signIn to throw');
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      expect(err.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(err.getResponse()).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        remainingAttempts: 3,
      });
    }

    expect(userService.recordPasswordFailureDurable).toHaveBeenCalledWith('user-1', 5, 5);
    expect(authRepository.writeLoginFailedAuditDurable).toHaveBeenCalledWith('user-1', {
      username: 'owner1',
      reason: 'invalid_password',
      failed_attempts: 2,
    });
  });

  it('locks account for 5 minutes and throws 429 ACCOUNT_LOCKED on 5th consecutive wrong password', async () => {
    const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
    userService.findUsernameAndTenantID.mockResolvedValue({
      users_id: 'user-1',
      role_id: 'role-1',
      tenant_id: 'tenant-1',
      username: 'owner1',
      password_hash: passwordHash,
      is_active: true,
      password_failed_attempts: 4,
      password_locked_until: null,
    });
    userService.recordPasswordFailureDurable.mockResolvedValue({
      password_failed_attempts: 5,
      password_locked_until: lockUntil.toISOString(),
    });

    try {
      await service.signIn({ tenantSlug: 'krua-ban', username: 'owner1', password: 'WrongPassword!' });
      fail('Expected signIn to throw 429');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.getResponse()).toMatchObject({
        code: 'ACCOUNT_LOCKED',
        lockedUntil: lockUntil.toISOString(),
      });
    }

    expect(authRepository.writeLoginFailedAuditDurable).toHaveBeenCalledWith('user-1', {
      username: 'owner1',
      reason: 'invalid_password',
      failed_attempts: 5,
      locked_until: lockUntil.toISOString(),
    });
  });

  it('rejects immediately with 429 ACCOUNT_LOCKED and logs account_locked when password_locked_until is in the future', async () => {
    const lockUntil = new Date(Date.now() + 3 * 60 * 1000);
    userService.findUsernameAndTenantID.mockResolvedValue({
      users_id: 'user-1',
      role_id: 'role-1',
      tenant_id: 'tenant-1',
      username: 'owner1',
      password_hash: passwordHash,
      is_active: true,
      password_failed_attempts: 5,
      password_locked_until: lockUntil.toISOString(),
    });

    await expect(
      service.signIn({ tenantSlug: 'krua-ban', username: 'owner1', password: 'CorrectPass123!' }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    expect(userService.recordPasswordFailureDurable).not.toHaveBeenCalled();
    expect(authRepository.writeLoginFailedAuditDurable).toHaveBeenCalledWith('user-1', {
      username: 'owner1',
      reason: 'account_locked',
      locked_until: lockUntil.toISOString(),
    });
  });

  it('clears failure counters, updates last_login_at, and writes login_success audit when password is valid (including after expired lock)', async () => {
    const expiredLock = new Date(Date.now() - 60 * 1000);
    userService.findUsernameAndTenantID.mockResolvedValue({
      users_id: 'user-1',
      role_id: 'role-1',
      tenant_id: 'tenant-1',
      username: 'owner1',
      display_name: 'เจ้าของร้าน',
      password_hash: passwordHash,
      is_active: true,
      token_version: 2,
      password_failed_attempts: 5,
      password_locked_until: expiredLock.toISOString(),
    });

    const res = await service.signIn(
      { tenantSlug: 'krua-ban', username: 'owner1', password: 'CorrectPass123!' },
      '127.0.0.1',
      'JestAgent',
    );

    expect(res.accessToken).toBe('jwt-access-token');
    expect(userService.recordLoginSuccess).toHaveBeenCalledWith('user-1');
    expect(authRepository.writeLoginSuccessAudit).toHaveBeenCalledWith('user-1', {
      username: 'owner1',
    });
    expect(authRepository.writeLoginFailedAuditDurable).not.toHaveBeenCalled();
  });
});

