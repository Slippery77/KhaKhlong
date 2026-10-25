import { Injectable } from "@nestjs/common";
import { DbContextService } from "../../database/db-context.service";

const paymentAttempt_cols = `payment_attempt_id, payment_method, amount, status,
          qr_reference, failure_reason, initiated_by, created_at, updated_at`;
const payment_cols = `payment_id, payment_attempt_id, receipt_number, business_date::text AS business_date, subtotal, vat_amount, service_charge_amount, total_amount, vat_mode, payment_method, cash_received,change_amount,paid_at`

@Injectable()
export class PaymentRepository{
    constructor(private readonly db:DbContextService){}

    async listAttemptById(id:string){
        const sql = `
            SELECT ${paymentAttempt_cols}
            FROM payment_attempts
            WHERE payment_attempt_id = $1;
        `;
        const result = await this.db.query(sql,[id])
        return result.rows[0]??null
    }

      async findOrders(id:string[]){
        const sql = `
            SELECT order_id, closed_at 
            FROM orders
            WHERE order_id = any($1::uuid[])
        `;
        const result = await this.db.query(sql,[id]);
        return result.rows;
    }

    async findOpenAttempt(orderId:string[]){
        const sql = `
            SELECT DISTINCT payment_attempt_id
            FROM payment_attempt_orders
            WHERE order_id = any($1::uuid[]) and is_open 
        `
        const result = await this.db.query(sql,[orderId])
        return result.rows;
    }

    async createPaymentAttempt(paymentMethod:string,amount:number,userId:string){
        const sql =`
            INSERT INTO payment_attempts(tenant_id,payment_method, amount, initiated_by)
            VALUES (app_tenant_id(), $1,$2,$3)
            RETURNING ${paymentAttempt_cols}
            `;
        const result = await this.db.query(sql,[paymentMethod,amount,userId])
        return result.rows[0]
    }

    async linkOrders(attemptId:string,orderIds:string[]){
        const sql =`
            INSERT INTO payment_attempt_orders(tenant_id,payment_attempt_id,order_id)
            SELECT app_tenant_id(),$1,unnest($2::uuid[])
        `;
        const result=  await this.db.query(sql,[attemptId,orderIds])
        return result.rows[0]??null;
    }

    async computeAmount(orderId:string[]){
        const sql =`
            SELECT COALESCE(SUM(line_total),0) as gross, COUNT(*) as item_count
            FROM v_order_item_totals
            where order_id = any($1::uuid[]) and status<>'voided'
        `;
        const result = await this.db.query(sql,[orderId])
        return Number(result.rows[0].gross);
    }

    /**
     * ยอดรวมของบิลเดียวก่อนเริ่มชำระเงิน (อ่านอย่างเดียว)
     * ใช้สูตรเดียวกับ computeAmount เพื่อให้ยอดที่แสดงก่อนจ่ายตรงกับ attempt.amount
     */
    async computeOrderSummary(orderId:string){
        const sql = `
            SELECT COALESCE(SUM(line_total), 0) AS amount,
                   COUNT(*) AS item_count
            FROM v_order_item_totals
            WHERE order_id = $1
              AND tenant_id = app_tenant_id()
              AND status <> 'voided'
        `;
        const result = await this.db.query(sql,[orderId])
        const row = result.rows[0]
        return {
            amount: Number(row?.amount ?? 0),
            itemCount: Number(row?.item_count ?? 0),
        }
    }

    async lockAttempt(id:string){
        const sql = `
            SELECT ${paymentAttempt_cols}
            FROM payment_attempts
            WHERE payment_attempt_id = $1
            FOR UPDATE
        `;
        const result = await this.db.query(sql,[id]);
        return result.rows[0]??null;
    }

    async findPaymentByAttempt(id:string){
        const sql = `
            SELECT ${payment_cols}
            FROM payments
            WHERE payment_attempt_id = $1
        `;
        const result =await this.db.query(sql,[id]);
        return result.rows[0]??null
    }

    async markAttemptSuccess(id:string){
        const sql=`
            UPDATE payment_attempts
            SET status = 'success'
            WHERE payment_attempt_id = $1 and status = 'pending';
        `;
        const result = await this.db.query(sql,[id])
        return result.rows[0]
    }

    async insertPayment(id:string,subtotal:number,service_charge_amount:number,total_amount:number,payment_method:string,cashReceived:number|null,userId:string){
        const sql = `
            INSERT INTO payments(tenant_id, payment_attempt_id, subtotal, service_charge_amount,
                        total_amount, payment_method, cash_received, processed_by)
            VALUES (app_tenant_id(), $1,$2,$3,$4,$5,$6,$7)
            RETURNING ${payment_cols}
        `;
        const result= await this.db.query(sql,[id,subtotal,service_charge_amount,total_amount,payment_method,cashReceived,userId]);
        return result.rows[0];
    }

    async computeGrossByAttempt(paymentAttemptId:string){
        const sql =`
            SELECT COALESCE(SUM(t.line_total), 0) AS gross
            FROM payment_attempt_orders p
            JOIN v_order_item_totals t ON t.order_id = p.order_id AND t.status != 'voided'
            WHERE p.payment_attempt_id = $1;
        `;
        const result = await this.db.query(sql,[paymentAttemptId])
        return Number(result.rows[0].gross)
    }

    async cancleAttempt(paymentAttemptId:string,reason:string){
        const sql =`
            UPDATE payment_attempts
            SET status = 'failed', failure_reason = $2 
            WHERE payment_attempt_id = $1 and status ='pending'
            RETURNING ${paymentAttempt_cols}
        `;
        const result = await this.db.query(sql,[paymentAttemptId,reason])
        return result.rows[0]
    }

    //ใช้ทำ receipt เพือหาข้อมูลของแต่ละอันมาประกอบใน receipt
    async findPaymentForReceipt(paymentId: string) {
        const sql = `
            SELECT ${payment_cols}, u.display_name AS cashier_name
            FROM payments p
            JOIN users u ON u.users_id = p.processed_by
            WHERE p.payment_id = $1`;
        const result = await this.db.query(sql, [paymentId]);
        return result.rows[0] ?? null;
    }

    async findStore() {
        const sql = `
            SELECT restaurant_name, phone, tax_id, house_number, moo, soi, road,
                subdistrict, district, province, postal_code
            FROM tenants WHERE tenant_id = app_tenant_id()`;
        const result = await this.db.query(sql);
        return result.rows[0];
    }

    async findReceiptTables(paymentId: string) {
        const sql = `
            SELECT o.order_number, t.table_number
            FROM payments p
            JOIN payment_attempt_orders pao ON pao.payment_attempt_id = p.payment_attempt_id
            JOIN orders o ON o.order_id = pao.order_id
            JOIN dining_tables t ON t.table_id = o.table_id
            WHERE p.payment_id = $1
            ORDER BY o.order_number`;
        const result = await this.db.query(sql, [paymentId]);
        return result.rows;
    }
    // getReceiptLines = getReciept เดิม แต่ return result.rows

    async getReceiptLines(paymentId:string){
        const sql = `
             SELECT l.item_name_snapshot, l.gross_price, l.modifiers, l.is_comped,
                SUM(l.qty) AS qty, SUM(l.line_total) AS line_total
            FROM payments p
            JOIN payment_attempt_orders pao ON pao.payment_attempt_id = p.payment_attempt_id
            JOIN v_receipt_lines l ON l.order_id = pao.order_id
            WHERE p.payment_id = $1
            GROUP BY l.item_name_snapshot, l.gross_price, l.modifiers, l.is_comped
            ORDER BY l.item_name_snapshot;
        `
        const result = await this.db.query(sql,[paymentId]);
        return result.rows
    }

    async printReceipt(paymentId:string, userId:string){
        await this.db.query(
            `
            INSERT INTO receipt_print_logs(tenant_id,payment_id,printed_by)
            VALUES (app_tenant_id() , $1, $2)
            `,
            [paymentId,userId]
        )

        const sql = `
            SELECT count(*) as print_count
            FROM receipt_print_logs
            WHERE payment_id = $1 
        `;
        const result = await this.db.query(sql,[paymentId]);
        return Number(result.rows[0].print_count)
    } 
}