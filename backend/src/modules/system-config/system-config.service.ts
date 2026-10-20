import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SystemConfigRepository } from './system-config.repository';
import { UpdateConfigDto } from './dto/updateConfig.dto';
import { PermissionCacheService } from '../auth/permission-cache.service';
import { toConfigResponse } from './mapper/system-config.mapper';

@Injectable()
export class SystemConfigService {
    constructor(private readonly repo: SystemConfigRepository , 
      private readonly permissionCache:PermissionCacheService
    ) {}

    async getAll() {
      const result = await this.repo.findAllByTenant()
      return {
        status:'success',
        data:result.map(toConfigResponse)
      }
    }

  async update(user:{role:string}, key: string, dto:UpdateConfigDto) {
    const findkey = await this.repo.findDefinition(key)
    if(!findkey){
      throw new NotFoundException(`ไม่พบ config ${key}`);
    }
    
    const required = findkey.owner_only ? 'tax:configure': 'config:edit_operational';
    if (!this.permissionCache.hasPermission(user.role, required))
      throw new ForbiddenException(`Missing permission: ${required}`);

    if (!['string', 'number', 'boolean'].includes(typeof dto.value)){
      throw new BadRequestException('value ต้องเป็น string, number หรือ boolean');
    }
    try {
      const result = await this.repo.updateValue(key,String(dto.value));
      if(!result){
        throw new NotFoundException(`ร้านนี้ยังไม่มีค่า ${key} ใน system_config`);
      }
      return {status:'success', 
        data: toConfigResponse({
          ...findkey,
          value: result.config_value,
          updated_at: result.updated_at,
        }),
      };
    } catch (error:any) {
      if(error.code === 'P0001'){
        if (error.message.includes('owner-only')) throw new ForbiddenException(error.message);
        throw new BadRequestException(error.message)
      }
      throw error;
    }
  }
}
