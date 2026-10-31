import { ConflictException, HttpException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OrdersService } from './orders.service';

jest.mock('bcrypt');

const compareMock = bcrypt.compare as unknown as jest.Mock<
  Promise<boolean>,
  [string, string]
>;

type MockRepo = Record<string, jest.Mock>;

type CloseUnpaidArgs = [
  string,
  { closeReason: string; note?: string; approverPin: string },
  string,
];

function closeUnpaidArgs(repo: MockRepo): CloseUnpaidArgs {
  return repo.closeUnpaid.mock.calls[0] as CloseUnpaidArgs;
}

describe('OrdersService — ยกเลิกทั้งบิล / ปิดบิลโดยไม่เก็บเงิน', () => {
  const APPROVER = {
    users_id: '11111111-1111-1111-1111-111111111111',
    display_name: 'ผู้จัดการทดสอบ',
    pin_hash: 'hash',
  };
  const ORDER_ROW = {
    order_id: '22222222-2222-2222-2222-222222222222',
    table_id: '33333333-3333-3333-3333-333333333333',
    closed_at: null,
    payment_id: null,
  };

  let repo: MockRepo;
  let users: MockRepo;
  let service: OrdersService;

  beforeEach(() => {
    repo = {
      findPinApprovers: jest.fn().mockResolvedValue([APPROVER]),
      lockOrderForUpdate: jest.fn().mockResolvedValue(ORDER_ROW),
      findOpenPaymentAttempt: jest.fn().mockResolvedValue(null),
      countNonVoidedItems: jest
        .fn()
        .mockResolvedValue({ total: 2, blocked: 0 }),
      voidAllItems: jest.fn().mockResolvedValue(2),
      closeUnpaid: jest
        .fn()
        .mockResolvedValue({ ...ORDER_ROW, close_reason: 'voided_all' }),
      hasPermission: jest.fn().mockResolvedValue(true),
    };
    users = {
      getPinLockState: jest.fn().mockResolvedValue(null),
      recordPinFailureDurable: jest
        .fn()
        .mockResolvedValue({ pin_locked_until: null }),
      clearPinFailuresForUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new OrdersService(repo as never, users as never);
    compareMock.mockResolvedValue(true);
  });

  it('cancelOrder: void ทุกใบแล้วปิดบิล voided_all โดย closed_by = ผู้อนุมัติ', async () => {
    const res = await service.cancelOrder(
      ORDER_ROW.order_id,
      { approverPin: '246810', reason: 'ลูกค้าเปลี่ยนใจ' },
      'requester-1',
    );

    expect(repo.voidAllItems).toHaveBeenCalledWith(
      ORDER_ROW.order_id,
      APPROVER.users_id,
      'ลูกค้าเปลี่ยนใจ',
    );
    const args = closeUnpaidArgs(repo);
    expect(args[1].closeReason).toBe('voided_all');
    expect(args[2]).toBe(APPROVER.users_id);
    expect(res.data.voidedCount).toBe(2);
    expect(res.data.approvedBy.usersId).toBe(APPROVER.users_id);
  });

  it('cancelOrder: บิลไม่มีรายการ → ปิดเป็น empty และไม่ void อะไร', async () => {
    repo.countNonVoidedItems.mockResolvedValue({ total: 0, blocked: 0 });

    const res = await service.cancelOrder(
      ORDER_ROW.order_id,
      { approverPin: '246810', reason: 'เปิดโต๊ะผิด' },
      'requester-1',
    );

    expect(repo.voidAllItems).not.toHaveBeenCalled();
    expect(closeUnpaidArgs(repo)[1].closeReason).toBe('empty');
    expect(res.data.voidedCount).toBe(0);
  });

  it('cancelOrder: มีรายการเสิร์ฟแล้ว → 409 ORDER_HAS_SERVED_ITEMS และไม่แตะบิล', async () => {
    repo.countNonVoidedItems.mockResolvedValue({ total: 2, blocked: 1 });

    await expect(
      service.cancelOrder(
        ORDER_ROW.order_id,
        { approverPin: '246810', reason: 'เปลี่ยนใจ' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'ORDER_HAS_SERVED_ITEMS' } });

    expect(repo.voidAllItems).not.toHaveBeenCalled();
    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('cancelOrder: มี payment attempt เปิดอยู่ → 409 PAYMENT_ATTEMPT_OPEN', async () => {
    repo.findOpenPaymentAttempt.mockResolvedValue({
      payment_attempt_id: 'pa-1',
    });

    await expect(
      service.cancelOrder(
        ORDER_ROW.order_id,
        { approverPin: '246810', reason: 'เปลี่ยนใจ' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'PAYMENT_ATTEMPT_OPEN' } });

    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('cancelOrder: ผู้อนุมัติไม่มี void:approve → 409 APPROVER_LACKS_VOID', async () => {
    repo.hasPermission.mockResolvedValue(false);

    await expect(
      service.cancelOrder(
        ORDER_ROW.order_id,
        { approverPin: '246810', reason: 'เปลี่ยนใจ' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'APPROVER_LACKS_VOID' } });

    expect(repo.voidAllItems).not.toHaveBeenCalled();
  });

  it('cancelOrder: มีรายการใหม่แทรกเข้ามา → 409 ORDER_CHANGED (ไม่ปิดบิลครึ่งทาง)', async () => {
    repo.voidAllItems.mockResolvedValue(1);

    await expect(
      service.cancelOrder(
        ORDER_ROW.order_id,
        { approverPin: '246810', reason: 'เปลี่ยนใจ' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { code: 'ORDER_CHANGED' } });

    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('cancelOrder: PIN ผิด → 403 และไม่แตะบิล', async () => {
    compareMock.mockResolvedValue(false);

    await expect(
      service.cancelOrder(
        ORDER_ROW.order_id,
        { approverPin: '999999', reason: 'เปลี่ยนใจ' },
        'requester-1',
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(repo.lockOrderForUpdate).not.toHaveBeenCalled();
    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('closeUnpaid: walkout ที่มีรายการแต่ไม่ส่ง note → 400', async () => {
    await expect(
      service.closeUnpaid(
        ORDER_ROW.order_id,
        { closeReason: 'walkout', approverPin: '246810' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { statusCode: 400 } });

    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('closeUnpaid: walkout + note → ปิดบิลด้วย closed_by = ผู้อนุมัติ', async () => {
    await service.closeUnpaid(
      ORDER_ROW.order_id,
      { closeReason: 'walkout', approverPin: '246810', note: 'ลูกค้าหนี' },
      'requester-1',
    );

    const args = closeUnpaidArgs(repo);
    expect(args[2]).toBe(APPROVER.users_id);
    expect(args[1]).toMatchObject({
      closeReason: 'walkout',
      note: 'ลูกค้าหนี',
    });
  });

  it('closeUnpaid: บิลปิดแล้ว → 404 และไม่เรียกซ้ำ', async () => {
    repo.lockOrderForUpdate.mockResolvedValue({
      ...ORDER_ROW,
      closed_at: new Date(),
    });

    await expect(
      service.closeUnpaid(
        ORDER_ROW.order_id,
        { closeReason: 'walkout', approverPin: '246810', note: 'x' },
        'requester-1',
      ),
    ).rejects.toMatchObject({ response: { statusCode: 404 } });

    expect(repo.closeUnpaid).not.toHaveBeenCalled();
  });

  it('mapCloseError: trigger บอกว่ายังมีรายการค้าง → 409 ORDER_HAS_ITEMS', async () => {
    const pgError = Object.assign(
      new Error('cannot close as voided_all while non-voided items exist'),
      { code: 'P0001' },
    );
    repo.closeUnpaid.mockRejectedValue(pgError);

    await expect(
      service.closeUnpaid(
        ORDER_ROW.order_id,
        { closeReason: 'voided_all', approverPin: '246810' },
        'requester-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
