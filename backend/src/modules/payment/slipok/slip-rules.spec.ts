import {
  maskedEquals,
  matchReceiver,
  mapSlipOkError,
  slipTransAt,
} from './slip-rules';
import type { SlipOkSlip } from './slipok.client';

const slip = (
  receiver: SlipOkSlip['receiver'],
  extra: Partial<SlipOkSlip> = {},
): SlipOkSlip => ({
  transRef: 'REF1',
  amount: 100,
  receiver,
  ...extra,
});

describe('slip-rules', () => {
  describe('maskedEquals', () => {
    it('เทียบตำแหน่งตัวเลขที่เปิดเผย', () => {
      expect(maskedEquals('081-xxx-5678', '0812345678')).toBe(true);
      expect(maskedEquals('XXX-XXX-5678', '0812345678')).toBe(true);
      expect(maskedEquals('081-xxx-5679', '0812345678')).toBe(false);
    });
    it('ความยาวต้องเท่ากัน และต้องเห็นอย่างน้อย 3 หลัก', () => {
      expect(maskedEquals('xxx-5678', '0812345678')).toBe(false);
      expect(maskedEquals('xxxxxxxx78', '0812345678')).toBe(false);
    });
  });

  describe('matchReceiver', () => {
    it('พร้อมเพย์เบอร์โทรตรง (รวมรูปแบบ 66)', () => {
      expect(
        matchReceiver(slip({ proxy: { value: '081xxx5678' } }), '0812345678'),
      ).toBe('matched');
      expect(
        matchReceiver(
          slip({ proxy: { value: 'xxx-xxx-xx5678' } }),
          '081-234-5678',
        ),
      ).toBe('mismatch');
      expect(
        matchReceiver(slip({ proxy: { value: '66812xxx678' } }), '0812345678'),
      ).toBe('matched');
    });
    it('เลขบัตรประชาชน', () => {
      expect(
        matchReceiver(
          slip({ proxy: { value: 'x-xxxx-xxxx1-23-4' } }),
          '1234567890123',
        ),
      ).toBe('mismatch');
      expect(
        matchReceiver(
          slip({ proxy: { value: 'x-xxxx-xxxx0-12-3' } }),
          '1234567890123',
        ),
      ).toBe('matched');
    });
    it('ไม่ตรง = mismatch, ไม่มี proxy = unverifiable', () => {
      expect(
        matchReceiver(slip({ proxy: { value: '089xxx0000' } }), '0812345678'),
      ).toBe('mismatch');
      expect(
        matchReceiver(
          slip({ proxy: { value: '' }, account: { value: 'xxx-x-x3109-x' } }),
          '0812345678',
        ),
      ).toBe('unverifiable');
      expect(matchReceiver(slip(undefined), '0812345678')).toBe('unverifiable');
    });
  });

  describe('slipTransAt', () => {
    it('ใช้ transTimestamp ก่อน', () => {
      expect(
        slipTransAt(
          slip(undefined, { transTimestamp: '2020-04-01T03:15:07.000Z' }),
        )?.toISOString(),
      ).toBe('2020-04-01T03:15:07.000Z');
    });
    it('ประกอบจาก transDate + transTime เป็นเวลาไทย', () => {
      expect(
        slipTransAt(
          slip(undefined, { transDate: '20200401', transTime: '10:15:07' }),
        )?.toISOString(),
      ).toBe('2020-04-01T03:15:07.000Z');
    });
    it('ไม่มีข้อมูล = null', () => {
      expect(slipTransAt(slip(undefined))).toBeNull();
    });
  });

  describe('mapSlipOkError', () => {
    it('แยกสลิปผิดกับบริการล่ม', () => {
      expect(mapSlipOkError(1013, '').code).toBe('SLIP_AMOUNT_MISMATCH');
      expect(mapSlipOkError(1011, '').result).toBe('rejected');
      expect(mapSlipOkError(1004, '').code).toBe('SLIPOK_ACCOUNT_ERROR');
      expect(mapSlipOkError(null, '').code).toBe('SLIPOK_UNAVAILABLE');
      expect(mapSlipOkError(null, '').status).toBe(503);
    });
    it('1010 ใช้ข้อความจาก SlipOK ที่บอกเวลารอ', () => {
      expect(mapSlipOkError(1010, 'รอประมาณ 8 นาที').message).toBe(
        'รอประมาณ 8 นาที',
      );
    });
  });
});
