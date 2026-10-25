import { Injectable } from '@nestjs/common';
import { DbContextService } from '../../database/db-context.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly db: DbContextService) {}

  async getSalesSummary(params: {
    from?: string;
    to?: string;
    shiftId?: string;
    period?: 'TODAY' | 'WEEK' | 'MONTH';
  }) {
    const pConditions: string[] = ['p.tenant_id = app_tenant_id()'];
    const pValues: any[] = [];
    let pIdx = 1;

    const cmConditions: string[] = ['cm.tenant_id = app_tenant_id()'];
    const cmValues: any[] = [];
    let cmIdx = 1;

    const sConditions: string[] = ['s.tenant_id = app_tenant_id()'];
    const sValues: any[] = [];
    let sIdx = 1;

    if (params.shiftId) {
      pConditions.push(`p.business_date = (SELECT business_date FROM shifts WHERE shift_id = $${pIdx++})`);
      pValues.push(params.shiftId);

      cmConditions.push(`cm.shift_id = $${cmIdx++}`);
      cmValues.push(params.shiftId);

      sConditions.push(`s.shift_id = $${sIdx++}`);
      sValues.push(params.shiftId);
    } else if (params.from && params.to) {
      pConditions.push(`p.paid_at::date BETWEEN $${pIdx++}::date AND $${pIdx++}::date`);
      pValues.push(params.from, params.to);

      cmConditions.push(`cm.created_at::date BETWEEN $${cmIdx++}::date AND $${cmIdx++}::date`);
      cmValues.push(params.from, params.to);

      sConditions.push(`s.business_date BETWEEN $${sIdx++}::date AND $${sIdx++}::date`);
      sValues.push(params.from, params.to);
    } else if (params.period === 'TODAY') {
      pConditions.push(`p.paid_at::date = CURRENT_DATE`);
      cmConditions.push(`cm.created_at::date = CURRENT_DATE`);
      sConditions.push(`s.business_date = CURRENT_DATE`);
    } else if (params.period === 'WEEK') {
      pConditions.push(`p.paid_at >= date_trunc('week', CURRENT_DATE)`);
      cmConditions.push(`cm.created_at >= date_trunc('week', CURRENT_DATE)`);
      sConditions.push(`s.business_date >= date_trunc('week', CURRENT_DATE)::date`);
    } else if (params.period === 'MONTH') {
      pConditions.push(`p.paid_at >= date_trunc('month', CURRENT_DATE)`);
      cmConditions.push(`cm.created_at >= date_trunc('month', CURRENT_DATE)`);
      sConditions.push(`s.business_date >= date_trunc('month', CURRENT_DATE)::date`);
    }

    const pSql = `
      SELECT
        COALESCE(SUM(p.total_amount), 0) AS total_income,
        COUNT(DISTINCT p.payment_id) AS total_bills_count,
        COALESCE(SUM(CASE WHEN LOWER(p.payment_method) = 'cash' THEN p.total_amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN LOWER(p.payment_method) <> 'cash' THEN p.total_amount ELSE 0 END), 0) AS transfer_sales
      FROM payments p
      WHERE ${pConditions.join(' AND ')}
    `;
    const pRes = await this.db.query(pSql, pValues);
    const pRow = pRes.rows[0] || {};

    const cmSql = `
      SELECT
        COALESCE(SUM(CASE WHEN cm.direction = 'in' THEN cm.amount ELSE 0 END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN cm.direction = 'out' THEN cm.amount ELSE 0 END), 0) AS cash_out
      FROM cash_movements cm
      WHERE ${cmConditions.join(' AND ')}
    `;
    const cmRes = await this.db.query(cmSql, cmValues);
    const cmRow = cmRes.rows[0] || { cash_in: 0, cash_out: 0 };

    const sSql = `
      SELECT COALESCE(SUM(s.opening_cash), 0) AS opening_cash
      FROM shifts s
      WHERE ${sConditions.join(' AND ')}
    `;
    const sRes = await this.db.query(sSql, sValues);
    const sRow = sRes.rows[0] || { opening_cash: 0 };

    const openingCash = Number(sRow.opening_cash || 0);
    const cashSales = Number(pRow.cash_sales || 0);
    const cashIn = Number(cmRow.cash_in || 0);
    const cashOut = Number(cmRow.cash_out || 0);
    const cashOnHand = openingCash + cashSales + cashIn - cashOut;

    return {
      totalIncome: Number(pRow.total_income || 0),
      totalExpense: cashOut,
      cashSales,
      transferSales: Number(pRow.transfer_sales || 0),
      totalBillsCount: Number(pRow.total_bills_count || 0),
      cashOnHand,
      cashIn,
      cashOut,
    };
  }

  async getSalesByPeriod(params: {
    period?: 'TODAY' | 'WEEK' | 'MONTH';
    from?: string;
    to?: string;
    shiftId?: string;
  }) {
    const c: string[] = ['p.tenant_id = app_tenant_id()'];
    const v: any[] = [];
    let idx = 1;

    if (params.shiftId) {
      c.push(`p.business_date = (SELECT business_date FROM shifts WHERE shift_id = $${idx++})`);
      v.push(params.shiftId);
    } else if (params.from && params.to) {
      c.push(`p.paid_at::date BETWEEN $${idx++}::date AND $${idx++}::date`);
      v.push(params.from, params.to);
    } else if (params.period === 'TODAY') {
      c.push(`p.paid_at::date = CURRENT_DATE`);
    } else if (params.period === 'WEEK') {
      c.push(`p.paid_at >= date_trunc('week', CURRENT_DATE)`);
    } else if (params.period === 'MONTH') {
      c.push(`p.paid_at >= date_trunc('month', CURRENT_DATE)`);
    }

    if (params.period === 'TODAY' || (params.from && params.to && params.from === params.to)) {
      const sql = `
        SELECT to_char(date_trunc('hour', p.paid_at), 'HH24:00') AS label,
               COALESCE(SUM(p.total_amount), 0) AS total_sales,
               COUNT(DISTINCT p.payment_id) AS bill_count
        FROM payments p
        WHERE ${c.join(' AND ')}
        GROUP BY date_trunc('hour', p.paid_at)
        ORDER BY date_trunc('hour', p.paid_at)
      `;
      const res = await this.db.query(sql, v);
      return res.rows.map(r => ({
        label: r.label,
        totalSales: Number(r.total_sales),
        billCount: Number(r.bill_count),
      }));
    } else if (params.period === 'WEEK') {
      const sql = `
        SELECT TRIM(TO_CHAR(p.paid_at, 'DY')) AS label,
               EXTRACT(DOW FROM p.paid_at) AS dow,
               COALESCE(SUM(p.total_amount), 0) AS total_sales,
               COUNT(DISTINCT p.payment_id) AS bill_count
        FROM payments p
        WHERE ${c.join(' AND ')}
        GROUP BY TRIM(TO_CHAR(p.paid_at, 'DY')), EXTRACT(DOW FROM p.paid_at)
        ORDER BY EXTRACT(DOW FROM p.paid_at)
      `;
      const res = await this.db.query(sql, v);
      const thaiDayMap: Record<number, string> = {
        0: 'อาทิตย์',
        1: 'จันทร์',
        2: 'อังคาร',
        3: 'พุธ',
        4: 'พฤหัส',
        5: 'ศุกร์',
        6: 'เสาร์',
      };
      return res.rows.map(r => ({
        label: thaiDayMap[Number(r.dow)] || r.label,
        totalSales: Number(r.total_sales),
        billCount: Number(r.bill_count),
        dayIndex: Number(r.dow),
      }));
    } else {
      const sql = `
        SELECT CONCAT('สัปดาห์ที่ ', CEIL(EXTRACT(DAY FROM p.paid_at)/7.0)::int) AS label,
               CEIL(EXTRACT(DAY FROM p.paid_at)/7.0)::int AS w,
               COALESCE(SUM(p.total_amount), 0) AS total_sales,
               COUNT(DISTINCT p.payment_id) AS bill_count
        FROM payments p
        WHERE ${c.join(' AND ')}
        GROUP BY 1, 2
        ORDER BY 2
      `;
      const res = await this.db.query(sql, v);
      return res.rows.map(r => ({
        label: r.label,
        totalSales: Number(r.total_sales),
        billCount: Number(r.bill_count),
      }));
    }
  }

  /**
   * เมนูขายดีแยกตามหมวดหมู่: คืนเฉพาะ top N ของแต่ละหมวด (ค่าเริ่มต้น 3)
   * - หมวดถูกเรียงตามยอดขายรวมของหมวด (มาก → น้อย)
   * - ภายในหมวดเรียงตามยอดขาย แล้วจำนวนจาน
   * - ข้อมูลหมวดมาจาก menu_items.category_id ของเมนูนั้น
   */
  async getTopItems(params: {
    period?: 'TODAY' | 'WEEK' | 'MONTH';
    from?: string;
    to?: string;
    shiftId?: string;
    limit?: number;
  }) {
    const c: string[] = [
      'p.tenant_id = app_tenant_id()',
      "t.status <> 'voided'",
    ];
    const v: any[] = [];
    let idx = 1;

    if (params.shiftId) {
      c.push(
        `p.business_date = (SELECT business_date FROM shifts WHERE shift_id = $${idx++})`,
      );
      v.push(params.shiftId);
    } else if (params.from && params.to) {
      c.push(`p.paid_at::date BETWEEN $${idx++}::date AND $${idx++}::date`);
      v.push(params.from, params.to);
    } else if (params.period === 'TODAY') {
      c.push(`p.paid_at::date = CURRENT_DATE`);
    } else if (params.period === 'WEEK') {
      c.push(`p.paid_at >= date_trunc('week', CURRENT_DATE)`);
    } else if (params.period === 'MONTH') {
      c.push(`p.paid_at >= date_trunc('month', CURRENT_DATE)`);
    }

    const perCategory = params.limit && params.limit > 0 ? params.limit : 3;
    const sql = `
      WITH sold AS (
        SELECT c.category_id,
               c.name AS category_name,
               t.item_name_snapshot AS name,
               COUNT(*) AS quantity,
               COALESCE(SUM(t.line_total), 0) AS total_amount
        FROM payments p
        JOIN payment_attempt_orders pao ON pao.payment_attempt_id = p.payment_attempt_id
        JOIN v_order_item_totals t ON t.order_id = pao.order_id
        JOIN order_items oi ON oi.order_item_id = t.order_item_id
                            AND oi.tenant_id = t.tenant_id
        JOIN menu_items mi ON mi.menu_item_id = oi.menu_item_id
                           AND mi.tenant_id = oi.tenant_id
        JOIN categories c ON c.category_id = mi.category_id
                          AND c.tenant_id = mi.tenant_id
        WHERE ${c.join(' AND ')}
        GROUP BY c.category_id, c.name, t.item_name_snapshot
      ),
      ranked AS (
        SELECT sold.*,
               SUM(total_amount) OVER (PARTITION BY category_id) AS category_total,
               ROW_NUMBER() OVER (
                 PARTITION BY category_id
                 ORDER BY total_amount DESC, quantity DESC, name ASC
               ) AS rank
        FROM sold
      )
      SELECT category_id, category_name, name, quantity, total_amount,
             category_total, rank
      FROM ranked
      WHERE rank <= ${perCategory}
      ORDER BY category_total DESC, category_name ASC, rank ASC
    `;
    const res = await this.db.query<{
      category_id: string;
      category_name: string;
      name: string;
      quantity: string | number;
      total_amount: string | number;
      category_total: string | number;
      rank: string | number;
    }>(sql, v);
    return res.rows.map((r) => ({
      categoryId: r.category_id,
      categoryName: r.category_name,
      name: r.name,
      quantity: Number(r.quantity),
      totalAmount: Number(r.total_amount),
      categoryTotal: Number(r.category_total),
      rank: Number(r.rank),
    }));
  }

  async getTransactions(params: {
    period?: 'TODAY' | 'WEEK' | 'MONTH';
    from?: string;
    to?: string;
    shiftId?: string;
    limit?: number;
  }) {
    const pConds: string[] = ['p.tenant_id = app_tenant_id()'];
    const pVals: any[] = [];
    let pIdx = 1;

    const cmConds: string[] = ['cm.tenant_id = app_tenant_id()'];
    const cmVals: any[] = [];
    let cmIdx = 1;

    if (params.shiftId) {
      pConds.push(`p.business_date = (SELECT business_date FROM shifts WHERE shift_id = $${pIdx++})`);
      pVals.push(params.shiftId);

      cmConds.push(`cm.shift_id = $${cmIdx++}`);
      cmVals.push(params.shiftId);
    } else if (params.from && params.to) {
      pConds.push(`p.paid_at::date BETWEEN $${pIdx++}::date AND $${pIdx++}::date`);
      pVals.push(params.from, params.to);

      cmConds.push(`cm.created_at::date BETWEEN $${cmIdx++}::date AND $${cmIdx++}::date`);
      cmVals.push(params.from, params.to);
    } else if (params.period === 'TODAY') {
      pConds.push(`p.paid_at::date = CURRENT_DATE`);
      cmConds.push(`cm.created_at::date = CURRENT_DATE`);
    } else if (params.period === 'WEEK') {
      pConds.push(`p.paid_at >= date_trunc('week', CURRENT_DATE)`);
      cmConds.push(`cm.created_at >= date_trunc('week', CURRENT_DATE)`);
    } else if (params.period === 'MONTH') {
      pConds.push(`p.paid_at >= date_trunc('month', CURRENT_DATE)`);
      cmConds.push(`cm.created_at >= date_trunc('month', CURRENT_DATE)`);
    }

    const limit = params.limit || 100;

    const sql = `
      WITH combined AS (
        SELECT p.payment_id::text AS id,
               'SALE' AS type,
               to_char(p.paid_at, 'HH24:MI') AS time,
               to_char(p.paid_at, 'YYYY-MM-DD') AS date,
               EXTRACT(EPOCH FROM p.paid_at) * 1000 AS timestamp,
               p.receipt_number AS bill_number,
               CONCAT('บิล #', p.receipt_number) AS description,
               CASE WHEN LOWER(p.payment_method) = 'cash' THEN p.total_amount ELSE 0 END AS cash_amount,
               CASE WHEN LOWER(p.payment_method) <> 'cash' THEN p.total_amount ELSE 0 END AS transfer_amount,
               CASE WHEN LOWER(p.payment_method) = 'cash' THEN 'CASH' ELSE 'TRANSFER' END AS payment_method,
               COALESCE(u.display_name, u.username, 'พนักงาน') AS performed_by,
               COALESCE(
                 (SELECT string_agg(DISTINCT 'โต๊ะ ' || t.table_number, ', ')
                  FROM payment_attempt_orders pao
                  JOIN orders o ON o.order_id = pao.order_id
                  JOIN dining_tables t ON t.table_id = o.table_id
                  WHERE pao.payment_attempt_id = p.payment_attempt_id),
                 'กลับบ้าน'
               ) AS table_name,
               p.subtotal,
               p.vat_amount AS vat,
               p.total_amount AS total,
               p.cash_received AS received,
               p.change_amount AS change
        FROM payments p
        LEFT JOIN users u ON u.users_id = p.processed_by
        WHERE ${pConds.join(' AND ')}

        UNION ALL

        SELECT cm.movement_id::text AS id,
               CASE WHEN cm.direction = 'in' THEN 'CASH_IN' ELSE 'CASH_OUT' END AS type,
               to_char(cm.created_at, 'HH24:MI') AS time,
               to_char(cm.created_at, 'YYYY-MM-DD') AS date,
               EXTRACT(EPOCH FROM cm.created_at) * 1000 AS timestamp,
               NULL AS bill_number,
               cm.reason AS description,
               CASE WHEN cm.direction = 'out' THEN -cm.amount ELSE cm.amount END AS cash_amount,
               0 AS transfer_amount,
               'CASH' AS payment_method,
               COALESCE(u.display_name, u.username, 'พนักงาน') AS performed_by,
               '-' AS table_name,
               NULL AS subtotal,
               NULL AS vat,
               NULL AS total,
               NULL AS received,
               NULL AS change
        FROM cash_movements cm
        LEFT JOIN users u ON u.users_id = cm.created_by
        WHERE ${cmConds.join(' AND ')}
      )
      SELECT * FROM combined
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    const allVals = [...pVals, ...cmVals];
    // Re-index parameter numbers in SQL
    let pCount = 1;
    const reindexedP = pConds.map(cond => cond.replace(/\$\d+/g, () => `$${pCount++}`));
    const reindexedCm = cmConds.map(cond => cond.replace(/\$\d+/g, () => `$${pCount++}`));

    const finalSql = `
      WITH combined AS (
        SELECT p.payment_id::text AS id,
               'SALE' AS type,
               to_char(p.paid_at, 'HH24:MI') AS time,
               to_char(p.paid_at, 'YYYY-MM-DD') AS date,
               EXTRACT(EPOCH FROM p.paid_at) * 1000 AS timestamp,
               p.receipt_number AS bill_number,
               CONCAT('บิล #', p.receipt_number) AS description,
               CASE WHEN LOWER(p.payment_method) = 'cash' THEN p.total_amount ELSE 0 END AS cash_amount,
               CASE WHEN LOWER(p.payment_method) <> 'cash' THEN p.total_amount ELSE 0 END AS transfer_amount,
               CASE WHEN LOWER(p.payment_method) = 'cash' THEN 'CASH' ELSE 'TRANSFER' END AS payment_method,
               COALESCE(u.display_name, u.username, 'พนักงาน') AS performed_by,
               COALESCE(
                 (SELECT string_agg(DISTINCT 'โต๊ะ ' || t.table_number, ', ')
                  FROM payment_attempt_orders pao
                  JOIN orders o ON o.order_id = pao.order_id
                  JOIN dining_tables t ON t.table_id = o.table_id
                  WHERE pao.payment_attempt_id = p.payment_attempt_id),
                 'กลับบ้าน'
               ) AS table_name,
               p.subtotal,
               p.vat_amount AS vat,
               p.total_amount AS total,
               p.cash_received AS received,
               p.change_amount AS change
        FROM payments p
        LEFT JOIN users u ON u.users_id = p.processed_by
        WHERE ${reindexedP.join(' AND ')}

        UNION ALL

        SELECT cm.movement_id::text AS id,
               CASE WHEN cm.direction = 'in' THEN 'CASH_IN' ELSE 'CASH_OUT' END AS type,
               to_char(cm.created_at, 'HH24:MI') AS time,
               to_char(cm.created_at, 'YYYY-MM-DD') AS date,
               EXTRACT(EPOCH FROM cm.created_at) * 1000 AS timestamp,
               NULL AS bill_number,
               cm.reason AS description,
               CASE WHEN cm.direction = 'out' THEN -cm.amount ELSE cm.amount END AS cash_amount,
               0 AS transfer_amount,
               'CASH' AS payment_method,
               COALESCE(u.display_name, u.username, 'พนักงาน') AS performed_by,
               '-' AS table_name,
               NULL AS subtotal,
               NULL AS vat,
               NULL AS total,
               NULL AS received,
               NULL AS change
        FROM cash_movements cm
        LEFT JOIN users u ON u.users_id = cm.created_by
        WHERE ${reindexedCm.join(' AND ')}
      )
      SELECT * FROM combined
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    const res = await this.db.query(finalSql, allVals);
    return res.rows.map(r => ({
      id: r.id,
      type: r.type,
      time: r.time,
      date: r.date,
      timestamp: Number(r.timestamp),
      billNumber: r.bill_number ? Number(r.bill_number.replace?.(/\D/g, '') || r.bill_number) : undefined,
      description: r.description,
      cashAmount: Number(r.cash_amount),
      transferAmount: Number(r.transfer_amount),
      paymentMethod: r.payment_method,
      performedBy: r.performed_by,
      table: r.table_name || 'กลับบ้าน',
      subtotal: r.subtotal ? Number(r.subtotal) : undefined,
      vat: r.vat ? Number(r.vat) : undefined,
      total: r.total ? Number(r.total) : undefined,
      received: r.received ? Number(r.received) : undefined,
      change: r.change ? Number(r.change) : undefined,
    }));
  }

  async getReceiptLines(paymentId: string) {
    const sql = `
      SELECT l.item_name_snapshot, l.gross_price, l.modifiers, l.is_comped,
             SUM(l.qty) AS qty, SUM(l.line_total) AS line_total
      FROM payments p
      JOIN payment_attempt_orders pao ON pao.payment_attempt_id = p.payment_attempt_id
      JOIN v_receipt_lines l ON l.order_id = pao.order_id
      WHERE p.payment_id = $1 AND p.tenant_id = app_tenant_id()
      GROUP BY l.item_name_snapshot, l.gross_price, l.modifiers, l.is_comped
      ORDER BY l.item_name_snapshot;
    `;
    const res = await this.db.query(sql, [paymentId]);
    return res.rows.map(l => ({
      name: l.item_name_snapshot,
      quantity: Number(l.qty),
      price: Number(l.gross_price),
      selectedAddons: l.modifiers
        ? l.modifiers.split(', ').filter(Boolean).map((m: string) => ({ name: m, price: 0 }))
        : [],
    }));
  }
}
