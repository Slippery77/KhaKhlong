import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { IngredientResponseDto } from './dto/ingredient-response.dto';
import { RequirePermissions } from '../auth/guards/permissions.decorator';

@ApiBearerAuth()
@ApiTags('Ingredients')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * POST /ingredients
   * สร้างวัตถุดิบใหม่ — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'สร้างวัตถุดิบใหม่',
    description:
      'เพิ่มรายการวัตถุดิบใหม่เข้าสู่ระบบ โดยชื่อวัตถุดิบต้องไม่ซ้ำกันในร้าน (สิทธิ์ inventory:adjust)',
  })
  @ApiCreatedResponse({
    description: 'สร้างวัตถุดิบใหม่สำเร็จ',
    type: IngredientResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง เช่น ไม่ระบุ name หรือ stock_unit',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @ApiConflictResponse({
    description: 'ชื่อวัตถุดิบซ้ำกับวัตถุดิบอื่นที่มีอยู่แล้วในร้าน',
  })
  @RequirePermissions('inventory:adjust')
  @Post()
  async create(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  /**
   * GET /ingredients
   * ดึงรายการวัตถุดิบทั้งหมด — สิทธิ์ inventory:check
   */
  @ApiOperation({
    summary: 'ดึงรายการวัตถุดิบทั้งหมด',
    description:
      'ดึงรายการวัตถุดิบทั้งหมดของร้าน เรียงตามชื่อ (สิทธิ์ inventory:check)',
  })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    type: Boolean,
    description: 'รวมรายการที่ถูกปิดการใช้งาน (Soft Deleted) ด้วยหรือไม่',
  })
  @ApiOkResponse({
    description: 'ดึงรายการวัตถุดิบสำเร็จ',
    type: [IngredientResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:check',
  })
  @RequirePermissions('inventory:check')
  @Get()
  async findAll(@Query('include_inactive') includeInactive?: string) {
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    return this.inventoryService.findAllIngredients(shouldInclude);
  }

  /**
   * GET /ingredients/:id
   * ดึงข้อมูลวัตถุดิบตาม ID — สิทธิ์ inventory:check
   */
  @ApiOperation({
    summary: 'ดึงข้อมูลวัตถุดิบตาม ID',
    description:
      'ดึงรายละเอียดของวัตถุดิบตาม ingredient_id ที่ระบุ (สิทธิ์ inventory:check)',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสวัตถุดิบ (UUID)',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'พบข้อมูลวัตถุดิบ',
    type: IngredientResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลวัตถุดิบ',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:check',
  })
  @RequirePermissions('inventory:check')
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.findIngredientById(id);
  }

  /**
   * PATCH /ingredients/:id
   * แก้ไขข้อมูลวัตถุดิบ — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'แก้ไขข้อมูลวัตถุดิบ',
    description:
      'อัปเดตข้อมูลของวัตถุดิบ เช่น ชื่อ หน่วย เกณฑ์เตือนสต็อกต่ำ (สิทธิ์ inventory:adjust)',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสวัตถุดิบ (UUID)',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'แก้ไขข้อมูลวัตถุดิบสำเร็จ',
    type: IngredientResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลวัตถุดิบที่ต้องการแก้ไข',
  })
  @ApiConflictResponse({
    description: 'ชื่อวัตถุดิบใหม่ซ้ำกับวัตถุดิบอื่นในร้าน',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  /**
   * DELETE /ingredients/:id
   * ลบวัตถุดิบแบบ Soft Delete — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'ลบวัตถุดิบ (Soft Delete)',
    description:
      'ปิดการใช้งานวัตถุดิบ (is_active = false) ไม่ลบข้อมูลถาวรเพื่อรักษาประวัติสต็อก (สิทธิ์ inventory:adjust)',
  })
  @ApiParam({
    name: 'id',
    description: 'รหัสวัตถุดิบ (UUID)',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'ลบวัตถุดิบสำเร็จ',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบข้อมูลวัตถุดิบที่ต้องการลบ',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.softDeleteIngredient(id);
  }
}
