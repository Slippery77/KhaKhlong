import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

describe('UsersService & UsersController — GET /users/me', () => {
  let usersRepository: {
    findMeById: jest.Mock;
  };
  let rolesService: Record<string, jest.Mock>;
  let service: UsersService;
  let controller: UsersController;

  beforeEach(() => {
    usersRepository = {
      findMeById: jest.fn(),
    };
    rolesService = {};
    service = new UsersService(usersRepository as any, rolesService as any);
    controller = new UsersController(service);
  });

  it('returns current user profile, permissions array, and store info via getMe', async () => {
    usersRepository.findMeById.mockResolvedValue({
      users_id: 'u-123',
      username: 'somchai',
      display_name: 'สมชาย ใจดี',
      role_name: 'employee',
      is_active: true,
      created_at: '2026-10-31T10:00:00.000Z',
      last_login_at: '2026-10-31T12:00:00.000Z',
      deactivated_at: null,
      has_pin: true,
      tenant_id: 't-999',
      restaurant_name: 'ร้านข้าวมันไก่ค้าคล่อง',
      tenant_slug: 'kaomunkai',
      permissions: ['menu:view', 'order:create', 'order:view'],
    });

    const req = { user: { sub: 'u-123', tenantID: 't-999', role: 'employee' } };
    const result = await controller.getMe(req);

    expect(usersRepository.findMeById).toHaveBeenCalledWith('u-123');
    expect(result).toEqual({
      status: 'success',
      data: {
        user_id: 'u-123',
        username: 'somchai',
        display_name: 'สมชาย ใจดี',
        role_name: 'employee',
        is_active: true,
        created_at: '2026-10-31T10:00:00.000Z',
        last_login_at: '2026-10-31T12:00:00.000Z',
        deactivated_at: null,
        has_pin: true,
        permissions: ['menu:view', 'order:create', 'order:view'],
        store: {
          tenant_id: 't-999',
          restaurant_name: 'ร้านข้าวมันไก่ค้าคล่อง',
          tenant_slug: 'kaomunkai',
        },
      },
    });
  });

  it('defaults permissions to empty array and has_pin to false when null/falsy', async () => {
    usersRepository.findMeById.mockResolvedValue({
      users_id: 'u-456',
      username: 'newstaff',
      display_name: 'พนักงานใหม่',
      role_name: 'employee',
      is_active: true,
      created_at: '2026-10-31T10:00:00.000Z',
      last_login_at: null,
      deactivated_at: null,
      has_pin: false,
      tenant_id: 't-999',
      restaurant_name: 'ร้านข้าวมันไก่ค้าคล่อง',
      tenant_slug: 'kaomunkai',
      permissions: null,
    });

    const result = await service.getMe('u-456');

    expect(result.data.has_pin).toBe(false);
    expect(result.data.permissions).toEqual([]);
    expect(result.data.last_login_at).toBeNull();
  });

  it('throws NotFoundException when user does not exist in current tenant', async () => {
    usersRepository.findMeById.mockResolvedValue(null);

    await expect(service.getMe('missing-id')).rejects.toThrow(NotFoundException);
  });
});

