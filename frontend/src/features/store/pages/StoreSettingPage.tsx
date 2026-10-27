import { useCallback, useEffect, useState, useMemo } from 'react';
import { ArrowLeft, CheckCircle2, Info, QrCode, Save, Smartphone, Store } from 'lucide-react';
import Header from '../../../components/Header';
import SettingNavBar from '../../../components/settingNavBar';
import { useAuth } from '../../auth/context/AuthContext';
import { apiFetch } from '../../../libs/appClient';
import { getDistricts, getProvinces, getSubdistricts, getZipCode } from '../../../data/thailandAddress';
import { QRCodeSVG } from 'qrcode.react';
import generatePayload from 'promptpay-qr';

interface StoreInfo {
  tenant_id: string;
  restaurant_name: string;
  phone: string | null;
  house_number: string | null;
  moo: string | null;
  soi: string | null;
  road: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  tax_id:string|null
  promptpay_id:string|null;
}

interface StoreResponse {
  status: string;
  data: StoreInfo;
}

interface FormState {
  restaurant_name: string;
  phone: string;
  house_number: string;
  moo: string;
  soi: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  postal_code: string;
  tax_id:string;
  promptpay_id:string;
}

const initialForm: FormState = {
  restaurant_name: '',
  phone: '',
  house_number: '',
  moo: '',
  soi: '',
  road: '',
  subdistrict: '',
  district: '',
  province: '',
  postal_code: '',
  promptpay_id:'',
  tax_id:'',
};

const provinces = getProvinces();

/** จัดรูปแบบเบอร์พร้อมเพย์เป็น 0XX-XXX-XXXX เพื่อให้อ่านง่าย (เก็บจริงเป็นตัวเลขล้วน) */
const formatPromptPay = (digits: string) => {
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export default function StoreSettingPage() {
  const { accessToken, user: currentUser } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // โฟกัสอยู่ = แสดงตัวเลขล้วน (ไม่แทรกขีด) เพื่อไม่ให้ caret กระโดดตอนพิมพ์
  const [isPromptPayFocused, setIsPromptPayFocused] = useState(false);

  const canConfigure = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  const districts = form.province ? getDistricts(form.province) : [];
  const subdistricts = form.province && form.district ? getSubdistricts(form.province, form.district) : [];

  const ppDigits = form.promptpay_id.replace(/\D/g, '').slice(0, 10);
  const isPromptPayValid = /^0\d{9}$/.test(ppDigits);
  const promptPayError =
    ppDigits.length === 10 && !isPromptPayValid
      ? 'เบอร์พร้อมเพย์ต้องเริ่มต้นด้วย 0 และมี 10 หลัก'
      : null;
  const promptPayHint =
    ppDigits.length > 0 && ppDigits.length < 10
      ? `กรอกอีก ${10 - ppDigits.length} หลัก`
      : 'ตัวเลข 10 หลัก ไม่ต้องใส่ขีด';
  const ppPayload = useMemo(
    () => (isPromptPayValid ? generatePayload(ppDigits, {}) : null),
    [isPromptPayValid, ppDigits],
  );
  const loadStore = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StoreResponse>('/store', accessToken);
      const data = res.data;
      setForm({
        restaurant_name: data.restaurant_name ?? '',
        phone: data.phone ?? '',
        house_number: data.house_number ?? '',
        moo: data.moo ?? '',
        soi: data.soi ?? '',
        road: data.road ?? '',
        subdistrict: data.subdistrict ?? '',
        district: data.district ?? '',
        province: data.province ?? '',
        postal_code: data.postal_code ?? '',
        tax_id:data.tax_id ?? '',
        promptpay_id:data.promptpay_id ?? '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลร้านไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
  };

  // รับเฉพาะตัวเลข 10 หลัก (รองรับการวางเบอร์ที่มีขีด/ช่องว่าง)
  const handlePromptPayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, promptpay_id: digits }));
    setSuccess(null);
  };

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, province: e.target.value, district: '', subdistrict: '', postal_code: '' }));
    setSuccess(null);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, district: e.target.value, subdistrict: '', postal_code: '' }));
    setSuccess(null);
  };

  const handleSubdistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subdistrict = e.target.value;
    const zip = form.province && form.district ? getZipCode(form.province, form.district, subdistrict) : '';
    setForm((prev) => ({ ...prev, subdistrict, postal_code: zip }));
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfigure) {
      setError('คุณไม่มีสิทธิ์แก้ไขข้อมูลร้าน');
      return;
    }
    // กันไม่ให้ยิง API ด้วยเบอร์ที่ผิดรูปแบบ (DB มี CHECK constraint อยู่แล้ว)
    if (ppDigits.length > 0 && !isPromptPayValid) {
      setError('เบอร์พร้อมเพย์ไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลักและเริ่มต้นด้วย 0');
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, string | undefined> = {
        restaurant_name: form.restaurant_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        house_number: form.house_number.trim() || undefined,
        moo: form.moo.trim() || undefined,
        soi: form.soi.trim() || undefined,
        road: form.road.trim() || undefined,
        subdistrict: form.subdistrict.trim() || undefined,
        district: form.district.trim() || undefined,
        province: form.province.trim() || undefined,
        postal_code: form.postal_code.trim() || undefined,
        tax_id: form.tax_id.trim() || undefined,
        promptpay_id: form.promptpay_id.trim().replace(/\D/g, '') || undefined,
      };

      await apiFetch('/store', accessToken, 'PATCH', payload);
      setSuccess('บันทึกข้อมูลร้านเรียบร้อยแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-kanit">
      <Header />
      <SettingNavBar />

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>ตั้งค่า</span>
            <span>/</span>
            <span className="text-[#2D241E]">ร้านอาหาร</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#2D241E]">ข้อมูลร้านอาหาร</h1>
              <p className="text-sm text-stone-500">จัดการข้อมูลพื้นฐานของร้าน</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6]">
              <h2 className="text-base font-medium text-[#2D241E]">ข้อมูลร้าน</h2>
              <p className="text-sm text-stone-500 mt-0.5">ชื่อร้านที่ใช้แสดงในระบบ</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    ชื่อร้าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.restaurant_name}
                    onChange={handleChange('restaurant_name')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="กรอกชื่อร้าน"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="กรอกเบอร์โทรศัพท์"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
              </div>
            </div>
          </section>
          <section className='bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden'>
            <div className='px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6]'>
              <h2 className='text-base font-medium text-[#2D241E]'>ข้อมูลผู้เสียภาษี</h2>
              <p className='text-sm text-stone-500 mt-0.5'></p>
            </div>
            <div className='p-6'>
              <div className='grid grid-cols-1 md:grid-cols-6 gap-4'>
                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-[#2D241E] mb-1.5'>
                      เลชประจำตัวผู้เสียภาษี
                  </label>
                  <input
                    type="text"
                    value={form.tax_id}
                    onChange={handleChange('tax_id')}
                    className='w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors'
                    placeholder=''
                  />
                </div>
              </div>
            </div>
          </section>
          <section className="bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6]">
              <h2 className="text-base font-medium text-[#2D241E]">ที่อยู่ร้าน</h2>
              <p className="text-sm text-stone-500 mt-0.5">ที่อยู่สำหรับแสดงในเอกสารต่าง ๆ</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    บ้านเลขที่
                  </label>
                  <input
                    type="text"
                    value={form.house_number}
                    onChange={handleChange('house_number')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="เช่น 123/45"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    หมู่
                  </label>
                  <input
                    type="text"
                    value={form.moo}
                    onChange={handleChange('moo')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="เช่น 5"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    ซอย
                  </label>
                  <input
                    type="text"
                    value={form.soi}
                    onChange={handleChange('soi')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="กรอกซอย"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    ถนน
                  </label>
                  <input
                    type="text"
                    value={form.road}
                    onChange={handleChange('road')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="กรอกถนน"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    จังหวัด
                  </label>
                  <select
                    value={form.province}
                    onChange={handleProvinceChange}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors bg-white"
                    disabled={isLoading || isSaving || !canConfigure}
                  >
                    <option value="">-- เลือกจังหวัด --</option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.name_th}>
                        {province.name_th}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    อำเภอ/เขต
                  </label>
                  <select
                    value={form.district}
                    onChange={handleDistrictChange}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors bg-white"
                    disabled={isLoading || isSaving || !canConfigure || !form.province}
                  >
                    <option value="">-- เลือกอำเภอ/เขต --</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.name_th}>
                        {district.name_th}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    ตำบล/แขวง
                  </label>
                  <select
                    value={form.subdistrict}
                    onChange={handleSubdistrictChange}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors bg-white"
                    disabled={isLoading || isSaving || !canConfigure || !form.district}
                  >
                    <option value="">-- เลือกตำบล/แขวง --</option>
                    {subdistricts.map((subdistrict) => (
                      <option key={subdistrict.id} value={subdistrict.name_th}>
                        {subdistrict.name_th}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-[#2D241E] mb-1.5">
                    รหัสไปรษณีย์
                  </label>
                  <input
                    type="text"
                    value={form.postal_code}
                    onChange={handleChange('postal_code')}
                    className="w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors"
                    placeholder="รหัสไปรษณีย์"
                    disabled={isLoading || isSaving || !canConfigure}
                  />
                </div>
              </div>
            </div>
          </section>
          <section className="bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6] flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EFE8DC] text-[#8C6D58]">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#2D241E]">รับเงินผ่านพร้อมเพย์</h2>
                <p className="text-sm text-stone-500 mt-0.5">
                  ใช้สร้าง QR รับเงินในหน้าชำระเงิน
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
                {/* ซ้าย: ช่องกรอก + คำแนะนำ */}
                <div className="md:col-span-3 flex flex-col gap-4">
                  <div>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <label htmlFor="promptpay-id" className="block text-sm font-medium text-[#2D241E]">
                        เบอร์พร้อมเพย์
                      </label>
                      <span className="text-xs tabular-nums text-stone-400">
                        {ppDigits.length}/10
                      </span>
                    </div>

                    <div className="relative">
                      <Smartphone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                      <input
                        id="promptpay-id"
                        type="tel"
                        value={isPromptPayFocused ? ppDigits : formatPromptPay(ppDigits)}
                        onChange={handlePromptPayChange}
                        onFocus={() => setIsPromptPayFocused(true)}
                        onBlur={() => setIsPromptPayFocused(false)}
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        aria-invalid={Boolean(promptPayError)}
                        aria-describedby="promptpay-help"
                        className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-10 text-sm tabular-nums text-[#2D241E] outline-none transition-colors duration-200 placeholder:text-stone-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400 ${
                          promptPayError
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                            : isPromptPayValid
                              ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : 'border-[#d9c6b0] focus:border-[#8C6D58] focus:ring-[#8C6D58]/20'
                        }`}
                        placeholder="0812345678"
                        disabled={isLoading || isSaving || !canConfigure}
                      />
                      {isPromptPayValid && (
                        <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                      )}
                    </div>

                    <p
                      id="promptpay-help"
                      aria-live="polite"
                      className={`mt-1.5 flex items-start gap-1.5 text-xs ${
                        promptPayError
                          ? 'text-red-600'
                          : isPromptPayValid
                            ? 'text-emerald-700'
                            : 'text-stone-500'
                      }`}
                    >
                      {promptPayError ? (
                        <>
                          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                          {promptPayError}
                        </>
                      ) : isPromptPayValid ? (
                        <>
                          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
                          เบอร์พร้อมเพย์พร้อมใช้งาน
                        </>
                      ) : (
                        promptPayHint
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2.5 rounded-xl border border-[#E8DFD5] bg-[#FBF9F6] px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#8C6D58]" />
                    <p className="text-xs leading-relaxed text-stone-600">
                      ใช้ได้เฉพาะเบอร์มือถือที่ผูกพร้อมเพย์แล้ว ระบบจะนำเลขนี้ไปสร้าง QR
                      ในหน้าชำระเงินโดยอัตโนมัติ
                    </p>
                  </div>
                </div>

                {/* ขวา: ตัวอย่าง QR */}
                <div className="md:col-span-2">
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9c6b0] bg-[#FBF9F6] px-4 py-5 text-center">
                    <div
                      role="img"
                      aria-label="ตัวอย่าง QR พร้อมเพย์"
                      className="flex h-[132px] w-[132px] items-center justify-center rounded-xl border border-[#E8DFD5] bg-white shadow-sm"
                    >
                      {ppPayload ? (
                        <QRCodeSVG value={ppPayload} size={112} fgColor="#2D241E" bgColor="#FFFFFF" />
                      ) : (
                        <QrCode className="h-10 w-10 text-[#d9c6b0]" aria-hidden="true" />
                      )}
                    </div>
                    <p className="mt-3 text-xs font-medium text-[#2D241E]">ตัวอย่าง QR พร้อมเพย์</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                      {ppPayload
                        ? 'สแกนด้วยแอปธนาคารเพื่อตรวจชื่อบัญชี แล้วกดยกเลิก ไม่ต้องโอน'
                        : 'กรอกเบอร์พร้อมเพย์ 10 หลัก เพื่อดูตัวอย่าง'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {(error || success) && (
            <div
              className={`px-4 py-3 rounded-xl text-sm ${
                error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {error || success}
            </div>
          )}

          {canConfigure && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#8C6D58] hover:bg-[#7a5c45] text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          )}

          {!canConfigure && (
            <div className="px-4 py-3 rounded-xl text-sm bg-amber-50 text-amber-700 border border-amber-200">
              เฉพาะ Owner หรือ Manager เท่านั้นที่สามารถแก้ไขข้อมูลร้านได้
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
