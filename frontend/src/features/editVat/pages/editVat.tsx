import RateCard from '../components/RateCard';
import { asNumber, useSystemConfig, useUpdateConfig } from '../hook/useVatEdit';
import SettingNavBar from '../../../components/settingNavBar';
import { useAuth } from '../../auth/context/AuthContext';
import { useState } from 'react';
import type { ConfigValue } from '../types/vatEdit.types';
import Header from '../../../components/Header';
import ExampleCard from '../components/ExampleCard';

const vat_rate = 7;

export default function EditVat() {
    const { user } = useAuth();
    const { configs, isLoading, error, replaceItem } = useSystemConfig();
    const { updateConfig, savingKey, error: saveError } = useUpdateConfig();
    const [lastServiceRate, setLastServiceRate] = useState(vat_rate);


    if (isLoading) return <p>กำลังโหลด...</p>;
    if (error) return <p className="text-red-600">{error}</p>;

    const save = async (key: string, value: ConfigValue): Promise<boolean> => {
    const item = await updateConfig(key, value);
        if (item) replaceItem(item);
        return item !== null;
        
    };
    const vatMode = configs.vat_mode?.value;
    const vatRateItem = configs.vat_rate;
    const serviceItem = configs.service_charge_rate;
    const vatRate = asNumber(vatRateItem, 7);
    const serviceRate = asNumber(serviceItem, 0)

    // ownerOnly มาจาก config_definitions: ถ้าวันหน้าเปลี่ยนสิทธิ์ใน DB หน้าจอเปลี่ยนตามเอง
    const canEdit = user?.role === 'owner' || !configs.vat_mode?.ownerOnly;
    const disabled = !canEdit || savingKey !== null;

    const toggleService = async (next: boolean) => {
        if (next) {
            await save('service_charge_rate', lastServiceRate);
        } else {
            setLastServiceRate(serviceRate);   // จำไว้ เปิดกลับจะได้ค่าเดิม
            await save('service_charge_rate', 0);
        }
    };

    return (
        <div className="flex h-dvh flex-col font-kanit">
            <Header/>
            <SettingNavBar />
            <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6">
                <h1 className="mb-4 text-2xl font-semibold text-[#2D241E]">ภาษีและค่าบริการ</h1>

                {isLoading && <p>กำลังโหลด...</p>}
                {error && <p className="text-red-600">{error}</p>}

                {!isLoading && !error && (
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
                        <div className='py-5'>
                            <ExampleCard 
                                vatEnabled={vatMode === 'inclusive'}
                                vatRate={vatRate}
                                serviceRate={serviceRate}
                            />
                        </div>
                    </>
                )}
            </main>
            
        </div>
    );
}