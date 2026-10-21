import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CloseUnpaidDto } from './dto/close-unpaid.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async createOrder(dto: CreateOrderDto, userId: string) {
    let result: any;
    try {
      result = await this.ordersRepository.createOrder(dto, userId);
    } catch (err: any) {
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('no open shift')) {
          throw new ConflictException('ยังไม่มีกะเปิดอยู่ กรุณาเปิดกะก่อน');
        }
        if (msg.includes('out_of_service')) {
          throw new ConflictException('โต๊ะนี้ถูกปิดใช้งานอยู่');
        }
      }
      if (err.code === '23505') {
        throw new ConflictException('โต๊ะนี้มีบิลเปิดค้างอยู่แล้ว');
      }
      if (err.code === '23503') {
        throw new BadRequestException('ไม่พบโต๊ะที่ระบุ');
      }
      throw err;
    }

    // ON CONFLICT DO NOTHING → order_id ซ้ำ (offline retry) ตอบ 200 พร้อมข้อมูลเดิม
    if (!result) {
      const existing = await this.ordersRepository.findOrderById(dto.orderId);
      return { status: 'success', data: existing };
    }

    return { status: 'success', data: result };
  }

  async getOrderById(orderId: string) {
    const order = await this.ordersRepository.findOrderById(orderId);
    if (!order) throw new NotFoundException('ไม่พบบิลที่ระบุ');
    return { status: 'success', data: order };
  }

  async getOpenOrders() {
    const rows = await this.ordersRepository.findOpenOrders();
    return { status: 'success', data: rows };
  }

  async addItems(orderId: string, dto: AddOrderItemsDto) {
    try {
      const items = await this.ordersRepository.addOrderItems(orderId, dto.items, dto.kitchenTicketId);
      return { status: 'success', data: items };
    } catch (err: any) {
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('order is closed')) {
          throw new ConflictException('บิลนี้ปิดแล้ว ไม่สามารถเพิ่มรายการได้');
        }
        if (msg.includes('is not available today')) {
          throw new ConflictException('เมนูนี้หมดวันนี้แล้ว');
        }
        if (msg.includes('is discontinued')) {
          throw new ConflictException('เมนูนี้เลิกขายแล้ว');
        }
      }
      throw err;
    }
  }

  async moveTable(orderId: string, dto: MoveTableDto) {
    try {
      const order = await this.ordersRepository.moveTable(orderId, dto.newTableId);
      if (!order) throw new NotFoundException('ไม่พบบิล หรือบิลปิดแล้ว');
      return { status: 'success', data: order };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('target table must be available')) {
          throw new ConflictException('โต๊ะปลายทางไม่ว่าง');
        }
        if (msg.includes('closed order is immutable')) {
          throw new ConflictException('บิลนี้ปิดแล้ว ไม่สามารถย้ายโต๊ะได้');
        }
      }
      throw err;
    }
  }

  async closeUnpaid(orderId: string, dto: CloseUnpaidDto, userId: string) {
    try {
      const order = await this.ordersRepository.closeUnpaid(orderId, dto, userId);
      if (!order) throw new NotFoundException('ไม่พบบิล หรือบิลปิดแล้ว');
      return { status: 'success', data: order };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('cannot close as')) {
          throw new ConflictException('ยังมีรายการที่ยังไม่ถูกยกเลิก ไม่สามารถปิดบิลด้วยเหตุผลนี้ได้');
        }
        if (msg.includes('closed order is immutable')) {
          throw new ConflictException('บิลนี้ปิดแล้ว');
        }
      }
      throw err;
    }
  }

  async syncOrders(dto: any) {
    const orders = Array.isArray(dto) ? dto : dto.orders ?? [];
    try {
      const results = await this.ordersRepository.syncOrders(orders);
      return { status: 'success', data: results };
    } catch (err: any) {
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('no open shift')) {
          throw new ConflictException('ยังไม่มีกะเปิดอยู่ กรุณาเปิดกะก่อน');
        }
      }
      throw err;
    }
  }

  async findOpenOrdersForClose() {
    const result = await this.ordersRepository.hasPendingOrders();
    return result.map((r) => {
      const active = Number(r.active_items);
      const pending = Number(r.pending_items);
      return {
        orderId: r.order_id,
        orderNumber: r.order_number,
        tableNumber: r.table_number,
        activeItemCount: active,
        suggestedAction: active === 0 ? 'close_unpaid' : pending > 0 ? 'in_progress' : 'pay',
      };
    });
  }
}
