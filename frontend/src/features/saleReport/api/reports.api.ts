import { apiFetch } from '../../../libs/appClient';
import type { ApiEnvelope } from '../../shifts/types/shift.types';

export type Period = 'TODAY' | 'WEEK' | 'MONTH';

export interface ReportQueryParams {
  period?: Period;
  from?: string;
  to?: string;
  shiftId?: string;
}

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

function buildQueryString(params: ReportQueryParams): string {
  const q = new URLSearchParams();
  if (params.shiftId) {
    q.set('shiftId', params.shiftId);
  } else if (params.from && params.to) {
    q.set('from', params.from);
    q.set('to', params.to);
  } else if (params.period) {
    q.set('period', params.period);
  } else {
    q.set('period', 'WEEK');
  }
  return q.toString();
}

export const reportsApi = {
  getSummary: (token: string | null, params: ReportQueryParams = { period: 'WEEK' }) =>
    apiFetch<ApiEnvelope<any>>(`/reports/sales/summary?${buildQueryString(params)}`, token),
  getByPeriod: (token: string | null, params: ReportQueryParams = { period: 'WEEK' }) =>
    apiFetch<ApiEnvelope<any[]>>(`/reports/sales/by-period?${buildQueryString(params)}`, token),
  getTopItems: (token: string | null, params: ReportQueryParams = { period: 'WEEK' }) =>
    apiFetch<ApiEnvelope<TopSellingCategoryRes[]>>(`/reports/sales/top-items?${buildQueryString(params)}`, token),
  getTransactions: (token: string | null, params: ReportQueryParams = { period: 'WEEK' }) =>
    apiFetch<ApiEnvelope<any[]>>(`/reports/sales/transactions?${buildQueryString(params)}`, token),
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
