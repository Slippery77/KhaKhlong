import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';
import { UpdateTableDto } from './dto/update-table.dto';


const TABLE_COLS = `table_id , table_number, capacity, floor , status ,created_at , updated_at`

@Injectable()
export class TablesRepository {
  constructor(private readonly db: DbContextService) { }


  /**
   * TODO: ดึงรายการโต๊ะทั้งหมดของร้าน (ตาราง dining_tables)
   * คำแนะนำตาม backend-dev-guide.md:
   * - ตาราง dining_tables ใช้ SELECT table_id, table_number, capacity, floor, status, is_active FROM dining_tables
   */
  async findAll() {
    // LEFT JOIN กับ orders (open only) + order_items (non-voided)
    // เพื่อคืน open_order_id, item_count, total_amount ไปพร้อมกัน
    // ให้ frontend แสดงจำนวนรายการและยอดค้างชำระบนการ์ดโต๊ะ
    const sql = `
      SELECT
        t.table_id,
        t.table_number,
        t.capacity,
        t.floor,
        t.status,
        t.created_at,
        t.updated_at,
        o.order_id                            AS open_order_id,
        COUNT(oi.order_item_id)               AS item_count,
        COALESCE(SUM(
          CASE WHEN oi.is_comped THEN 0
               ELSE oi.unit_price_snapshot + COALESCE(mod.mod_sum, 0)
          END
        ), 0)                                 AS total_amount
      FROM dining_tables t
      LEFT JOIN orders o
             ON o.table_id = t.table_id
            AND o.closed_at IS NULL
      LEFT JOIN order_items oi
             ON oi.order_id = o.order_id
            AND oi.status <> 'voided'
      LEFT JOIN (
        SELECT order_item_id, SUM(price_delta_snapshot) AS mod_sum
        FROM order_item_modifiers
        GROUP BY order_item_id
      ) mod ON mod.order_item_id = oi.order_item_id
      GROUP BY
        t.table_id, t.table_number, t.capacity, t.floor, t.status,
        t.created_at, t.updated_at,
        o.order_id
      ORDER BY t.floor ASC, t.table_number ASC;
    `;
    const result = await this.db.query(sql);
    return result.rows;
  }

  /**
   * TODO: ค้นหาโต๊ะตาม ID
   */
  async findById(id: string) {
    const sql = ` 
      SELECT 
        table_id, 
        table_number, 
        capacity, 
        floor, 
        status, 
        created_at, 
        updated_at
      FROM dining_tables
      WHERE table_id = $1;`
    // TODO: เขียน SQL SELECT ค้นหาตาม table_id
    const result = await this.db.query(sql, [id])
    return result.rows[0] ?? null;
  }

  /**
   * TODO: เพิ่มโต๊ะใหม่ลงตาราง dining_tables
   * คำแนะนำ:
   * - INSERT INTO dining_tables (tenant_id, table_number, capacity, floor) VALUES (app_tenant_id(), $1, $2, $3)
   */
  async createTable(table_number: string, capacity: number, floor?: number) {
    const sql = `
      INSERT INTO dining_tables (tenant_id, table_number, capacity, floor) VALUES (app_tenant_id(), $1, $2, $3)
      RETURNING ${TABLE_COLS};`
    // TODO: เขียน SQL INSERT
    const result = await this.db.query(sql, [table_number, capacity, floor])
    return result.rows[0];
  }

  /**
   * TODO: อัปเดตข้อมูลโต๊ะ (เลขโต๊ะ, ความจุ, ชั้น)
   */
  async updateTable(id: string, data: UpdateTableDto) {
    // TODO: เขียน SQL UPDATE
    const sql = `
      UPDATE dining_tables
      SET table_number = COALESCE($2 , table_number),
          capacity = COALESCE($3 , capacity),
          floor = COALESCE($4 , floor),
      updated_at = now()
      WHERE table_id  = $1
      RETURNING ${TABLE_COLS}
    `
    const result = await this.db.query(sql, [id, data.tableNumber ?? null, data.capacity ?? null, data.floor ?? null])
    return result.rows[0] ?? null;
  }

  /**
   * TODO: ปรับสถานะเปิด/ปิดการใช้งาน (is_active)
   */
  async setActiveStatus(id: string, isActive: boolean) {

    const newStatus = isActive ? 'available' : 'out_of_service';
    const sql = `
      UPDATE dining_tables
      SET status = $2,
      updated_at = now()
      WHERE table_id = $1
      RETURNING ${TABLE_COLS};
    `
    const result = await this.db.query(sql, [id, newStatus])
    // TODO: เขียน SQL UPDATE is_active = $2 WHERE table_id = $1
    return result.rows[0] ?? null;
  }
}
