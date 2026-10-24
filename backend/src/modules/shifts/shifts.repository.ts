import { Injectable } from "@nestjs/common";
import { DbContextService } from "../../database/db-context.service";

const SHIFT_COLS =`shift_id, business_date::text AS business_date, status,
                   opening_cash, expected_closing_cash, actual_closing_cash, variance,
                   opened_by, opened_at, closed_by, closed_at, reopen_count, verified_by, verified_at`;

@Injectable()
export class ShiftsRepository{
    constructor( private readonly db:DbContextService){}

    async openShift(opening_cash:number,userId:string){
        const sql =`
            INSERT INTO shifts (tenant_id,opening_cash,opened_by)
            VALUES (app_tenant_id(),$1,$2)
            RETURNING ${SHIFT_COLS};
        `;
        const result=  await this.db.query(sql,[opening_cash,userId]);
        return result.rows[0];
    }

    async getCurrentShift(){
        const sql = `
            SELECT ${SHIFT_COLS}
            FROM shifts
            WHERE business_date = compute_business_date(app_tenant_id());
        `;
        const result = await this.db.query(sql);
        return result.rows[0]??null;
    }
    
    async getShiftStatusForUpdate(shiftId:string){
        const sql=`
            SELECT status
            FROM shifts
            WHERE shift_id = $1
            FOR UPDATE;
        `;
        const result = await this.db.query(sql,[shiftId]);
        return result.rows[0]??null;
    }

    async closingShift(actual_closing_cash:number,closed_by:string,shiftId:string,){
        const sql =`
            UPDATE shifts 
            SET actual_closing_cash = $1, closed_by = $2
            WHERE shift_id = $3
            RETURNING ${SHIFT_COLS};
        `;
        const result = await this.db.query(sql,[actual_closing_cash,closed_by,shiftId])
        return result.rows[0]??null;
    }

    async createCashMovement(movementId:string,shift_id:string, direction:string, amount:number, reason:string, create_by:string){
        const sql = `
            INSERT INTO cash_movements(movement_id, tenant_id, shift_id, direction, amount, reason, created_by)
            VALUES($1,app_tenant_id(),$2,$3,$4,$5,$6)
            ON CONFLICT(movement_id) DO NOTHING
            RETURNING movement_id, shift_id, direction, amount, reason, created_by, created_at;
        `;
        const result = await this.db.query(sql,[movementId,shift_id,direction,amount,reason,create_by]);
        return result.rows[0]??null;
    }

    async findCashMovement(movementId:string){
        const sql= `
            SELECT movement_id, shift_id, direction, amount, reason, created_by, created_at
            FROM cash_movements 
            WHERE movement_id = $1;
        `;
        const result = await this.db.query(sql,[movementId]);
        return result.rows[0]??null;
    }

    async findDateAndShift(date:string|null){
        const sql=`
            SELECT d.business_date::text AS business_date,s.shift_id, s.status
            FROM (SELECT COALESCE($1::date, compute_business_date(app_tenant_id())) AS business_date) d
            LEFT JOIN shifts s ON s.business_date = d.business_date;
        `;
        const result = await this.db.query(sql,[date]);
        return result.rows[0]??null;
    }

    async listTransaction(date:string|null,shiftId:string){
        const sql=`
            SELECT p.paid_at AS at, 'sale' AS type,
                CASE WHEN p.payment_method = 'cash'    THEN p.total_amount ELSE 0 END AS cash_amount,
                CASE WHEN p.payment_method = 'qr_code' THEN p.total_amount ELSE 0 END AS transfer_amount,
                'ใบเสร็จ ' || p.receipt_number AS detail,
                u.users_id AS by_id, u.display_name AS by_name
            FROM payments p
            JOIN users u ON u.users_id = p.processed_by
            WHERE p.business_date = $1
            UNION ALL
            SELECT m.created_at,
                CASE m.direction WHEN 'in' THEN 'cash_in' ELSE 'cash_out' END,
                CASE m.direction WHEN 'in' THEN m.amount ELSE -m.amount END,
                0,
                m.reason,
                u.users_id, u.display_name
            FROM cash_movements m
            JOIN users u ON u.users_id = m.created_by
            WHERE m.shift_id = $2
            ORDER BY at;
        `;
        const result = await this.db.query(sql,[date,shiftId]);
        return result.rows;
    }

    async findCashbookSummary(date:string|null, shiftID:string){
        const sql = `
            SELECT
        (SELECT COALESCE(SUM(total_amount), 0) FROM payments
            WHERE business_date = $1 AND payment_method = 'cash') AS cash_sales,
        (SELECT COALESCE(SUM(total_amount), 0) FROM payments
            WHERE business_date = $1 AND payment_method = 'qr_code') AS transfer_sales,
        (SELECT opening_cash FROM shifts WHERE shift_id = $2)
        + (SELECT COALESCE(SUM(total_amount), 0) FROM payments
            WHERE business_date = $1 AND payment_method = 'cash')
        + (SELECT COALESCE(SUM(CASE direction WHEN 'in' THEN amount ELSE -amount END), 0)
            FROM cash_movements WHERE shift_id = $2) AS cash_on_hand;
        `;
        const result = await this.db.query(sql,[date,shiftID]);
        return result.rows[0]??null;
    }

    async reopenShift(shiftId:string, userId:string, reason:string){
        await this.db.query(`SELECT reopen_shift($1, $2, $3)`, [shiftId,userId,reason]);
        const result = await this.db.query(`SELECT ${SHIFT_COLS} FROM shifts WHERE shift_id = $1;`, [shiftId]);
        return result.rows[0]??null;
    }

    // ผู้ที่กรอก PIN รับรองยอดได้: ผู้ใช้ที่ยัง active มีสิทธิ์ shift:verify และมี PIN
    async findPinVerifiers(){
        const sql = `
            SELECT u.users_id, u.pin_hash
            FROM users u
            JOIN role_permissions rp ON rp.role_id = u.role_id
            JOIN permissions p ON p.permission_id = rp.permission_id
            WHERE p.permission_key = 'shift:verify'
              AND u.pin_hash IS NOT NULL
              AND u.is_active
              AND (u.pin_locked_until IS NULL OR u.pin_locked_until <= now());
        `;
        const result = await this.db.query(sql);
        return result.rows as { users_id: string; pin_hash: string }[];
    }

    async verifyShift(shiftId:string, userId:string){
        const sql = `
            UPDATE shifts
            SET status = 'verified' , verified_by = $2
            WHERE shift_id = $1
            RETURNING ${SHIFT_COLS};
        `;
        const result = await this.db.query(sql,[shiftId,userId]);
        return result.rows[0]??null;
    }
    async listShift(from: string | null, to: string | null, status: string | null, limit: number, offset: number){
        const sql =`
            SELECT ${SHIFT_COLS}
            FROM shifts
            WHERE ($1::date IS NULL OR business_date >= $1::date)
            AND ($2::date IS NULL OR business_date <= $2::date)
            AND ($3::text IS NULL OR status = $3)
            ORDER BY business_date DESC
            LIMIT $4 OFFSET $5;
        `;
        const result = await this.db.query(sql,[from,to,status,limit,offset]);
        return result.rows;
    }
}