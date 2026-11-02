import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemConfigRepository } from './system-config.repository';
import { UpdateConfigDto } from './dto/updateConfig.dto';
import { PermissionCacheService } from '../auth/permission-cache.service';
import { toConfigResponse } from './mapper/system-config.mapper';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly repo: SystemConfigRepository,
    private readonly permissionCache: PermissionCacheService,
  ) {}

  async getAll() {
    const result = await this.repo.findAllByTenant();
    return {
      status: 'success',
      data: result.map(toConfigResponse),
    };
  }

  async update(user: { role: string }, key: string, dto: UpdateConfigDto) {
    const findkey = await this.repo.findDefinition(key);
    if (!findkey) {
      throw new NotFoundException(`ไม่พบ config ${key}`);
    }

    const required = findkey.owner_only ? 'tax:configure' : 'config:edit_operational';
    if (!this.permissionCache.hasPermission(user.role, required))
      throw new ForbiddenException(`Missing permission: ${required}`);

    if (!['string', 'number', 'boolean'].includes(typeof dto.value)) {
      throw new BadRequestException('value ต้องเป็น string, number หรือ boolean');
    }

    // Validation: จำกัดความยาว receipt_footer ไม่เกิน 500 ตัวอักษร
    if (key === 'receipt_footer' && typeof dto.value === 'string' && dto.value.length > 500) {
      throw new BadRequestException('ข้อความท้ายใบเสร็จต้องมีความยาวไม่เกิน 500 ตัวอักษร');
    }

    // Validation: ชนิดตัวเลขจำนวนเต็ม
    if (findkey.value_type === 'int') {
      const num = Number(dto.value);
      if (!Number.isInteger(num) || num < 0) {
        throw new BadRequestException(`${key} ต้องเป็นจำนวนเต็มที่ไม่ติดลบ`);
      }
    }

    try {
      const result = await this.repo.updateValue(key, String(dto.value));
      return {
        status: 'success',
        data: toConfigResponse({
          ...findkey,
          value: result.config_value,
          updated_at: result.updated_at,
        }),
      };
    } catch (error: any) {
      if (error.code === 'P0001') {
        if (error.message.includes('owner-only')) throw new ForbiddenException(error.message);
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
