import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  AnyAuthenticated,
  RequirePermissions,
} from '../auth/guards/permissions.decorator';
import { CreateUserDTO } from './dto/createUser.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { UserMeResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('Users')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * ดึงโปรไฟล์ของผู้ใช้ปัจจุบันที่ล็อกอินอยู่ พร้อมรายการสิทธิ์และข้อมูลร้าน
   */
  @ApiOperation({
    summary: 'ดึงข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน',
    description:
      'ดึงข้อมูลบัญชีของผู้ใช้ที่ล็อกอินอยู่ พร้อมรายการสิทธิ์ทั้งหมด (permissions) และข้อมูลสรุปของร้าน',
  })
  @ApiOkResponse({
    description: 'ดึงข้อมูลผู้ใช้ปัจจุบันสำเร็จ',
    type: UserMeResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลผู้ใช้',
  })
  @AnyAuthenticated()
  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.getMe(req.user.sub);
  }

  /**
   * GET /users
   * Permission ที่ต้องใช้: user:manage (เจ้าของร้านเท่านั้น)
   */
  @ApiOperation({
    summary: 'ดึงรายชื่อผู้ใช้ทั้งหมดของร้าน',
    description:
      'ดึงรายชื่อผู้ใช้ทุกคนในร้าน พร้อมตำแหน่งและสถานะการใช้งาน โดยต้องมีสิทธิ์ user:manage',
  })
  @ApiOkResponse({
    description: 'ดึงรายชื่อผู้ใช้สำเร็จ',
    type: [UserResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ user:manage ในการดูรายชื่อผู้ใช้',
  })
  @RequirePermissions('user:manage')
  @Get()
  async list() {
    return this.usersService.listUsers();
  }

  /**
   * POST /users
   * Permission ที่ต้องใช้: user:manage
   */
  @ApiOperation({
    summary: 'สร้างบัญชีผู้ใช้ใหม่',
    description:
      'เจ้าของร้านสร้างบัญชีพนักงานหรือผู้จัดการ โดยระบุชื่อ-นามสกุล ชื่อผู้ใช้ ตำแหน่ง และรหัสผ่าน ชื่อผู้ใช้ต้องไม่ซ้ำกันภายในร้าน',
  })
  @ApiCreatedResponse({
    description: 'สร้างบัญชีผู้ใช้สำเร็จ',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง เช่น รหัสผ่านสั้นเกินไป หรือตำแหน่งไม่ถูกต้อง',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ user:manage ในการสร้างบัญชีผู้ใช้',
  })
  @ApiConflictResponse({
    description: 'ชื่อผู้ใช้ซ้ำกับที่มีอยู่แล้วในร้าน',
  })
  @RequirePermissions('user:manage')
  @Post()
  async create(@Req() req, @Body() dto: CreateUserDTO) {
    const tenantID = req.user.tenantID;
    return this.usersService.createUser(tenantID, dto);
  }

  /**
   * PATCH /users/:id
   * แก้ไขข้อมูลผู้ใช้ (ชื่อ-นามสกุล / ชื่อผู้ใช้ / ตำแหน่ง / ตั้งรหัสผ่านใหม่)
   */
  @ApiOperation({
    summary: 'แก้ไขข้อมูลผู้ใช้',
    description:
      'แก้ไขข้อมูลบัญชีผู้ใช้ ส่งเฉพาะช่องที่ต้องการเปลี่ยน ถ้าใส่รหัสผ่านใหม่ ระบบจะถอน session เก่าของผู้ใช้นั้นทิ้งทันที',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสผู้ใช้ (UUID)',
    format: 'uuid',
    example: 'b1c2d3e4-0000-4000-8000-000000000001',
  })
  @ApiOkResponse({
    description: 'แก้ไขข้อมูลผู้ใช้สำเร็จ',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ไม่มีข้อมูลที่เปลี่ยน หรือรูปแบบ UUID ไม่ถูกต้อง',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ user:manage หรือพยายามเปลี่ยนตำแหน่งของเจ้าของร้าน',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบผู้ใช้ที่ต้องการแก้ไข',
  })
  @ApiConflictResponse({
    description: 'ชื่อผู้ใช้ใหม่ซ้ำกับที่มีอยู่แล้วในร้าน',
  })
  @RequirePermissions('user:manage')
  @Patch(':id')
  async update(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDTO,
  ) {
    const tenantID = req.user.tenantID;
    return this.usersService.updateUser(tenantID, id, dto);
  }

  /**
   * PATCH /users/:id/deactivate
   * ปิดใช้งานบัญชี (soft delete — ข้อมูลยังอยู่ใน DB เพื่อให้ตรวจสอบย้อนหลังได้)
   */
  @ApiOperation({
    summary: 'ปิดใช้งานบัญชีผู้ใช้',
    description:
      'ปิดใช้งานบัญชีผู้ใช้ (soft delete) ผู้ใช้ที่ถูกปิดจะเข้าสู่ระบบไม่ได้และ session เก่าจะถูกถอนทันที ลบจริงไม่ได้',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสผู้ใช้ (UUID)',
    format: 'uuid',
    example: 'b1c2d3e4-0000-4000-8000-000000000001',
  })
  @ApiOkResponse({
    description: 'ปิดใช้งานบัญชีผู้ใช้สำเร็จ',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'พยายามปิดบัญชีตัวเอง หรือบัญชีนี้ถูกปิดอยู่แล้ว',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ user:manage หรือพยายามปิดบัญชีเจ้าของร้าน',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบผู้ใช้',
  })
  @RequirePermissions('user:manage')
  @Patch(':id/deactivate')
  async deactivate(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setUserActive(req.user.sub, id, false);
  }

  /**
   * PATCH /users/:id/reactivate
   * เปิดใช้งานบัญชีที่ถูกปิดไว้กลับมา
   */
  @ApiOperation({
    summary: 'เปิดใช้งานบัญชีผู้ใช้',
    description: 'เปิดใช้งานบัญชีผู้ใช้ที่ถูกปิดใช้งานไว้กลับมา',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสผู้ใช้ (UUID)',
    format: 'uuid',
    example: 'b1c2d3e4-0000-4000-8000-000000000001',
  })
  @ApiOkResponse({
    description: 'เปิดใช้งานบัญชีผู้ใช้สำเร็จ',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'บัญชีนี้ไม่ได้ถูกปิดใช้งานอยู่',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ user:manage',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบผู้ใช้',
  })
  @RequirePermissions('user:manage')
  @Patch(':id/reactivate')
  async reactivate(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setUserActive(req.user.sub, id, true);
  }
}
