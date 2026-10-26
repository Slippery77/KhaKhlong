import { apiFetch } from '../../../libs/appClient';
import type { ApiEnvelope } from '../../shifts/types/shift.types';

export type Period = 'TODAY' | 'WEEK' | 'MONTH';

export interface TopSellingItemRes {
  name: string;
  quantity: number;
  totalAmount: number;
  percentage: number;
}

export interface TopSellingCategoryRes {
  categoryId: string;
  categoryName: string;
  categoryTotal: number;
  items: TopSellingItemRes[];
}

export interface CreateCashMovementPayload {
  movementId?: string;
  direction: 'in' | 'out';
  amount: number;
  reason: string;
}

export const reportsApi = {
  getSummary: (token: string | null, period: Period = 'WEEK') =>
    apiFetch<ApiEnvelope<any>>(`/reports/sales/summary?period=${period}`, token),
  getByPeriod: (token: string | null, period: Period = 'WEEK') =>
    apiFetch<ApiEnvelope<any[]>>(`/reports/sales/by-period?period=${period}`, token),
  getTopItems: (token: string | null, period: Period = 'WEEK') =>
    apiFetch<ApiEnvelope<TopSellingCategoryRes[]>>(`/reports/sales/top-items?period=${period}`, token),
  getTransactions: (token: string | null, period: Period = 'WEEK') =>
    apiFetch<ApiEnvelope<any[]>>(`/reports/sales/transactions?period=${period}`, token),
  getReceiptLines: (token: string | null, paymentId: string) =>
    apiFetch<ApiEnvelope<any[]>>(`/reports/sales/receipt/${paymentId}`, token),
  createCashMovement: (token: string | null, data: CreateCashMovementPayload) =>
    apiFetch<ApiEnvelope<any>>('/cash-movements', token, 'POST', {
      movementId: data.movementId || crypto.randomUUID(),
      direction: data.direction,
      amount: data.amount,
      reason: data.reason,
    }),
};
