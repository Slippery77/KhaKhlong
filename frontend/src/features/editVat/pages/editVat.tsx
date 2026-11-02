import RateCard from '../components/RateCard';
import { asNumber, useSystemConfig, useUpdateConfig } from '../hook/useVatEdit';
import { useAuth } from '../../auth/context/AuthContext';
import { useState } from 'react';
import type { ConfigValue } from '../types/vatEdit.types';
import ExampleCard from '../components/ExampleCard';
import { AlertCircle, RefreshCw } from 'lucide-react';

const vat_rate = 7;

function RateCardSkeleton() {
    return (
        <div className="w-80 rounded-2xl border border-[#E8DFD5] bg-white p-5 shadow-xs" aria-busy="true">
            <div className="flex items-center justify-between mb-4">
                <div className="h-5 w-36 rounded-md bg-stone-200/70 animate-pulse" />
                <div className="h-6 w-11 rounded-full bg-stone-200/70 animate-pulse" />
            </div>
            <div className="h-4 w-44 rounded-md bg-stone-200/50 animate-pulse mb-6" />
            <div className="h-10 w-full rounded-xl bg-stone-200/60 animate-pulse mb-3" />
            <div className="h-4 w-28 rounded-md bg-stone-200/50 animate-pulse" />
        </div>
    );
}

function ExampleCardSkeleton() {
    return (
        <div className="max-w-xl rounded-2xl border border-[#E8DFD5] bg-white p-6 shadow-xs" aria-busy="true">
            <div className="h-5 w-40 rounded-md bg-stone-200/70 animate-pulse mb-4" />
            <div className="space-y-3">
                <div className="h-4 w-full rounded-md bg-stone-200/50 animate-pulse" />
                <div className="h-4 w-3/4 rounded-md bg-stone-200/50 animate-pulse" />
                <div className="h-4 w-1/2 rounded-md bg-stone-200/50 animate-pulse" />
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
        <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6 font-kanit">
            <h1 className="mb-4 text-2xl font-semibold text-[#2D241E]">ภาษีและค่าบริการ</h1>

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
                <div className="space-y-6" role="status" aria-label="กำลังโหลดข้อมูลภาษีและค่าบริการ">
                    <div className="flex flex-wrap items-start gap-6">
                        <RateCardSkeleton />
                        <RateCardSkeleton />
                    </div>
                    <div className="py-2">
                        <ExampleCardSkeleton />
                    </div>
                </div>
            )}

            {/* มีข้อมูลแล้ว (หรือโหลดเสร็จแล้ว) */}
            {hasData && (
                <>
                    {!canEdit && (
                        <p className="mb-4 w-fit rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                            เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขหน้านี้ได้
                        </p>
                    )}

                    <div className="flex flex-wrap items-start gap-6">
                        <div>
                            <RateCard
                                title="ภาษีมูลค่าเพิ่ม (VAT)"
                                subtitle="ราคาเมนูรวม VAT แล้ว"
                                enabled={vatMode !== 'none'}
                                rate={vatRate}
                                min={vatRateItem?.min ?? 0}
                                max={vatRateItem?.max ?? 100}
                                disabled={disabled}
                                onToggle={next => save('vat_mode', next ? 'inclusive' : 'none')}
                                onRateSave={value => save('vat_rate', value)}
                            />
                            {vatMode === 'inclusive' && (
                                <p className="mt-2 w-72 text-xs text-stone-500">
                                    ราคาเมนูไม่เปลี่ยน แต่ประมาณ {(vatRate / (100 + vatRate) * 100).toFixed(2)}% ของยอดขายเป็นภาษีที่ร้านต้องนำส่ง
                                </p>
                            )}
                            {vatMode === 'exclusive' && (
                                <p className="mt-2 w-72 text-xs text-amber-700">
                                    ร้านตั้งเป็นโหมดบวก VAT เพิ่มจากราคา ซึ่งหน้านี้ยังไม่รองรับ ถ้าปิดแล้วเปิดใหม่จะเปลี่ยนเป็นราคารวม VAT
                                </p>
                            )}
                        </div>

                        <RateCard
                            title="ค่าบริการ (Service Charge)"
                            subtitle="คิดจากยอดอาหาร"
                            enabled={serviceRate > 0}
                            rate={serviceRate}
                            min={serviceItem?.min ?? 0}
                            max={serviceItem?.max ?? 100}
                            disabled={disabled}
                            onToggle={toggleService}
                            onRateSave={value => save('service_charge_rate', value)}
                        />
                    </div>
                    {saveError && <p className="mt-4 text-sm text-red-600">{saveError}</p>}
                    <div className="py-5">
                        <ExampleCard
                            vatEnabled={vatMode === 'inclusive'}
                            vatRate={vatRate}
                            serviceRate={serviceRate}
                        />
                    </div>
                </>
            )}
        </main>
    );
}
