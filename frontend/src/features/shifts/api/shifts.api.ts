import { apiFetch } from '../../../libs/appClient';
import type { ApiEnvelope, Shift } from '../types/shift.types';

export const shiftsApi = {
  getCurrent: (token: string | null) =>
    apiFetch<ApiEnvelope<Shift | null>>('/shifts/current', token),

  open: (token: string | null, openingCash: number) =>
    apiFetch<ApiEnvelope<Shift>>('/shifts/open', token, 'POST', { openingCash }),

  close: (token: string | null, shiftId: string, actualClosingCash: number) =>
    apiFetch<ApiEnvelope<Shift>>(`/shifts/${shiftId}/close`, token, 'POST', {
      actualClosingCash,
    }),

  // PIN ของผู้จัดการ/เจ้าของร้านคนใดก็ได้ในร้าน — server เป็นคนตัดสินว่าใครรับรอง
  verify: (token: string | null, shiftId: string, pin: string) =>
    apiFetch<ApiEnvelope<Shift>>(`/shifts/${shiftId}/verify`, token, 'POST', { pin }),
};
