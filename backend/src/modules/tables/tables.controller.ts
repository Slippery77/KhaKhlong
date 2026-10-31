import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { DiningTableDto, DiningTableResponseDto } from './dto/table-response.dto';
import { AnyAuthenticated, RequirePermissions } from '../auth/guards/permissions.decorator';

@ApiBearerAuth()
@ApiTags('Dining Tables')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * POST /tables
   * Permission ที่ต้องใช้: table:manage
   */
  @ApiOperation({
    summary: 'สร้างโต๊ะใหม่',
    description: 'สร้างโต๊ะใหม่ในผังร้าน โดยต้องมีสิทธิ์ table:manage และเลขโต๊ะต้องไม่ซ้ำกันในร้าน',
  })
  @ApiCreatedResponse({
    description: 'สร้างโต๊ะใหม่สำเร็จ',
    type: DiningTableResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง เช่น ไม่ได้ระบุ tableNumber หรือ capacity น้อยกว่า 1',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ table:manage ในการสร้างโต๊ะ',
  })
  @ApiConflictResponse({
    description: 'เลขหรือชื่อโต๊ะซ้ำกับโต๊ะที่มีอยู่แล้วในร้าน',
  })
  @RequirePermissions('table:manage')
  @Post()
  async create(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.create(createTableDto);
  }

  /**
   * GET /tables
   * ผังโต๊ะ + สถานะ (ทุก role สามารถเข้าถึงได้)
   */
  @ApiOperation({
    summary: 'ดึงรายการผังโต๊ะทั้งหมด',
    description: 'ดึงข้อมูลผังโต๊ะทั้งหมดของร้าน เรียงลำดับตามชั้นและเลขโต๊ะ (ทุก role ที่เข้าสู่ระบบสามารถเข้าถึงได้)',
  })
  @ApiOkResponse({
    description: 'ดึงรายการผังโต๊ะสำเร็จ',
    type: [DiningTableDto],
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์เข้าถึง',
  })
  @AnyAuthenticated()
  @Get()
  async findAll() {
    return this.tablesService.findAll();
  }

  /**
   * GET /tables/:id
   * ดึงข้อมูลโต๊ะตาม ID (ทุก role สามารถเข้าถึงได้)
   */
  @ApiOperation({
    summary: 'ดึงข้อมูลโต๊ะตาม ID',
    description: 'ดึงรายละเอียดของโต๊ะตาม table_id ที่ระบุ (ทุก role ที่เข้าสู่ระบบสามารถเข้าถึงได้)',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสโต๊ะ (UUID)',
    format: 'uuid',
    example: 'a1000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({
    description: 'พบข้อมูลโต๊ะ',
    type: DiningTableDto,
  })
  @ApiBadRequestResponse({
    description: 'รูปแบบ UUID ของ id ไม่ถูกต้อง',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลโต๊ะ',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์เข้าถึง',
  })
  @AnyAuthenticated()
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tablesService.findOne(id);
  }

  /**
   * PATCH /tables/:id
   * แก้ไขเลขโต๊ะ ความจุ ชั้น
   * Permission ที่ต้องใช้: table:manage
   */
  @ApiOperation({
    summary: 'แก้ไขข้อมูลโต๊ะ',
    description: 'แก้ไขเลขโต๊ะ ความจุ หรือชั้นของโต๊ะตาม table_id โดยต้องมีสิทธิ์ table:manage',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสโต๊ะ (UUID)',
    format: 'uuid',
    example: 'a1000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({
    description: 'แก้ไขข้อมูลโต๊ะสำเร็จ',
    type: DiningTableResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง หรือรูปแบบ UUID ไม่ถูกต้อง',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ table:manage ในการแก้ไขโต๊ะ',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลโต๊ะที่ต้องแก้ไข',
  })
  @ApiConflictResponse({
    description: 'เลขหรือชื่อโต๊ะใหม่ซ้ำกับโต๊ะอื่นในร้าน',
  })
  @RequirePermissions('table:manage')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    return this.tablesService.update(id, updateTableDto);
  }

  /**
   * PATCH /tables/:id/disable
   * ปิดการใช้งานโต๊ะ
   * Permission ที่ต้องใช้: table:manage
   */
  @ApiOperation({
    summary: 'ปิดการใช้งานโต๊ะ (Out of Service)',
    description: 'เปลี่ยนสถานะโต๊ะเป็น out_of_service โดยต้องมีสิทธิ์ table:manage และโต๊ะต้องไม่มีออเดอร์ค้างอยู่',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสโต๊ะ (UUID)',
    format: 'uuid',
    example: 'a1000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({
    description: 'ปิดการใช้งานโต๊ะสำเร็จ (สถานะเปลี่ยนเป็น out_of_service)',
    type: DiningTableResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'รูปแบบ UUID ไม่ถูกต้อง',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ table:manage ในการปิดการใช้งานโต๊ะ',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลโต๊ะ',
  })
  @ApiConflictResponse({
    description: 'ไม่สามารถปิดการใช้งานโต๊ะที่ยังมีออเดอร์ค้างอยู่ได้',
  })
  @RequirePermissions('table:manage')
  @Patch(':id/disable')
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    return this.tablesService.setStatus(id, false);
  }

  /**
   * PATCH /tables/:id/enable
   * เปิดการใช้งานโต๊ะ
   * Permission ที่ต้องใช้: table:manage
   */
  @ApiOperation({
    summary: 'เปิดการใช้งานโต๊ะ (Available)',
    description: 'เปลี่ยนสถานะโต๊ะเป็น available พร้อมให้บริการ โดยต้องมีสิทธิ์ table:manage',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสโต๊ะ (UUID)',
    format: 'uuid',
    example: 'a1000000-0000-0000-0000-000000000001',
  })
  @ApiOkResponse({
    description: 'เปิดการใช้งานโต๊ะสำเร็จ (สถานะเปลี่ยนเป็น available)',
    type: DiningTableResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'รูปแบบ UUID ไม่ถูกต้อง',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ table:manage ในการเปิดการใช้งานโต๊ะ',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลโต๊ะ',
  })
  @RequirePermissions('table:manage')
  @Patch(':id/enable')
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    return this.tablesService.setStatus(id, true);
  }

  /**
   * POST /tables/:id/sync-status
   * คำนวณสถานะโต๊ะใหม่จากบิลที่ยังเปิดอยู่ (ซ่อมสถานะเพี้ยน)
   * Permission ที่ต้องใช้: table:manage
   */
  @ApiOperation({
    summary: 'ซิงค์สถานะโต๊ะจากบิลที่ยังเปิดอยู่',
    description:
      'เรียก sync_table_status() ของ DB — ถ้ามีบิลเปิดอยู่สถานะจะเป็น occupied ถ้าไม่มีจะเป็น available ' +
      'ใช้ซ่อมกรณีสถานะเพี้ยนโดยไม่ต้องแก้สถานะมือ (โต๊ะ out_of_service จะไม่ถูกแตะ)',
  })
  @ApiParam({ name: 'id', description: 'รหัสโต๊ะ (UUID)', format: 'uuid' })
  @ApiOkResponse({ description: 'ซิงค์สถานะสำเร็จ' })
  @ApiForbiddenResponse({ description: 'ไม่มีสิทธิ์ table:manage' })
  @ApiNotFoundResponse({ description: 'ไม่พบข้อมูลโต๊ะ' })
  @RequirePermissions('table:manage')
  @Post(':id/sync-status')
  async syncStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.tablesService.syncStatus(id);
  }
}
