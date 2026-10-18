
const toNum = (v: string | null) => (v === null ? null : Number(v));

export interface ShiftResponse{
    shiftId: string;
    businessDate: string;
    openingCash: number;
    expectedClosingCash:number | null; 
    actualClosingCash:number | null;
    variance:number | null;
    status: string;
    openedBy: string;
    openedAt: Date;
    closedBy:string | null;
    closedAt:Date |null;
    verifiedBy:string|null;
    verifiedAt:Date|null;
    reopenCount: number;
}

export function toShiftResponse(row:any):ShiftResponse{
    return{
        shiftId: row.shift_id,
        businessDate: row.business_date,
        openingCash: Number(row.opening_cash),
        expectedClosingCash:toNum(row.expected_closing_cash),
        actualClosingCash:toNum(row.actual_closing_cash),
        variance:toNum(row.variance),
        status: row.status,
        openedBy: row.opened_by,
        openedAt: row.opened_at,
        closedBy:row.closed_by,
        closedAt:row.closed_at,
        verifiedBy:row.verified_by,
        verifiedAt:row.verified_at,
        reopenCount: row.reopen_count,
    };
}

export interface CashMovementResponse{
    movementId:string;
    shiftId:string;
    direction:string;
    amount:number;
    reason:string;
    createdBy:string;
    createdAt:Date;
}

export function toCashMovementResponse(row:any):CashMovementResponse{
    return{
        movementId:row.movement_id,
        shiftId:row.shift_id,
        direction:row.direction,
        amount:Number(row.amount),
        reason:row.reason,
        createdBy:row.created_by,
        createdAt:row.created_at,
    }
}

export function toCashBookResponse(day: any, summary: any, entries: any[]) {
  return {
    businessDate: day.business_date,
    shift: { shiftId: day.shift_id, status: day.status },
    summary: {
      cashOnHand: Number(summary.cash_on_hand),
      cashSales: Number(summary.cash_sales),
      transferSales: Number(summary.transfer_sales),
    },
    entries: entries.map((e) => ({
      at: e.at,
      type: e.type,
      cashAmount: Number(e.cash_amount),
      transferAmount: Number(e.transfer_amount),
      detail: e.detail,
      by: { id: e.by_id, name: e.by_name },
    })),
  };
}