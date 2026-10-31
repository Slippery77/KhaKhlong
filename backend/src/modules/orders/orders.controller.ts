import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CloseUnpaidDto } from './dto/close-unpaid.dto';
import { VoidOrderItemDto } from './dto/void-order-item.dto';
import { CompOrderItemDto } from './dto/comp-order-item.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { RequirePermissions } from '../auth/guards/permissions.decorator';

@ApiBearerAuth()
@ApiTags('Orders')
@ApiResponse({ status: 401, description: 'ไม่มี token หรือ token หมดอายุ' })
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({
    summary: 'เปิดบิลใหม่',
    description: 'เปิดบิลใหม่ประจำโต๊ะ โดยรับ order_id จาก client เพื่อรองรับ Offline-first',
  })
  @RequirePermissions('order:create')
  @Post()
  async createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const userId = (req as any).user?.sub;
    return this.ordersService.createOrder(dto, userId);
  }

  @ApiOperation({
    summary: 'ดึงรายการบิลที่ยังเปิดอยู่',
    description: 'ดึงรายการบิลทั้งหมดที่ยังไม่ได้ปิดการขาย',
  })
  @RequirePermissions('order:create')
  @Get()
  async getOrders(@Query('status') status?: string) {
    if (status === 'open') {
      return this.ordersService.getOpenOrders();
    }
    return this.ordersService.getOpenOrders();
  }

  @ApiOperation({
    summary: 'ดึงรายละเอียดบิลตาม ID',
    description: 'ดึงรายละเอียดบิลพร้อมรายการอาหารและตัวเลือก',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @RequirePermissions('order:create')
  @Get(':id')
  async getOrderById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getOrderById(id);
  }

  @ApiOperation({
    summary: 'เพิ่มรายการอาหารลงในบิล',
    description: 'เพิ่มรายการอาหารพร้อมตัวเลือกย่อย โดยรับ order_item_id จาก client',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @RequirePermissions('order:create')
  @Post(':id/items')
  async addOrderItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddOrderItemsDto,
  ) {
    return this.ordersService.addItems(id, dto);
  }

  @ApiOperation({
    summary: 'ย้ายโต๊ะ',
    description: 'ย้ายบิลไปยังโต๊ะใหม่ที่ยังว่างอยู่',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @RequirePermissions('order:create')
  @Patch(':id/move-table')
  async moveTable(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveTableDto,
  ) {
    return this.ordersService.moveTable(id, dto);
  }

  @ApiOperation({
    summary: 'ปิดบิลโดยไม่เก็บเงิน — ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน',
    description:
      'ปิดบิลกรณี voided_all, empty หรือ walkout · พนักงานกดได้ แต่ต้องมี PIN ของผู้ใช้ที่มีสิทธิ์ ' +
      'order:close_unpaid · ระบบบันทึก closed_by = ผู้อนุมัติ (คนกดอยู่ใน audit log)',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @ApiResponse({
    status: 403,
    description: 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติ',
  })
  @ApiResponse({
    status: 409,
    description: 'บิลปิดแล้ว / มีรายการค้าง / มีรายการชำระเงินค้าง',
  })
  @RequirePermissions('order:create')
  @Post(':id/close-unpaid')
  async closeUnpaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseUnpaidDto,
    @Req() req: Request,
  ) {
    const requesterId = (req as any).user?.sub;
    return this.ordersService.closeUnpaid(id, dto, requesterId);
  }

  @ApiOperation({
    summary:
      'ยกเลิกทั้งบิล (ลูกค้าเปลี่ยนใจ) — ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน',
    description:
      'void ทุกรายการที่ยังไม่เสิร์ฟ แล้วปิดบิลเป็น voided_all (หรือ empty เมื่อไม่มีรายการ) ' +
      'ใน transaction เดียว — โต๊ะจะกลับเป็นว่างผ่าน trigger sync_table_status()',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @ApiResponse({
    status: 403,
    description: 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติ',
  })
  @ApiResponse({
    status: 409,
    description:
      'ORDER_HAS_SERVED_ITEMS / PAYMENT_ATTEMPT_OPEN / ORDER_CHANGED / ORDER_CLOSED / APPROVER_LACKS_VOID',
  })
  @RequirePermissions('order:create')
  @Post(':id/cancel')
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @Req() req: Request,
  ) {
    const requesterId = (req as any).user?.sub;
    return this.ordersService.cancelOrder(id, dto, requesterId);
  }

  @ApiOperation({
    summary: 'ซิงค์ข้อมูลบิลแบบ Offline Batch',
    description: 'รับชุดข้อมูลบิลและรายการอาหารที่สร้างขณะออฟไลน์มาซิงค์ลงฐานข้อมูล',
  })
  @RequirePermissions('order:create')
  @Post('sync')
  async syncOrders(@Body() dto: any, @Req() req: Request) {
    return this.ordersService.syncOrders(dto, (req as any).user?.sub);
  }

  @ApiOperation({
    summary: 'ยกเลิกรายการอาหาร (Void) — ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน',
    description:
      'ยกเลิกรายการที่สถานะ queued หรือ preparing ทุกครั้งต้องส่ง PIN ของผู้ใช้ที่มีสิทธิ์ void:approve ' +
      'ระบบจะบันทึก voided_by = ผู้อนุมัติ และยกเลิกทุกรายการที่ส่งมาพร้อมกัน (ต้องอยู่บิลเดียวกัน)',
  })
  @ApiResponse({ status: 403, description: 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติ' })
  @ApiResponse({ status: 409, description: 'สถานะรายการไม่สามารถยกเลิกได้ / บิลปิดหรือจ่ายแล้ว' })
  @RequirePermissions('order:create')
  @Post('items/void')
  async voidOrderItems(@Body() dto: VoidOrderItemDto, @Req() req: Request) {
    const requesterId = (req as any).user?.sub;
    return this.ordersService.voidOrderItems(dto, requesterId);
  }

  @ApiOperation({
    summary: 'Comp รายการอาหาร — ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน',
    description:
      'Comp รายการที่เสิร์ฟแล้ว (สถานะ served) ต้องส่ง PIN ของผู้ใช้ที่มีสิทธิ์ discount:approve ' +
      'ระบบจะบันทึก comped_by = ผู้อนุมัติ',
  })
  @ApiResponse({ status: 403, description: 'PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์อนุมัติ' })
  @ApiResponse({ status: 409, description: 'สถานะรายการไม่สามารถ Comp ได้ / บิลปิดหรือจ่ายแล้ว' })
  @RequirePermissions('order:create')
  @Post('items/comp')
  async compOrderItems(@Body() dto: CompOrderItemDto, @Req() req: Request) {
    const requesterId = (req as any).user?.sub;
    return this.ordersService.compOrderItems(dto, requesterId);
  }
}
