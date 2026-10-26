import { useCallback, useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Save, Store } from 'lucide-react';
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

export default function StoreSettingPage() {
  const { accessToken, user: currentUser } = useAuth();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canConfigure = currentUser?.role === 'owner' || currentUser?.role === 'manager';

  const districts = form.province ? getDistricts(form.province) : [];
  const subdistricts = form.province && form.district ? getSubdistricts(form.province, form.district) : [];

  const ppDigits = form.promptpay_id.replace(/\D/g, '');
  const ppPayload = useMemo(
    () => (/^0\d{9}$/.test(ppDigits) ? generatePayload(ppDigits, {}) : null),
    [ppDigits],
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
          <section className='bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden'>
            <div className='px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6]'>
              <h2 className='text-base font-medium text-[#2D241E]'>ข้อมูลเลขพร้อมเพย์</h2>
              <p className='text-sm text-stone-500 mt-0.5'></p>
            </div>
            <div className='p-6'>
              <div className='grid grid-cols-1 md:grid-cols-6 gap-4'>
                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-[#2D241E] mb-1.5'>
                      เลขพร้อมเพย์
                  </label>
                  <input
                    type="text"
                    value={form.promptpay_id}
                    onChange={handleChange('promptpay_id')}
                    maxLength={10}
                    inputMode='numeric'
                    className='w-full px-3 py-2 border border-[#d9c6b0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors'
                    placeholder='083-xxx-xxxx'
                  />
                </div>
                {ppPayload?(
                  <div className="md:col-span-4 flex items-center gap-4">
                    <QRCodeSVG value={ppPayload} size={144}/>
                     <p className='text-sm text-stone-500'>
                        สแกนด้วยแอปธนาคารเพื่อตรวจว่าชื่อบัญชีถูกต้อง แล้วกดยกเลิก ไม่ต้องโอน
                    </p>
                  </div>
                ):(
                  <p className='text-sm text-stone-400'>กรอกเบอร์ 10 หลักเพื่อดูตัวอย่าง QR</p>
                )}
                
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
