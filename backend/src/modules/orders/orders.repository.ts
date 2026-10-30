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
   * - 1 จาน = 1 แถว จึงคืน items เป็นรายการต่อจาน (ให้ client aggregate เอง)
   * - ไม่คืนรายการที่ voided เพราะไม่ใช่ยอดที่ต้องชำระ
   * - modifier ใช้ snapshot ใน order_item_modifiers (ไม่ join ตาราง modifiers
   *   เพราะราคาอาจเปลี่ยนภายหลัง)
   */
  async findOrderById(orderId: string) {
    const orderSql = `
      SELECT
        ${ORDERS_COL}
      FROM orders
      WHERE order_id = $1
        AND tenant_id = app_tenant_id();
    `;

    const orderResult = await this.db.query(orderSql, [orderId]);
    const order = orderResult.rows[0];
    if (!order) return null;

    const itemsSql = `
      SELECT
        oi.order_item_id,
        oi.menu_item_id,
        oi.unit_price_snapshot,
        oi.item_name_snapshot,
        oi.status,
        oi.special_request,
        oi.is_comped,
        oi.kitchen_ticket_id,
        oi.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'modifierId', oim.modifier_id,
              'name', oim.modifier_name_snapshot,
              'priceDelta', oim.price_delta_snapshot
            )
            ORDER BY oim.modifier_name_snapshot
          ) FILTER (WHERE oim.modifier_id IS NOT NULL),
          '[]'::json
        ) AS modifiers
      FROM order_items oi
      LEFT JOIN order_item_modifiers oim
        ON oim.order_item_id = oi.order_item_id
       AND oim.tenant_id = oi.tenant_id
      WHERE oi.order_id = $1
        AND oi.tenant_id = app_tenant_id()
        AND oi.status <> 'voided'
      GROUP BY oi.order_item_id
      ORDER BY oi.created_at, oi.order_item_id;
    `;

    const itemsResult = await this.db.query(itemsSql, [orderId]);

    return { ...order, items: itemsResult.rows };
  }

  /**
   * ดึงรายการบิลที่ยังเปิดอยู่ทั้งหมด (closed_at IS NULL)
   * JOIN dining_tables เพื่อคืน table_number ไปด้วย
   */
  async findOpenOrders() {
    const sql = `
      SELECT
        o.order_id,
        o.order_number,
        o.business_date,
        o.table_id,
        o.created_by,
        o.created_at,
        o.updated_at,
        t.table_number,
        COUNT(oi.order_item_id) FILTER (WHERE oi.status <> 'voided') AS item_count,
        COALESCE(SUM(
          CASE WHEN oi.is_comped THEN 0
               ELSE oi.unit_price_snapshot + COALESCE(mod.mod_sum, 0)
          END
        ), 0) AS total_amount
      FROM orders o
      JOIN dining_tables t ON t.table_id = o.table_id
      LEFT JOIN order_items oi ON oi.order_id = o.order_id
      LEFT JOIN (
        SELECT order_item_id, SUM(price_delta_snapshot) AS mod_sum
        FROM order_item_modifiers
        GROUP BY order_item_id
      ) mod ON mod.order_item_id = oi.order_item_id
      WHERE o.closed_at IS NULL
      GROUP BY o.order_id, o.order_number, o.business_date,
               o.table_id, o.created_by, o.created_at, o.updated_at,
               t.table_number
      ORDER BY o.order_number;
    `;
    const result = await this.db.query(sql);
    return result.rows;
  }

  /**
   * เพิ่มรายการอาหารเข้าบิล
   * - 1 จาน = 1 แถว (ไม่มี quantity โดยเจตนา)
   * - อ่าน price + name snapshot จาก menu_items และ modifiers ใน DB
   *   ห้ามรับค่า snapshot จาก client เพราะ trigger บังคับ immutable หลัง insert
   * - ON CONFLICT (order_item_id) DO NOTHING รองรับ offline retry
   */
  async addOrderItems(orderId: string, items: CreateOrderItemDto[], kitchenTicketId?: string) {
    const insertedItems: any[] = [];

    for (const item of items) {
      // ดึง snapshot ราคาและชื่อจาก DB — ห้ามรับจาก client
      const menuSql = `
        SELECT name, price
        FROM menu_items
        WHERE menu_item_id = $1;
      `;
      const menuResult = await this.db.query(menuSql, [item.menuItemId]);
      const menuItem = menuResult.rows[0];

      if (!menuItem) continue;

      // INSERT order_item — ถ้ามี kitchenTicketId ให้ใส่และตั้ง status เป็น 'queued' ทันที
      const itemSql = kitchenTicketId
        ? `
          INSERT INTO order_items
            (order_item_id, tenant_id, order_id, menu_item_id,
             unit_price_snapshot, item_name_snapshot, special_request,
             kitchen_ticket_id, status, queued_at)
          VALUES ($1, app_tenant_id(), $2, $3, $4, $5, $6, $7, 'queued', now())
          ON CONFLICT (order_item_id) DO NOTHING
          RETURNING ${ORDER_ITEMS_COL}, order_item_id;
        `
        : `
          INSERT INTO order_items
            (order_item_id, tenant_id, order_id, menu_item_id,
             unit_price_snapshot, item_name_snapshot, special_request)
          VALUES ($1, app_tenant_id(), $2, $3, $4, $5, $6)
          ON CONFLICT (order_item_id) DO NOTHING
          RETURNING ${ORDER_ITEMS_COL}, order_item_id;
        `;

      const params = kitchenTicketId
        ? [item.orderItemId, orderId, item.menuItemId, menuItem.price, menuItem.name, item.specialRequest ?? null, kitchenTicketId]
        : [item.orderItemId, orderId, item.menuItemId, menuItem.price, menuItem.name, item.specialRequest ?? null];

      const itemResult = await this.db.query(itemSql, params);
      const insertedItem = itemResult.rows[0];
      if (!insertedItem) continue; // ON CONFLICT DO NOTHING → รายการมีอยู่แล้ว

      // INSERT modifiers ถ้ามี
      const modifierSnapshots: any[] = [];
      if (item.modifierIds && item.modifierIds.length > 0) {
        for (const modifierId of item.modifierIds) {
          // ดึง snapshot จาก DB
          const modSql = `
            SELECT name, price_delta
            FROM modifiers
            WHERE modifier_id = $1;
          `;
          const modResult = await this.db.query(modSql, [modifierId]);
          const modifier = modResult.rows[0];
          if (!modifier) continue;

          const oimSql = `
            INSERT INTO order_item_modifiers
              (tenant_id, order_item_id, modifier_id,
               price_delta_snapshot, modifier_name_snapshot)
            VALUES (app_tenant_id(), $1, $2, $3, $4)
            ON CONFLICT (order_item_id, modifier_id) DO NOTHING;
          `;
          await this.db.query(oimSql, [
            item.orderItemId,
            modifierId,
            modifier.price_delta,
            modifier.name,
          ]);

          modifierSnapshots.push({
            modifierId,
            name: modifier.name,
            priceDelta: modifier.price_delta,
          });
        }
      }

      insertedItems.push({ ...insertedItem, modifiers: modifierSnapshots });
    }

    return insertedItems;
  }

  /**
   * ย้ายโต๊ะของบิลที่ยังไม่ปิด
   * trigger trg_orders_before จะ:
   *  - ตรวจว่าโต๊ะปลายทาง status = 'available'
   * trigger trg_orders_after จะ:
   *  - เรียก sync_table_status() ทั้งโต๊ะเก่าและใหม่อัตโนมัติ
   */
  async moveTable(orderId: string, newTableId: string) {
    const sql = `
      UPDATE orders
      SET table_id = $1
      WHERE order_id = $2
        AND closed_at IS NULL
      RETURNING ${ORDERS_COL};
    `;
    const result = await this.db.query(sql, [newTableId, orderId]);
    return result.rows[0] ?? null;
  }

  /**
   * ปิดบิลโดยไม่เก็บเงิน (voided_all, empty, walkout)
   * trigger trg_orders_before จะ:
   *  - ตรวจว่า voided_all/empty ต้องไม่มี order_items ที่ยังไม่ voided
   *  - ตรวจสิทธิ์ order:close_unpaid (DB ตรวจซ้ำ)
   *  - ตั้ง closed_at = now() ให้อัตโนมัติถ้าไม่ได้ส่งมา
   * trigger trg_orders_after จะ:
   *  - เขียน audit log 'order_closed_unpaid' อัตโนมัติ
   *  - เรียก sync_table_status() โต๊ะกลับเป็น available
   */
  async closeUnpaid(orderId: string, dto: CloseUnpaidDto, closedBy: string) {
    const sql = `
      UPDATE orders
      SET close_reason = $1,
          closed_by    = $2,
          closed_at    = now()
      WHERE order_id = $3
        AND closed_at IS NULL
      RETURNING ${ORDERS_COL};
    `;
    const result = await this.db.query(sql, [dto.closeReason, closedBy, orderId]);
    return result.rows[0] ?? null;
  }

  /**
   * ซิงค์บิลและรายการอาหารจากอุปกรณ์ที่ทำงานแบบ Offline
   * - ใช้ ON CONFLICT DO NOTHING เหมือน createOrder
   * - ส่ง order_id จาก client (idempotent)
   * - ส่ง items ต่อบิลได้เลยในครั้งเดียว
   */
  async syncOrders(orders: any[]) {
    const results: any[] = [];

    for (const orderDto of orders) {
      // INSERT order (idempotent)
      const orderSql = `
        INSERT INTO orders (order_id, tenant_id, table_id, created_by)
        VALUES ($1, app_tenant_id(), $2, $3)
        ON CONFLICT (order_id) DO NOTHING
        RETURNING ${ORDERS_COL};
      `;
      const orderResult = await this.db.query(orderSql, [
        orderDto.orderId,
        orderDto.tableId,
        orderDto.createdBy,
      ]);

      const createdOrder = orderResult.rows[0];

      // INSERT items ถ้ามี (ไม่ว่าจะสร้าง order ใหม่หรือมีอยู่แล้ว)
      let insertedItems: any[] = [];
      if (orderDto.items && orderDto.items.length > 0) {
        insertedItems = await this.addOrderItems(
          orderDto.orderId,
          orderDto.items,
        );
      }

      results.push({
        orderId: orderDto.orderId,
        isNew: !!createdOrder,
        order: createdOrder ?? null,
        items: insertedItems,
      });
    }

    return results;
  }

  async hasPendingOrders(){
    const sql=`
        SELECT o.order_id, o.order_number, t.table_number,
          COUNT(oi.order_item_id) FILTER (WHERE oi.status <> 'voided') AS active_items,
          COUNT(oi.order_item_id) FILTER (WHERE oi.status IN ('draft','queued','preparing','ready')) AS pending_items
        FROM orders o
        JOIN dining_tables t ON t.table_id = o.table_id
        LEFT JOIN order_items oi ON oi.order_id = o.order_id
        WHERE o.closed_at IS NULL
        GROUP BY o.order_id, o.order_number, t.table_number
        ORDER BY o.order_number;
    `;
    const result = await this.db.query(sql);
    return result.rows;
  }

  // ------------------------------------------------------------------
  // Void / Comp (ORD-04) — ทุกครั้งต้องมีผู้จัดการ/เจ้าของร้านอนุมัติด้วย PIN
  // ------------------------------------------------------------------

  /** ผู้ใช้ในร้านนี้ที่ตั้ง PIN ไว้และมีสิทธิ์ตาม permissionKey (ใช้ตรวจ PIN ผู้อนุมัติ) */
  async findPinApprovers(permissionKey: string) {
    const sql = `
      SELECT u.users_id, u.display_name, u.pin_hash
      FROM users u
      JOIN role_permissions rp ON rp.role_id = u.role_id
      JOIN permissions p ON p.permission_id = rp.permission_id
      WHERE p.permission_key = $1
        AND u.tenant_id = app_tenant_id()
        AND u.pin_hash IS NOT NULL
        AND u.is_active
        AND (u.pin_locked_until IS NULL OR u.pin_locked_until <= now())
    `;
    const result = await this.db.query(sql, [permissionKey]);
    return result.rows as { users_id: string; display_name: string; pin_hash: string }[];
  }

  async getOrderItemsForUpdate(orderItemIds: string[]) {
    const sql = `
      SELECT oi.order_item_id, oi.order_id, oi.status, oi.is_comped,
             o.closed_at, o.payment_id
      FROM order_items oi
      JOIN orders o ON o.order_id = oi.order_id AND o.tenant_id = oi.tenant_id
      WHERE oi.order_item_id = ANY($1::uuid[])
        AND oi.tenant_id = app_tenant_id()
      ORDER BY oi.order_item_id
      FOR UPDATE OF oi
    `;
    const result = await this.db.query(sql, [orderItemIds]);
    return result.rows;
  }

  async voidOrderItems(orderItemIds: string[], approverId: string, reason: string) {
    const sql = `
      UPDATE order_items
      SET status = 'voided',
          voided_by = $2,
          void_reason = $3,
          updated_at = now()
      WHERE order_item_id = ANY($1::uuid[])
        AND tenant_id = app_tenant_id()
        AND status IN ('queued', 'preparing')
        AND is_comped = false
      RETURNING order_item_id, order_id, status, voided_by, voided_at, void_reason
    `;
    const result = await this.db.query(sql, [orderItemIds, approverId, reason]);
    return result.rows;
  }

  async compOrderItems(orderItemIds: string[], approverId: string, reason: string) {
    const sql = `
      UPDATE order_items
      SET is_comped = true,
          comp_reason = $3,
          comped_by = $2,
          updated_at = now()
      WHERE order_item_id = ANY($1::uuid[])
        AND tenant_id = app_tenant_id()
        AND status = 'served'
        AND is_comped = false
      RETURNING order_item_id, order_id, status, is_comped, comped_by, comped_at, comp_reason
    `;
    const result = await this.db.query(sql, [orderItemIds, approverId, reason]);
    return result.rows;
  }
}
