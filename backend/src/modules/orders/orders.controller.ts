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
    summary: 'ปิดบิลโดยไม่เก็บเงิน',
    description: 'ปิดบิลกรณี voided_all, empty หรือ walkout',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'รหัสบิล (UUID)' })
  @RequirePermissions('order:close_unpaid')
  @Post(':id/close-unpaid')
  async closeUnpaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseUnpaidDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.sub;
    return this.ordersService.closeUnpaid(id, dto, userId);
  }

  @ApiOperation({
    summary: 'ซิงค์ข้อมูลบิลแบบ Offline Batch',
    description: 'รับชุดข้อมูลบิลและรายการอาหารที่สร้างขณะออฟไลน์มาซิงค์ลงฐานข้อมูล',
  })
  @RequirePermissions('order:create')
  @Post('sync')
  async syncOrders(@Body() dto: any) {
    return this.ordersService.syncOrders(dto);
  }
}
