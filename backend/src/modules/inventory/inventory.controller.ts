import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
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
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
import { StockItemResponseDto } from './dto/stock-item.dto';
import { RestockDto } from './dto/restock.dto';
import { RecordWasteDto } from './dto/record-waste.dto';
import { RecordStockCountDto } from './dto/record-stock-count.dto';
import { RecordStockCountBatchDto } from './dto/record-stock-count-batch.dto';
import {
  GetInventoryTransactionsQueryDto,
  InventoryTransactionResponseDto,
} from './dto/inventory-transaction.dto';
import { RequirePermissions } from '../auth/guards/permissions.decorator';

type AuthenticatedRequest = Request & { user?: { sub?: string } };

@ApiBearerAuth()
@ApiTags('Inventory')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * GET /inventory/stock
   * ดึงระดับสต็อกคงเหลือปัจจุบัน — สิทธิ์ inventory:check
   */
  @ApiOperation({
    summary: 'ดึงระดับสต็อกคงเหลือปัจจุบัน',
    description:
      'ดึงข้อมูลสต็อกคงเหลือของวัตถุดิบทั้งหมดจาก view v_ingredient_stock (สิทธิ์ inventory:check)',
  })
  @ApiQuery({
    name: 'is_low',
    required: false,
    type: Boolean,
    description: 'กรองเฉพาะรายการที่สต็อกต่ำกว่าเกณฑ์ (is_low = true)',
  })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    type: Boolean,
    description: 'รวมวัตถุดิบที่ปิดการใช้งานด้วยหรือไม่',
  })
  @ApiOkResponse({
    description: 'ดึงระดับสต็อกสำเร็จ',
    type: [StockItemResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:check',
  })
  @RequirePermissions('inventory:check')
  @Get('stock')
  async getStock(
    @Query('is_low') isLow?: string,
    @Query('include_inactive') includeInactive?: string,
  ) {
    const filterLow =
      isLow !== undefined ? isLow === 'true' || isLow === '1' : undefined;
    const shouldInclude = includeInactive === 'true' || includeInactive === '1';
    return this.inventoryService.getStock(filterLow, shouldInclude);
  }

  /**
   * POST /inventory/restock
   * บันทึกรับของเข้าสต็อก — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'บันทึกรับของเข้าสต็อก (Restock)',
    description:
      'เพิ่มสต็อกวัตถุดิบลงในตาราง append-only inventory_transactions (สิทธิ์ inventory:adjust)',
  })
  @ApiCreatedResponse({
    description: 'บันทึกรับของสำเร็จ',
    type: InventoryTransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง เช่น quantity <= 0',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Post('restock')
  async restock(@Body() dto: RestockDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    return this.inventoryService.restock(dto, userId);
  }

  /**
   * POST /inventory/waste
   * บันทึกของเสีย — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'บันทึกของเสีย (Waste)',
    description:
      'บันทึกลดยอดสต็อกเนื่องจากของเสีย พร้อมระบุสาเหตุ: expired, spoiled, dropped, other (สิทธิ์ inventory:adjust)',
  })
  @ApiCreatedResponse({
    description: 'บันทึกของเสียสำเร็จ',
    type: InventoryTransactionResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'ข้อมูลไม่ถูกต้อง เช่น ไม่ระบุ waste_reason หรือ quantity <= 0',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Post('waste')
  async recordWaste(
    @Body() dto: RecordWasteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    return this.inventoryService.recordWaste(dto, userId);
  }

  /**
   * POST /inventory/count
   * บันทึกนับยอดคงเหลือจริงสิ้นวัน — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'บันทึกนับยอดคงเหลือจริงสิ้นวัน (Stock Count)',
    description:
      'พนักงานกรอกยอดคงเหลือจริงตอนจบวัน ระบบคิดส่วนต่าง delta ให้ และบันทึก audit log อัตโนมัติหากยอดเพี้ยนเกินเกณฑ์ (สิทธิ์ inventory:adjust)',
  })
  @ApiOkResponse({
    description: 'บันทึกการนับสต็อกสำเร็จ',
  })
  @ApiBadRequestResponse({
    description: 'ข้อมูลไม่ถูกต้อง เช่น counted_quantity < 0',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Post('count')
  async recordStockCount(
    @Body() dto: RecordStockCountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    return this.inventoryService.recordStockCount(dto, userId);
  }

  /**
   * POST /inventory/count/batch
   * นับยอดคงเหลือหลายรายการในคำขอเดียว (ใช้ตอนจบวัน) — สิทธิ์ inventory:adjust
   */
  @ApiOperation({
    summary: 'บันทึกนับยอดคงเหลือหลายรายการ (จบวัน)',
    description:
      'ส่งเฉพาะวัตถุดิบที่มีการนับ ระบบคำนวณส่วนต่างรายรายการให้ ' +
      'ทุกคำขอทำงานใน transaction เดียว หากรายการใดผิดพลาดทั้งชุดจะไม่ถูกบันทึก ' +
      'ใช้คู่กับหน้าปิดกะเพื่อปรับวัตถุดิบที่ใช้ไปก่อนปิดวัน (สิทธิ์ inventory:adjust)',
  })
  @ApiOkResponse({
    description: 'บันทึกการนับสำเร็จ พร้อมส่วนต่างรายรายการ',
  })
  @ApiBadRequestResponse({
    description:
      'ข้อมูลไม่ถูกต้อง เช่น ไม่มีรายการ, วัตถุดิบซ้ำ, counted_quantity < 0',
  })
  @ApiNotFoundResponse({
    description: 'ไม่พบวัตถุดิบ หรือวัตถุดิบถูกปิดการใช้งานแล้ว',
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:adjust',
  })
  @RequirePermissions('inventory:adjust')
  @Post('count/batch')
  async recordStockCountBatch(
    @Body() dto: RecordStockCountBatchDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.sub;
    return this.inventoryService.recordStockCountBatch(dto, userId);
  }

  /**
   * GET /inventory/transactions
   * ดึงประวัติการเคลื่อนไหวสต็อก — สิทธิ์ inventory:check
   */
  @ApiOperation({
    summary: 'ดึงประวัติการเคลื่อนไหวสต็อก (Transaction History)',
    description:
      'ดึงประวัติการรับของ, ปรับยอดจากการนับ, และของเสีย ทั้งหมด รองรับการกรองตามวัตถุดิบและประเภท (สิทธิ์ inventory:check)',
  })
  @ApiOkResponse({
    description: 'ดึงประวัติรายการสำเร็จ',
    type: [InventoryTransactionResponseDto],
  })
  @ApiForbiddenResponse({
    description: 'ไม่มีสิทธิ์ inventory:check',
  })
  @RequirePermissions('inventory:check')
  @Get('transactions')
  async getTransactions(@Query() query: GetInventoryTransactionsQueryDto) {
    return this.inventoryService.getTransactions(query);
  }
}
