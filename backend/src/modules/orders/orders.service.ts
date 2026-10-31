import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OrdersRepository } from './orders.repository';
import { UsersRepository } from '../users/users.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemsDto } from './dto/add-order-items.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CloseUnpaidDto } from './dto/close-unpaid.dto';
import { VoidOrderItemDto } from './dto/void-order-item.dto';
import { CompOrderItemDto } from './dto/comp-order-item.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';

@Injectable()
export class OrdersService {
  // กันเดา PIN: ผิด 5 ครั้งในบัญชีที่กดขออนุมัติ → ล็อก 5 นาที (เก็บใน DB ของผู้ใช้)
  private static readonly PIN_MAX_ATTEMPTS = 5;
  private static readonly PIN_LOCK_MINUTES = 5;

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

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
      if (err.code === '23505') {
        // uq_orders_one_active_per_table — มีบิลเปิดของโต๊ะปลายทางอยู่แล้ว
        throw new ConflictException({
          code: 'TABLE_OCCUPIED',
          message: 'โต๊ะปลายทางมีบิลเปิดอยู่แล้ว',
        });
      }
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

  async closeUnpaid(orderId: string, dto: CloseUnpaidDto, requesterId: string) {
    const approver = await this.verifyApproverPin(
      dto.approverPin,
      'order:close_unpaid',
      requesterId,
    );

    const order = await this.ordersRepository.lockOrderForUpdate(orderId);
    if (!order || order.closed_at) {
      throw new NotFoundException('ไม่พบบิล หรือบิลปิดแล้ว');
    }

    const attempt = await this.ordersRepository.findOpenPaymentAttempt(orderId);
    if (attempt) {
      throw new ConflictException({
        code: 'PAYMENT_ATTEMPT_OPEN',
        message:
          'บิลนี้มีรายการชำระเงินค้างอยู่ กรุณายกเลิกรายการชำระก่อนปิดบิล',
      });
    }

    const counts = await this.ordersRepository.countNonVoidedItems(orderId);
    if (
      dto.closeReason === 'walkout' &&
      counts.total > 0 &&
      !dto.note?.trim()
    ) {
      throw new BadRequestException('การปิดบิลแบบลูกค้าหนีต้องระบุหมายเหตุ');
    }

    try {
      // closed_by = ผู้อนุมัติ (คนกดอยู่ใน audit_logs.user_id จาก app_user_id())
      const closed = await this.ordersRepository.closeUnpaid(
        orderId,
        dto,
        approver.users_id,
      );
      if (!closed)
        throw new ConflictException('ปิดบิลไม่สำเร็จ กรุณารีเฟรชหน้าจอ');
      return {
        status: 'success',
        data: {
          order: closed,
          approvedBy: {
            usersId: approver.users_id,
            displayName: approver.display_name,
          },
        },
      };
    } catch (err: any) {
      throw this.mapCloseError(err);
    }
  }

  /**
   * ยกเลิกทั้งบิล: void ทุกรายการที่ยังไม่เสิร์ฟ แล้วปิดบิลใน transaction เดียว
   * (ทั้ง request อยู่ใน transaction ของ TenantContextInterceptor)
   */
  async cancelOrder(orderId: string, dto: CancelOrderDto, requesterId: string) {
    const approver = await this.verifyApproverPin(
      dto.approverPin,
      'order:close_unpaid',
      requesterId,
    );

    const order = await this.ordersRepository.lockOrderForUpdate(orderId);
    if (!order || order.closed_at) {
      throw new NotFoundException('ไม่พบบิล หรือบิลปิดแล้ว');
    }

    const attempt = await this.ordersRepository.findOpenPaymentAttempt(orderId);
    if (attempt) {
      throw new ConflictException({
        code: 'PAYMENT_ATTEMPT_OPEN',
        message: 'บิลนี้มีรายการชำระเงินค้างอยู่ กรุณายกเลิกรายการชำระก่อน',
      });
    }

    const counts = await this.ordersRepository.countNonVoidedItems(orderId);
    if (counts.blocked > 0) {
      throw new ConflictException({
        code: 'ORDER_HAS_SERVED_ITEMS',
        message:
          'บิลนี้มีรายการที่เสิร์ฟ/พร้อมเสิร์ฟแล้ว ยกเลิกทั้งบิลไม่ได้ — ใช้ "ปิดบิลลูกค้าหนี (walkout)" แทน',
      });
    }

    if (counts.total > 0) {
      const canVoid = await this.ordersRepository.hasPermission(
        approver.users_id,
        'void:approve',
      );
      if (!canVoid) {
        throw new ConflictException({
          code: 'APPROVER_LACKS_VOID',
          message: 'ผู้อนุมัติไม่มีสิทธิ์ยกเลิกรายการ (void:approve)',
        });
      }
    }

    try {
      const voidedCount =
        counts.total > 0
          ? await this.ordersRepository.voidAllItems(
              orderId,
              approver.users_id,
              dto.reason,
            )
          : 0;

      if (voidedCount !== counts.total) {
        // มีรายการใหม่แทรกเข้ามาระหว่างทำ (เครื่องอื่นส่งครัว) — ให้กดใหม่
        throw new ConflictException({
          code: 'ORDER_CHANGED',
          message: 'มีรายการใหม่เข้ามาในบิลนี้ กรุณาตรวจสอบแล้วกดอีกครั้ง',
        });
      }

      const closeReason = counts.total > 0 ? 'voided_all' : 'empty';
      const closed = await this.ordersRepository.closeUnpaid(
        orderId,
        { closeReason, approverPin: dto.approverPin, note: dto.note },
        approver.users_id,
      );
      if (!closed)
        throw new ConflictException('ปิดบิลไม่สำเร็จ กรุณารีเฟรชหน้าจอ');

      return {
        status: 'success',
        data: {
          order: closed,
          voidedCount,
          closeReason,
          approvedBy: {
            usersId: approver.users_id,
            displayName: approver.display_name,
          },
        },
      };
    } catch (err: any) {
      throw this.mapCloseError(err);
    }
  }

  /** แปลง error จาก trigger ให้ FE จัดการได้ */
  private mapCloseError(err: any) {
    if (err instanceof HttpException) return err;
    if (err?.code === 'P0001') {
      const msg: string = err.message ?? '';
      if (msg.includes('cannot close as')) {
        return new ConflictException({
          code: 'ORDER_HAS_ITEMS',
          message:
            'ยังมีรายการที่ยังไม่ถูกยกเลิก ไม่สามารถปิดบิลด้วยเหตุผลนี้ได้',
        });
      }
      if (
        msg.includes('closed order is immutable') ||
        msg.includes('order already closed')
      ) {
        return new ConflictException({
          code: 'ORDER_CLOSED',
          message: 'บิลนี้ปิดแล้ว',
        });
      }
      if (msg.includes('lacks permission order:close_unpaid')) {
        return new ForbiddenException(
          'ผู้อนุมัติไม่มีสิทธิ์ปิดบิลโดยไม่เก็บเงิน',
        );
      }
      if (msg.includes('order is closed')) {
        return new ConflictException({
          code: 'ORDER_CLOSED',
          message: 'บิลนี้ปิดแล้ว',
        });
      }
      if (msg.includes('no open shift')) {
        return new ConflictException('ยังไม่มีกะเปิดอยู่ กรุณาเปิดกะก่อน');
      }
    }
    return err;
  }

  async syncOrders(dto: any, requesterId: string) {
    const orders = Array.isArray(dto) ? dto : (dto.orders ?? []);
    if (orders.length > 0 && !requesterId) {
      throw new BadRequestException(
        'ไม่พบผู้ใช้ที่ทำรายการ (token ไม่ถูกต้อง)',
      );
    }
    try {
      const results = await this.ordersRepository.syncOrders(
        orders,
        requesterId,
      );
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

  /**
   * ตรวจ PIN ผู้จัดการ/เจ้าของร้านที่อนุมัติ void หรือ comp
   * - PIN ของใครก็ได้ในร้านที่มีสิทธิ์ตาม permissionKey (ไม่ต้องสลับ login)
   * - ผิดซ้ำจะนับที่ "บัญชีที่กดขอ" เพื่อกันเดา PIN จากบัญชีเดียว
   */
  private async verifyApproverPin(pin: string, permissionKey: string, requesterId: string) {
    if (!/^\d{6}$/.test(pin ?? '')) {
      throw new BadRequestException('PIN ผู้อนุมัติต้องเป็นตัวเลข 6 หลัก');
    }

    const lockState = await this.usersRepository.getPinLockState(requesterId);
    if (lockState?.pin_locked_until) {
      const lockedUntil = new Date(lockState.pin_locked_until);
      if (lockedUntil > new Date()) {
        throw new HttpException(
          'กรอก PIN ผิดหลายครั้งเกินไป กรุณารอ 5 นาทีแล้วลองใหม่',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const approvers = await this.ordersRepository.findPinApprovers(permissionKey);
    if (approvers.length === 0) {
      throw new ConflictException(
        'ไม่พบผู้จัดการ/เจ้าของร้านที่พร้อมอนุมัติ (ยังไม่ตั้ง PIN หรือถูกล็อกชั่วคราว)',
      );
    }

    let approver: { users_id: string; display_name: string; pin_hash: string } | null = null;
    for (const candidate of approvers) {
      if (await bcrypt.compare(pin, candidate.pin_hash)) {
        approver = candidate;
        break;
      }
    }

    if (!approver) {
      let lockedUntil: Date | null = null;
      try {
        const updated = await this.usersRepository.recordPinFailureDurable(
          requesterId,
          OrdersService.PIN_MAX_ATTEMPTS,
          OrdersService.PIN_LOCK_MINUTES,
        );
        const lock = updated?.pin_locked_until ? new Date(updated.pin_locked_until) : null;
        if (lock && lock > new Date()) lockedUntil = lock;
      } catch {
        // นับครั้งผิดไม่สำเร็จก็ยังต้องปฏิเสธ PIN นี้
      }
      if (lockedUntil) {
        throw new HttpException(
          'กรอก PIN ผิดหลายครั้งเกินไป กรุณารอ 5 นาทีแล้วลองใหม่',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new ForbiddenException('PIN ผู้อนุมัติไม่ถูกต้อง หรือผู้ใช้ไม่มีสิทธิ์อนุมัติ');
    }

    await this.usersRepository.clearPinFailuresForUser(requesterId).catch(() => undefined);
    return approver;
  }

  /** ตรวจรายการร่วมของ void/comp: ต้องอยู่บิลเดียวกัน ยังไม่ปิด/จ่าย และสถานะเข้าเงื่อนไข */
  private async loadActionableItems(
    rawIds: string[],
    allowedStatuses: string[],
  ) {
    const orderItemIds = Array.from(new Set(rawIds));
    if (orderItemIds.length === 0) {
      throw new BadRequestException('ต้องระบุรายการที่ต้องการดำเนินการ');
    }

    const items = await this.ordersRepository.getOrderItemsForUpdate(orderItemIds);
    if (items.length !== orderItemIds.length) {
      throw new NotFoundException('ไม่พบรายการที่ระบุในบิลนี้');
    }
    if (new Set(items.map((item) => item.order_id)).size > 1) {
      throw new BadRequestException('รายการที่เลือกต้องอยู่ในบิลเดียวกัน');
    }
    if (items.some((item) => item.closed_at)) {
      throw new ConflictException('บิลนี้ปิดแล้ว ไม่สามารถดำเนินการได้');
    }
    if (items.some((item) => item.payment_id)) {
      throw new ConflictException('บิลนี้จ่ายเงินแล้ว ไม่สามารถดำเนินการได้');
    }
    if (items.some((item) => item.status === 'voided')) {
      throw new ConflictException('มีรายการที่ถูกยกเลิกไปแล้ว กรุณารีเฟรชหน้าจอ');
    }
    if (items.some((item) => item.is_comped)) {
      throw new ConflictException('มีรายการที่ Comp ไปแล้ว กรุณารีเฟรชหน้าจอ');
    }
    const blocked = items.filter((item) => !allowedStatuses.includes(item.status));
    if (blocked.length > 0) {
      throw new ConflictException('มีรายการที่สถานะไม่สามารถดำเนินการได้ กรุณารีเฟรชหน้าจอ');
    }
    return orderItemIds;
  }

  async voidOrderItems(dto: VoidOrderItemDto, requesterId: string) {
    const approver = await this.verifyApproverPin(dto.approverPin, 'void:approve', requesterId);
    const orderItemIds = await this.loadActionableItems(dto.orderItemIds, ['queued', 'preparing']);

    try {
      const result = await this.ordersRepository.voidOrderItems(orderItemIds, approver.users_id, dto.reason);
      if (result.length !== orderItemIds.length) {
        throw new ConflictException('ยกเลิกได้ไม่ครบทุกรายการ กรุณาลองใหม่');
      }
      return {
        status: 'success',
        data: {
          items: result,
          approvedBy: { usersId: approver.users_id, displayName: approver.display_name },
        },
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('voiding a preparing item requires void:approve')) {
          throw new ForbiddenException('การยกเลิกรายการที่กำลังเตรียม ต้องมีสิทธิ์ void:approve');
        }
        if (msg.includes('voided item is final')) {
          throw new ConflictException('รายการนี้ถูกยกเลิกแล้ว');
        }
        if (msg.includes('invalid order_item transition')) {
          throw new ConflictException('สถานะรายการนี้ไม่สามารถยกเลิกได้ กรุณารีเฟรชหน้าจอ');
        }
      }
      throw err;
    }
  }

  async compOrderItems(dto: CompOrderItemDto, requesterId: string) {
    const approver = await this.verifyApproverPin(dto.approverPin, 'discount:approve', requesterId);
    const orderItemIds = await this.loadActionableItems(dto.orderItemIds, ['served']);

    try {
      const result = await this.ordersRepository.compOrderItems(orderItemIds, approver.users_id, dto.reason);
      if (result.length !== orderItemIds.length) {
        throw new ConflictException('Comp ได้ไม่ครบทุกรายการ กรุณาลองใหม่');
      }
      return {
        status: 'success',
        data: {
          items: result,
          approvedBy: { usersId: approver.users_id, displayName: approver.display_name },
        },
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      if (err.code === 'P0001') {
        const msg: string = err.message ?? '';
        if (msg.includes('comp requires discount:approve')) {
          throw new ForbiddenException('การ Comp ต้องมีสิทธิ์ discount:approve');
        }
        if (msg.includes('comp allowed only when status=served')) {
          throw new ConflictException('สามารถ Comp ได้เฉพาะรายการที่เสิร์ฟแล้วเท่านั้น');
        }
        if (msg.includes('comp cannot be reverted')) {
          throw new ConflictException('ไม่สามารถยกเลิก Comp ได้');
        }
        if (msg.includes('invalid order_item transition')) {
          throw new ConflictException('สถานะรายการนี้ไม่สามารถ Comp ได้ กรุณารีเฟรชหน้าจอ');
        }
      }
      throw err;
    }
  }
}
