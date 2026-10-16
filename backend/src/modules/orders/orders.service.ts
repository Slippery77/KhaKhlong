import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CloseUnpaidDto } from './dto/close-unpaid.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  /**
   * เปิดบิลใหม่
   */
  async createOrder(dto: CreateOrderDto, userId: string) {
    let result:any;
    try {
      result = await this.ordersRepository.createOrder(dto, userId);
    } catch (err: any) {
      // trigger trg_orders_before RAISE EXCEPTION → Postgres error code P0001
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('no open shift')) {
          throw new ConflictException('ยังไม่มีกะเปิดอยู่ กรุณาเปิดกะก่อน');
        }
        if (msg.includes('out_of_service')) {
          throw new ConflictException('โต๊ะนี้ถูกปิดใช้งานอยู่');
        }
      }
      // unique index uq_orders_one_active_per_table → 1 โต๊ะเปิดบิลได้ใบเดียว
      if (err.code === '23505') {
        throw new ConflictException('โต๊ะนี้มีบิลเปิดค้างอยู่แล้ว');
      }
      // FK violation เช่น table_id ไม่มีจริง
      if (err.code === '23503') {
        throw new BadRequestException('ไม่พบโต๊ะที่ระบุ');
      }
      throw err;
    }

    // ON CONFLICT (order_id) DO NOTHING → ส่ง order_id ซ้ำ (offline retry)
    if (!result) {
      throw new ConflictException('บิลนี้ถูกสร้างไปแล้ว (order_id ซ้ำ)');
    }

    return { status: 'success', data: result };
  }

  /**
   * ดึงรายละเอียดบิลตาม order_id
   */
  async getOrderById(orderId: string) {
    // TODO: ดึงข้อมูลและตรวจสอบ NotFoundException
    return this.ordersRepository.findOrderById(orderId);
  }

  /**
   * ดึงรายการบิลที่ยังเปิดอยู่
   */
  async getOpenOrders() {
    return this.ordersRepository.findOpenOrders();
  }

  /**
   * เพิ่มรายการอาหารเข้าบิล
   */
  async addItems(orderId: string, dto: AddOrderItemsDto) {
    // TODO: ตรวจสอบว่าบิลยังเปิดอยู่หรือไม่ (บิลปิดแล้วแก้ไม่ได้)
    // TODO: ตรวจสอบว่าเมนูพร้อมขาย (is_available = true)
    return this.ordersRepository.addOrderItems(orderId, dto.items);
  }

  /**
   * ย้ายโต๊ะ
   */
  async moveTable(orderId: string, dto: MoveTableDto) {
    // TODO: ตรวจสอบว่าโต๊ะใหม่ว่างหรือไม่
    return this.ordersRepository.moveTable(orderId, dto.newTableId);
  }

  /**
   * ปิดบิลโดยไม่เก็บเงิน
   */
  async closeUnpaid(orderId: string, dto: CloseUnpaidDto, userId: string) {
    // TODO: ตรวจสอบบิลและบันทึกการปิดบิลแบบไม่เก็บเงิน
    return this.ordersRepository.closeUnpaid(orderId, dto, userId);
  }

  /**
   * ซิงค์ข้อมูลบิลจากอุปกรณ์ Offline
   */
  async syncOrders(dto: any) {
    return this.ordersRepository.syncOrders(dto);
  }
}
