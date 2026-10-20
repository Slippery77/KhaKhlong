import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';

const KDS_ITEM_SELECT = `
  oi.order_item_id,
  oi.order_id,
  o.order_number,
  t.table_number,
  oi.item_name_snapshot,
  oi.status,
  oi.kitchen_ticket_id,
  oi.special_request,
  oi.queued_at,
  oi.preparing_at,
  oi.ready_at,
  oi.served_at,
  oi.created_at,
  oi.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'modifier_id', oim.modifier_id,
        'name', oim.modifier_name_snapshot,
        'price_delta', oim.price_delta_snapshot
      )
    ) FILTER (WHERE oim.modifier_id IS NOT NULL), '[]'
  ) AS modifiers
`;

@Injectable()
export class KdsRepository {
  constructor(private readonly db: DbContextService) {}

  /**
   * ดึงรายการคิวอาหารในครัว (KDS queue)
   * ใช้ Partial Index: idx_order_items_kds (tenant_id, status, queued_at) WHERE status IN ('queued','preparing','ready')
   * และ RLS จะเติม AND tenant_id = app_tenant_id() ให้อัตโนมัติ
   */
  async getQueue() {
    const sql = `
      SELECT
        ${KDS_ITEM_SELECT}
      FROM order_items oi
      INNER JOIN orders o ON o.order_id = oi.order_id
      LEFT JOIN dining_tables t ON t.table_id = o.table_id
      LEFT JOIN order_item_modifiers oim ON oim.order_item_id = oi.order_item_id
      WHERE oi.status IN ('queued', 'preparing', 'ready')
      GROUP BY oi.order_item_id, o.order_number, t.table_number
      ORDER BY oi.queued_at ASC, oi.created_at ASC;
    `;
    const result = await this.db.query(sql);
    return result.rows;
  }

  /**
   * ค้นหา order_item ตาม id
   */
  async findById(id: string) {
    const sql = `
      SELECT
        ${KDS_ITEM_SELECT}
      FROM order_items oi
      INNER JOIN orders o ON o.order_id = oi.order_id
      LEFT JOIN dining_tables t ON t.table_id = o.table_id
      LEFT JOIN order_item_modifiers oim ON oim.order_item_id = oi.order_item_id
      WHERE oi.order_item_id = $1
      GROUP BY oi.order_item_id, o.order_number, t.table_number;
    `;
    const result = await this.db.query(sql, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * อัปเดตสถานะรายการอาหารในครัว (5 สถานะ: queued, preparing, ready, served, voided)
   * หมายเหตุ:
   * - Trigger trg_order_item_state() ในฐานข้อมูลจะคอยตรวจสอบการเปลี่ยนสถานะ (state machine)
   *   และบันทึก queued_at, preparing_at, ready_at, served_at ให้อัตโนมัติ
   * - กรณี voided ต้องใส่ voided_by, voided_at, void_reason ตาม CHECK constraint chk_void_fields_only_when_voided
   */
  async updateStatus(
    id: string,
    status: string,
    userId?: string,
    voidReason?: string,
  ) {
    const isVoided = status === 'voided';
    const sql = `
      UPDATE order_items
      SET
        status = $2::varchar,
        void_reason = CASE WHEN $2::varchar = 'voided' THEN $3::text ELSE void_reason END,
        voided_by   = CASE WHEN $2::varchar = 'voided' THEN $4::uuid ELSE voided_by END,
        voided_at   = CASE WHEN $2::varchar = 'voided' THEN now()    ELSE voided_at END,
        updated_at  = now()
      WHERE order_item_id = $1
      RETURNING
        order_item_id,
        order_id,
        item_name_snapshot,
        status,
        kitchen_ticket_id,
        special_request,
        queued_at,
        preparing_at,
        ready_at,
        served_at,
        created_at,
        updated_at;
    `;
    const result = await this.db.query(sql, [
      id,
      status,
      isVoided ? (voidReason ?? 'ยกเลิกจากจอครัว') : null,
      isVoided ? (userId ?? null) : null,
    ]);
    return result.rows[0] ?? null;
  }
}
