import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "../../../libs/appClient";
import { useAuth } from "../../auth/context/AuthContext";
import type { ConfigItem, ConfigListResponse, ConfigOneResponse, ConfigValue } from "../types/vatEdit.types";

// key → ConfigItem เช่น configs.vat_rate.value
export type ConfigMap = Record<string, ConfigItem>;

export function useSystemConfig() {
    const { accessToken } = useAuth();
    const [configs, setConfigs] = useState<ConfigMap>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiFetch<ConfigListResponse>('/system-config', accessToken);
            const map: ConfigMap = {};
            for (const item of res.data) {
                map[item.key] = item;
            }
            setConfigs(map);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'โหลดการตั้งค่าไม่สำเร็จ');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => { load(); }, [load]);

    // ใช้หลัง PATCH สำเร็จ (ขั้นที่ 3): แทนที่เฉพาะตัวที่แก้ ไม่ต้อง GET ใหม่ทั้ง 9 ตัว
    const replaceItem = useCallback((item: ConfigItem) => {
        setConfigs(prev => ({ ...prev, [item.key]: item }));
    }, []);

    return { configs, isLoading, error, reload: load, replaceItem };
}

// ดึงค่าตัวเลขออกมาอย่างปลอดภัย
export function asNumber(item: ConfigItem | undefined, fallback = 0): number {
    return typeof item?.value === 'number' ? item.value : fallback;
}

// แปลง error จาก backend เป็นข้อความที่เจ้าของร้านอ่านเข้าใจ
function toThaiMessage(err: unknown): string {
    if (!(err instanceof ApiError)) return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
    if (err.status === 403) return 'เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขได้';
    if (err.status === 400 && err.message.includes('tax_id')) return err.message;
    if (err.status === 400) return 'ค่าที่กรอกไม่ถูกต้อง';
    if (err.status === 404) return 'ไม่พบการตั้งค่านี้';
    return 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง';
}

export function useUpdateConfig(){
    const {accessToken} = useAuth();
    const [error, setError ] = useState<string|null>(null);
    const [savingKey, setSavingKey] = useState<string | null>(null);

    const updateConfig = async (key:string, value:ConfigValue): Promise<ConfigItem | null> =>{
        setError(null);
        setSavingKey(key);

        try{
            const result = await apiFetch<ConfigOneResponse>(`/system-config/${key}`,accessToken,'PATCH',{value});
            return result.data
        }catch(err){
            setError(toThaiMessage(err));
            return null;
        }finally{
            setSavingKey(null);
        }
    }
    return {updateConfig,savingKey,error};
}