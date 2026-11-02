import RateCard from '../components/RateCard';
import { asNumber, useSystemConfig, useUpdateConfig } from '../hook/useVatEdit';
import { useAuth } from '../../auth/context/AuthContext';
import { useState } from 'react';
import type { ConfigValue } from '../types/vatEdit.types';
import ExampleCard from '../components/ExampleCard';
import { AlertCircle, Percent, RefreshCw, Sparkles } from 'lucide-react';

const vat_rate = 7;

function RateCardSkeleton() {
    return (
        <div className="w-full rounded-2xl border border-[#E8DFD5] bg-white p-5 shadow-xs" aria-busy="true">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-stone-200/70 animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="h-4 w-32 rounded-md bg-stone-200/70 animate-pulse" />
                        <div className="h-3 w-40 rounded-md bg-stone-200/50 animate-pulse" />
                    </div>
                </div>
                <div className="h-6 w-11 rounded-full bg-stone-200/70 animate-pulse" />
            </div>
            <div className="h-10 w-28 rounded-xl bg-stone-200/60 animate-pulse mb-3" />
            <div className="h-12 w-full rounded-xl bg-stone-200/40 animate-pulse" />
        </div>
    );
}

function ExampleCardSkeleton() {
    return (
        <div className="w-full rounded-2xl border border-[#E8DFD5] bg-white p-5 shadow-xs" aria-busy="true">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 rounded-lg bg-stone-200/70 animate-pulse" />
                <div className="h-4 w-36 rounded-md bg-stone-200/70 animate-pulse" />
            </div>
            <div className="space-y-3">
                <div className="h-20 w-full rounded-xl bg-stone-200/50 animate-pulse" />
                <div className="h-14 w-full rounded-xl bg-stone-200/40 animate-pulse" />
            </div>
        </div>
    );
}

export default function EditVat() {
    const { user } = useAuth();
    const { configs, isLoading, error, reload, replaceItem } = useSystemConfig();
    const { updateConfig, savingKey, error: saveError } = useUpdateConfig();
    const [lastServiceRate, setLastServiceRate] = useState(vat_rate);

    const hasData = Object.keys(configs).length > 0;

    const save = async (key: string, value: ConfigValue): Promise<boolean> => {
        const item = await updateConfig(key, value);
        if (item) replaceItem(item);
        return item !== null;
    };

    const vatMode = configs.vat_mode?.value;
    const vatRateItem = configs.vat_rate;
    const serviceItem = configs.service_charge_rate;
    const vatRate = asNumber(vatRateItem, 7);
    const serviceRate = asNumber(serviceItem, 0);

    // ownerOnly มาจาก config_definitions: หากยังไม่โหลด configs ให้ยึด role ไปก่อนเพื่อไม่ให้เกิด permission flash
    const canEdit = user?.role === 'owner' || (configs.vat_mode ? !configs.vat_mode.ownerOnly : true);
    const disabled = !canEdit || savingKey !== null || isLoading;

    const toggleService = async (next: boolean) => {
        if (next) {
            await save('service_charge_rate', lastServiceRate);
        } else {
            setLastServiceRate(serviceRate);
            await save('service_charge_rate', 0);
        }
    };

    return (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto w-full font-kanit">
            {/* Header */}
            <div className="mb-5 sm:mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0">
                        <Percent className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-semibold text-[#2D241E]">ภาษีและค่าบริการ</h1>
                        <p className="text-xs sm:text-sm text-stone-500">
                            กำหนดอัตราภาษีมูลค่าเพิ่ม (VAT) และค่าบริการ (Service Charge) สำหรับการคิดเงิน
                        </p>
                    </div>
                </div>
            </div>

            {/* เกิดข้อผิดพลาดตอนดึงข้อมูลครั้งแรก */}
            {error && !hasData && (
                <div className="mb-6 flex max-w-xl items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 shadow-xs">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => reload()}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 transition active:scale-95"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        ลองใหม่
                    </button>
                </div>
            )}

            {/* โหลดครั้งแรก: แสดง Skeleton คงขนาด ไม่ทำให้จอกระพริบ */}
            {isLoading && !hasData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" role="status" aria-label="กำลังโหลดข้อมูลภาษีและค่าบริการ">
                    <div className="lg:col-span-7 space-y-5">
                        <RateCardSkeleton />
                        <RateCardSkeleton />
                    </div>
                    <div className="lg:col-span-5">
                        <ExampleCardSkeleton />
                    </div>
                </div>
            )}

            {/* มีข้อมูลแล้ว (หรือโหลดเสร็จแล้ว) */}
            {hasData && (
                <>
                    {!canEdit && (
                        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200/80 px-4 py-2.5 text-xs sm:text-sm text-amber-800 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>เฉพาะเจ้าของร้าน (Owner) เท่านั้นที่สามารถแก้ไขอัตราภาษีและค่าบริการได้</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* ฝั่งซ้าย: การ์ดตั้งค่า VAT และ Service Charge */}
                        <div className="lg:col-span-7 space-y-5">
                            <RateCard
                                title="ภาษีมูลค่าเพิ่ม (VAT)"
                                subtitle="คำนวณแบบราคารวมภาษีแล้ว (VAT Inclusive)"
                                icon={<Percent className="w-4 h-4" />}
                                enabled={vatMode !== 'none'}
                                rate={vatRate}
                                min={vatRateItem?.min ?? 0}
                                max={vatRateItem?.max ?? 100}
                                disabled={disabled}
                                presets={[
                                    { label: '7% (มาตรฐาน)', value: 7 },
                                    { label: '0% (ยกเว้น)', value: 0 },
                                ]}
                                infoNotice={
                                    vatMode === 'inclusive' ? (
                                        <span>
                                            ราคาเมนูขายหน้าร้านจะไม่เปลี่ยนแปลง แต่ประมาณ{' '}
                                            <strong>{((vatRate / (100 + vatRate)) * 100).toFixed(2)}%</strong> ของยอดขายจะถูกบันทึกเป็นภาษีที่ร้านต้องนำส่งสรรพากร
                                        </span>
                                    ) : vatMode === 'exclusive' ? (
                                        <span className="text-amber-800">
                                            ขณะนี้ระบบตั้งเป็นโหมดบวก VAT เพิ่มจากราคาเมนู หากกดปิดแล้วเปิดใหม่จะเปลี่ยนเป็นราคารวม VAT
                                        </span>
                                    ) : (
                                        <span>ร้านไม่ได้เปิดคิดภาษีมูลค่าเพิ่ม (ยอดขายทั้งหมดจะไม่มีการคำนวณภาษี VAT)</span>
                                    )
                                }
                                onToggle={next => save('vat_mode', next ? 'inclusive' : 'none')}
                                onRateSave={value => save('vat_rate', value)}
                            />

                            <RateCard
                                title="ค่าบริการ (Service Charge)"
                                subtitle="คิดเปอร์เซ็นต์เพิ่มจากยอดรวมอาหารในบิล"
                                icon={<Sparkles className="w-4 h-4" />}
                                enabled={serviceRate > 0}
                                rate={serviceRate}
                                min={serviceItem?.min ?? 0}
                                max={serviceItem?.max ?? 100}
                                disabled={disabled}
                                presets={[
                                    { label: '0%', value: 0 },
                                    { label: '5%', value: 5 },
                                    { label: '10%', value: 10 },
                                ]}
                                infoNotice={
                                    serviceRate > 0 ? (
                                        <span>
                                            ระบบจะนำอัตรา <strong>{serviceRate}%</strong> ไปคิดเพิ่มจากยอดอาหาร แล้วรวมเป็นยอดสุทธิที่ลูกค้าต้องชำระ
                                        </span>
                                    ) : (
                                        <span>ไม่ได้คิดค่าบริการเพิ่มเติมจากลูกค้า</span>
                                    )
                                }
                                onToggle={toggleService}
                                onRateSave={value => save('service_charge_rate', value)}
                            />

                            {saveError && (
                                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs sm:text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                    <span>{saveError}</span>
                                </div>
                            )}
                        </div>

                        {/* ฝั่งขวา: จำลองบิล / Live Preview Receipt (Sticky บน Desktop) */}
                        <div className="lg:col-span-5 lg:sticky lg:top-4">
                            <ExampleCard
                                vatEnabled={vatMode === 'inclusive'}
                                vatRate={vatRate}
                                serviceRate={serviceRate}
                            />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}
