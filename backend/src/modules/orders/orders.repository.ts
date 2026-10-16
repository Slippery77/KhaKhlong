import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderItemDto } from './dto/add-order-items.dto';
import { CloseUnpaidDto } from './dto/close-unpaid.dto';

const ORDERS_COL = `order_id, tenant_id, order_number, business_date, table_id,
  payment_id, created_by, closed_at, closed_by, close_reason, created_at, updated_at`;

const ORDER_ITEMS_COL = `order_item_id , menu_item_id ,unit_price_snapshot , item_name_snapshot
  , status , special_request`

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: DbContextService) {}

  /**
   * สร้างบิลใหม่
   * ข้อบังคับ:
   * 1. ใช้ INSERT INTO orders ... ON CONFLICT (order_id) DO NOTHING RETURNING ...
   * 2. order_number รันจาก order_sequences ใน DB
   */
  async createOrder(dto: CreateOrderDto, createdBy: string) {
    const sql = `
      INSERT INTO orders (order_id, tenant_id, table_id, created_by)
      VALUES ($1, app_tenant_id(), $2, $3)
      ON CONFLICT (order_id) DO NOTHING
      RETURNING ${ORDERS_COL};
    `;
    const result = await this.db.query(sql, [dto.orderId, dto.tableId, createdBy]);
    return result.rows[0] ?? null;
  }

  /**
   * ค้นหาบิลตาม order_id พร้อมรายการอาหารและตัวเลือก
   */
  async findOrderById(orderId: string) {
    const sql = `
      SELECT
        ${ORDERS_COL}
      FROM orders
      WHERE order_id = $1;
    `;
    
    const result = await this.db.query(sql,[orderId])
    return result.rows[0] ?? null;
  }

  /**
   * ดึงรายการบิลที่ยังเปิดอยู่ทั้งหมด (closed_at IS NULL)
   */
  async findOpenOrders() {
    // TODO: เขียน SQL SELECT บิลที่ยังไม่ปิด
    return [];
  }

  /**
   * เพิ่มรายการอาหารเข้าบิล
   * ข้อบังคับ:
   * 1. บันทึก 1 จานต่อ 1 แถว ใน order_items
   * 2. บันทึก unit_price_snapshot และ item_name_snapshot
   * 3. บันทึก modifiers ใน order_item_modifiers
   */
  async addOrderItems(orderId: string, items: CreateOrderItemDto[]) {
    // TODO: เขียน SQL INSERT เข้า order_items และ order_item_modifiers
    return [];
  }

  /**
   * ย้ายโต๊ะของบิลที่ยังไม่ปิด
   */
  async moveTable(orderId: string, newTableId: string) {
    // TODO: เขียน SQL UPDATE table_id ใน orders
    return null;
  }

  /**
   * ปิดบิลโดยไม่เก็บเงิน (voided_all, empty, walkout)
   */
  async closeUnpaid(orderId: string, dto: CloseUnpaidDto, closedBy: string) {
    // TODO: เขียน SQL UPDATE closed_at, closed_by, close_reason ใน orders
    return null;
  }

  /**
   * บันทึกซิงค์ข้อมูลบิลแบบ Offline Batch
   */
  async syncOrders(orders: any[]) {
    // TODO: เขียน SQL Batch INSERT ... ON CONFLICT DO NOTHING
    return [];
  }
}
