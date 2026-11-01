import { useCallback, useEffect, useState } from 'react';
import { apiFetch, ApiError } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import type { ConfigListResponse } from '../../editVat/types/vatEdit.types';
import type { PrinterSettingsForm } from '../types/printer.types';
import {
  getDevicePrinterSettings,
  saveDevicePrinterSettings,
} from '../storage/printerStorage';

const DEFAULT_FOOTER = 'ขอบคุณที่ใช้บริการ\nโปรดตรวจสอบรายการก่อนออกจากร้าน';

export function usePrinterSettings() {
  const { accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initial state combining LocalStorage device settings + DB defaults
  const [settings, setSettings] = useState<PrinterSettingsForm>(() => {
    const device = getDevicePrinterSettings();
    return {
      paperSize: device.paperSize,
      autoPrint: device.autoPrint,
      maxReprints: 0,
      receiptFooter: DEFAULT_FOOTER,
      showTaxId: true,
      showCashier: true,
      showAddress: true,
    };
  });

  // Track initial server values to only PATCH what actually changed
  const [initialServerValues, setInitialServerValues] = useState<{
    maxReprints: number;
    receiptFooter: string;
    showTaxId: boolean;
    showCashier: boolean;
    showAddress: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const device = getDevicePrinterSettings();
      let maxReprints = 0;
      let receiptFooter = DEFAULT_FOOTER;
      let showTaxId = true;
      let showCashier = true;
      let showAddress = true;

      try {
        const res = await apiFetch<ConfigListResponse>('/system-config', accessToken);
        if (res?.data) {
          for (const item of res.data) {
            if (item.key === 'max_reprints') {
              maxReprints = Number(item.value ?? 0);
            } else if (item.key === 'receipt_footer') {
              receiptFooter = String(item.value ?? DEFAULT_FOOTER);
            } else if (item.key === 'receipt_show_tax_id') {
              showTaxId = item.value !== 'false' && item.value !== false;
            } else if (item.key === 'receipt_show_cashier') {
              showCashier = item.value !== 'false' && item.value !== false;
            } else if (item.key === 'receipt_show_address') {
              showAddress = item.value !== 'false' && item.value !== false;
            }
          }
        }
      } catch (err) {
        console.warn('Cannot fetch system-config, falling back to local defaults:', err);
      }

      const serverVals = {
        maxReprints,
        receiptFooter,
        showTaxId,
        showCashier,
        showAddress,
      };

      setInitialServerValues(serverVals);
      setSettings({
        paperSize: device.paperSize,
        autoPrint: device.autoPrint,
        ...serverVals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (newForm: PrinterSettingsForm) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // 1. บันทึกลง LocalStorage ประจำเครื่อง
      saveDevicePrinterSettings({
        paperSize: newForm.paperSize,
        autoPrint: newForm.autoPrint,
      });

      // 2. บันทึกค่า Store policy ไปยัง system_config บน server
      const patches: Promise<unknown>[] = [];

      if (!initialServerValues || initialServerValues.maxReprints !== newForm.maxReprints) {
        patches.push(
          apiFetch('/system-config/max_reprints', accessToken, 'PATCH', {
            value: newForm.maxReprints,
          }),
        );
      }

      if (!initialServerValues || initialServerValues.receiptFooter !== newForm.receiptFooter) {
        patches.push(
          apiFetch('/system-config/receipt_footer', accessToken, 'PATCH', {
            value: newForm.receiptFooter,
          }),
        );
      }

      if (!initialServerValues || initialServerValues.showTaxId !== newForm.showTaxId) {
        patches.push(
          apiFetch('/system-config/receipt_show_tax_id', accessToken, 'PATCH', {
            value: newForm.showTaxId ? 'true' : 'false',
          }),
        );
      }

      if (!initialServerValues || initialServerValues.showCashier !== newForm.showCashier) {
        patches.push(
          apiFetch('/system-config/receipt_show_cashier', accessToken, 'PATCH', {
            value: newForm.showCashier ? 'true' : 'false',
          }),
        );
      }

      if (!initialServerValues || initialServerValues.showAddress !== newForm.showAddress) {
        patches.push(
          apiFetch('/system-config/receipt_show_address', accessToken, 'PATCH', {
            value: newForm.showAddress ? 'true' : 'false',
          }),
        );
      }

      if (patches.length > 0) {
        await Promise.all(patches);
      }

      setInitialServerValues({
        maxReprints: newForm.maxReprints,
        receiptFooter: newForm.receiptFooter,
        showTaxId: newForm.showTaxId,
        showCashier: newForm.showCashier,
        showAddress: newForm.showAddress,
      });

      setSettings(newForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    saveSettings,
    isLoading,
    isSaving,
    saveSuccess,
    error,
    reload: load,
  };
}
