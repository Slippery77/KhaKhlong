import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Info,
  Package,
  RotateCw,
  Save,
  Sliders,
  X,
} from 'lucide-react';
import { apiFetch } from '../../../libs/appClient';
import { useAuth } from '../../auth/context/AuthContext';
import type {
  ConfigListResponse,
  StoreOperationsConfig,
} from '../types/storeOperations.types';

const DEFAULT_CONFIG: StoreOperationsConfig = {
  businessDayStartHour: 5,
  shiftEscalationHours: 4,
  inventoryVarianceAlertPercent: 20,
};

// ตัวเลือกชั่วโมงเริ่มวันขาย 00:00 - 23:00 น.
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const pad = i.toString().padStart(2, '0');
  let label = `${pad}:00 น.`;
  if (i === 0) label += ' (เที่ยงคืน)';
  else if (i === 5) label += ' (ตี 5 — แนะนำสำหรับร้านทั่วไป/ปิดดึก)';
  else if (i === 6) label += ' (6 โมงเช้า)';
  else if (i === 11) label += ' (11 โมง — ร้านเปิดมื้อเที่ยง)';
  return { value: i, label };
});

export default function StoreOperationsConfigCard() {
  const { accessToken, user } = useAuth();
  // หมายเหตุ: สิทธิ์ในระดับ DB config_definitions เป็น owner_only = false (Manager มี config:edit_operational)
  // แต่หน้านี้ถูกจำกัดการเข้าถึงสำหรับ Owner เท่านั้นตามข้อตกลงทางธุรกิจของร้านค้า
  const isOwner = user?.role?.toLowerCase() === 'owner';

  // Server state (ค่าที่ซิงค์ตรงกับ DB)
  const [initialConfig, setInitialConfig] = useState<StoreOperationsConfig>(DEFAULT_CONFIG);

  // Form input states เก็บเป็น String เพื่อรองรับการลบจนว่าง (Backspace) และการพิมพ์จุดทศนิยม
  const [businessDayStartHour, setBusinessDayStartHour] = useState<number>(5);
  const [escalationHoursInput, setEscalationHoursInput] = useState<string>('4');
  const [varianceAlertInput, setVarianceAlertInput] = useState<string>('20');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadError, setIsLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal ยืนยันการเปลี่ยนเวลาตัดรอบวันขาย
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const isMountedRef = useRef(true);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const businessDayHelpId = useId();
  const escalationHelpId = useId();
  const inventoryHelpId = useId();

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // โหลดค่า config จากระบบ
  const loadConfigs = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsLoadError(false);
    setError(null);

    try {
      const res = await apiFetch<ConfigListResponse>('/system-config', accessToken);
      if (!isMountedRef.current) return;

      const items = res.data ?? [];
      const loaded: StoreOperationsConfig = { ...DEFAULT_CONFIG };

      items.forEach((item) => {
        if (item.key === 'business_day_start_hour') {
          loaded.businessDayStartHour = Number(item.value);
        } else if (item.key === 'shift_escalation_hours') {
          loaded.shiftEscalationHours = Number(item.value);
        } else if (item.key === 'inventory_variance_alert_percent') {
          loaded.inventoryVarianceAlertPercent = Number(item.value);
        }
      });

      setInitialConfig(loaded);
      setBusinessDayStartHour(loaded.businessDayStartHour);
      setEscalationHoursInput(String(loaded.shiftEscalationHours));
      setVarianceAlertInput(String(loaded.inventoryVarianceAlertPercent));
    } catch (err) {
      if (!isMountedRef.current) return;
      setIsLoadError(true);
      setError(err instanceof Error ? err.message : 'โหลดการตั้งค่าการทำงานไม่สำเร็จ');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [accessToken]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // ตรวจจับการเปลี่ยนแปลง (Dirty checking)
  const parsedEscalation = parseInt(escalationHoursInput, 10);
  const parsedVariance = parseFloat(varianceAlertInput);

  const isHourChanged = businessDayStartHour !== initialConfig.businessDayStartHour;
  const isEscalationChanged =
    !isNaN(parsedEscalation) && parsedEscalation !== initialConfig.shiftEscalationHours;
  const isVarianceChanged =
    !isNaN(parsedVariance) && parsedVariance !== initialConfig.inventoryVarianceAlertPercent;

  const hasChanges = isHourChanged || isEscalationChanged || isVarianceChanged;

  const showSuccessMessage = (msg: string) => {
    setSuccess(msg);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setSuccess(null);
    }, 4000);
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setBusinessDayStartHour(Number(e.target.value));
    setSuccess(null);
    setError(null);
  };

  const handleEscalationPreset = (hours: number) => {
    setEscalationHoursInput(String(hours));
    setSuccess(null);
    setError(null);
  };

  const handleVariancePreset = (percent: number) => {
    setVarianceAlertInput(String(percent));
    setSuccess(null);
    setError(null);
  };

  // ตรวจสอบความถูกต้องก่อนบันทึก
  const validateForm = (): boolean => {
    if (!isOwner) {
      setError('เฉพาะเจ้าของร้าน (Owner) เท่านั้นที่สามารถแก้ไขการตั้งค่าการทำงานได้');
      return false;
    }

    if (
      !Number.isInteger(businessDayStartHour) ||
      businessDayStartHour < 0 ||
      businessDayStartHour > 23
    ) {
      setError('เวลาเริ่มวันขายใหม่ต้องอยู่ระหว่าง 0 ถึง 23 นาฬิกา');
      return false;
    }

    if (
      isNaN(parsedEscalation) ||
      !Number.isInteger(parsedEscalation) ||
      parsedEscalation < 1 ||
      parsedEscalation > 168
    ) {
      setError('ระยะเวลาส่งต่อกะค้างตรวจต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 168 ชั่วโมง (สูงสุด 7 วัน)');
      return false;
    }

    if (isNaN(parsedVariance) || parsedVariance < 0 || parsedVariance > 1000) {
      setError('เกณฑ์แจ้งเตือนส่วนต่างสต็อกต้องอยู่ระหว่าง 0 ถึง 1,000%');
      return false;
    }

    return true;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) return;

    // หากมีการเปลี่ยนเวลาตัดรอบวันขาย ให้ขึ้น Modal เตือนความเสี่ยงเรื่องกะค้างก่อน
    if (isHourChanged) {
      setShowConfirmModal(true);
    } else {
      executeSave();
    }
  };

  // ดำเนินการบันทึกแบบ Per-field tracking (Promise.allSettled) ป้องกัน State Desync
  const executeSave = async () => {
    setShowConfirmModal(false);
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    interface Task {
      key: keyof StoreOperationsConfig;
      apiKey: string;
      value: number;
    }

    const tasks: Task[] = [];
    if (isHourChanged) {
      tasks.push({
        key: 'businessDayStartHour',
        apiKey: 'business_day_start_hour',
        value: businessDayStartHour,
      });
    }
    if (isEscalationChanged) {
      tasks.push({
        key: 'shiftEscalationHours',
        apiKey: 'shift_escalation_hours',
        value: parsedEscalation,
      });
    }
    if (isVarianceChanged) {
      tasks.push({
        key: 'inventoryVarianceAlertPercent',
        apiKey: 'inventory_variance_alert_percent',
        value: parsedVariance,
      });
    }

    if (tasks.length === 0) {
      setIsSaving(false);
      return;
    }

    const results = await Promise.allSettled(
      tasks.map((task) =>
        apiFetch(`/system-config/${task.apiKey}`, accessToken, 'PATCH', { value: task.value }),
      ),
    );

    if (!isMountedRef.current) return;

    const successfulKeys: (keyof StoreOperationsConfig)[] = [];
    const failedMessages: string[] = [];

    results.forEach((res, index) => {
      const task = tasks[index];
      if (res.status === 'fulfilled') {
        successfulKeys.push(task.key);
      } else {
        const errMsg = res.reason instanceof Error ? res.reason.message : 'บันทึกล้มเหลว';
        failedMessages.push(`${task.apiKey}: ${errMsg}`);
      }
    });

    // อัปเดต initialConfig เฉพาะ key ที่บันทึกสำเร็จจริงลง DB
    setInitialConfig((prev) => {
      const next = { ...prev };
      tasks.forEach((task) => {
        if (successfulKeys.includes(task.key)) {
          next[task.key] = task.value;
        }
      });
      return next;
    });

    setIsSaving(false);

    if (failedMessages.length === 0) {
      showSuccessMessage('บันทึกการตั้งค่าการทำงานของร้านเรียบร้อยแล้ว');
    } else if (successfulKeys.length > 0) {
      setError(`บันทึกสำเร็จบางส่วน แต่มีข้อผิดพลาด: ${failedMessages.join(', ')}`);
      // มีข้อผิดพลาดบางตัว ให้ re-sync ค่าจากเซิร์ฟเวอร์เพื่อให้ state ตรงกัน 100%
      loadConfigs();
    } else {
      setError(`บันทึกการตั้งค่าไม่สำเร็จ: ${failedMessages.join(', ')}`);
    }
  };

  return (
    <>
      <section className="bg-white border border-[#E8DFD5] rounded-2xl shadow-sm overflow-hidden font-kanit">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8DFD5] bg-[#FBF9F6] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EFE8DC] flex items-center justify-center text-[#8C6D58] shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#2D241E]">การทำงานของร้านและกะ</h2>
              <p className="text-sm text-stone-500 mt-0.5">
                กำหนดเวลาตัดรอบวันขาย, การควบคุมเงินปิดกะ และเกณฑ์แจ้งเตือนสต็อก
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF7F2] text-[#8C6D58] border border-[#E8DFD5] text-xs rounded-full font-medium shrink-0">
            เฉพาะ Owner
          </span>
        </div>

        {/* แถบเตือนเรื่องโหลดข้อมูลล้มเหลว */}
        {isLoadError && (
          <div className="p-4 mx-6 mt-6 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-800 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>ไม่สามารถโหลดการตั้งค่าจากระบบได้ กรุณาลองใหม่อีกครั้ง</span>
            </div>
            <button
              type="button"
              onClick={loadConfigs}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100/50 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>โหลดใหม่</span>
            </button>
          </div>
        )}

        <form noValidate onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* กลุ่มที่ 1: รอบวันและกะการทำงาน */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-[#2D241E] font-medium text-sm">
              <Clock className="w-4 h-4 text-[#8C6D58]" />
              <span>รอบวันและกะการทำงาน (Business Day & Shifts)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. เวลาเริ่มวันขายใหม่ */}
              <div className="space-y-2">
                <label
                  htmlFor="business-day-start-hour-select"
                  className="block text-sm font-medium text-[#2D241E]"
                >
                  เวลาเริ่มวันขายใหม่ (Business Day Start)
                </label>
                <select
                  id="business-day-start-hour-select"
                  value={businessDayStartHour}
                  onChange={handleHourChange}
                  disabled={isLoading || isLoadError || isSaving || !isOwner}
                  aria-describedby={businessDayHelpId}
                  className="w-full px-3 py-2.5 bg-white border border-[#d9c6b0] rounded-xl text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors cursor-pointer disabled:bg-stone-50 disabled:cursor-not-allowed"
                >
                  {HOUR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p
                  id={businessDayHelpId}
                  className="text-xs text-stone-500 leading-relaxed flex items-start gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-[#8C6D58] shrink-0 mt-0.5" />
                  <span>
                    หากร้านเปิดข้ามเที่ยงคืน แนะนำตั้งไว้ที่ <strong>05:00 น.</strong> เพื่อให้ยอดขายตี 1–4
                    นับรวมในวันขายเดิม ไม่ถูกตัดรอบแยกกะข้ามวัน
                  </span>
                </p>
              </div>

              {/* 2. เวลาส่งต่อกะค้างตรวจ */}
              <div className="space-y-2">
                <label
                  htmlFor="shift-escalation-hours-input"
                  className="block text-sm font-medium text-[#2D241E]"
                >
                  ระยะเวลาส่งต่อกะค้างตรวจ (Shift Escalation)
                </label>
                <div className="relative">
                  <input
                    id="shift-escalation-hours-input"
                    type="text"
                    inputMode="numeric"
                    value={escalationHoursInput}
                    onChange={(e) => {
                      setEscalationHoursInput(e.target.value);
                      setSuccess(null);
                      setError(null);
                    }}
                    disabled={isLoading || isLoadError || isSaving || !isOwner}
                    aria-describedby={escalationHelpId}
                    className="w-full px-3 py-2.5 pr-20 bg-white border border-[#d9c6b0] rounded-xl text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="4"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-500 pointer-events-none">
                    ชั่วโมง
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400">เลือกด่วน:</span>
                  {[2, 4, 8, 24].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      onClick={() => handleEscalationPreset(hours)}
                      disabled={isLoading || isLoadError || isSaving || !isOwner}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 ${
                        parsedEscalation === hours
                          ? 'bg-[#8C6D58] text-white border-[#8C6D58]'
                          : 'bg-[#FAF7F2] text-stone-600 border-[#E8DFD5] hover:border-[#8C6D58]'
                      } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                    >
                      {hours} ชม.{hours === 4 ? ' (แนะนำ)' : ''}
                    </button>
                  ))}
                </div>

                <p
                  id={escalationHelpId}
                  className="text-xs text-stone-500 leading-relaxed flex items-start gap-1.5"
                >
                  <History className="w-3.5 h-3.5 text-[#8C6D58] shrink-0 mt-0.5" />
                  <span>
                    หากผู้จัดการไม่ตรวจกะที่เงินไม่ตรงภายในเวลานี้ ระบบจะส่งต่อให้เจ้าของร้านเป็นผู้ตรวจรับรองเพียงผู้เดียว
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* เส้นคั่นบาง */}
          <hr className="border-[#E8DFD5]/80" />

          {/* กลุ่มที่ 2: การจัดการสต็อกวัตถุดิบ */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-[#2D241E] font-medium text-sm">
              <Package className="w-4 h-4 text-[#8C6D58]" />
              <span>การจัดการคลังและสต็อก (Inventory Alert)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 3. เกณฑ์แจ้งเตือนสต็อกไม่ตรง */}
              <div className="space-y-2">
                <label
                  htmlFor="inventory-variance-input"
                  className="block text-sm font-medium text-[#2D241E]"
                >
                  เกณฑ์แจ้งเตือนส่วนต่างสต็อก (Stock Variance Alert)
                </label>
                <div className="relative">
                  <input
                    id="inventory-variance-input"
                    type="text"
                    inputMode="decimal"
                    value={varianceAlertInput}
                    onChange={(e) => {
                      setVarianceAlertInput(e.target.value);
                      setSuccess(null);
                      setError(null);
                    }}
                    disabled={isLoading || isLoadError || isSaving || !isOwner}
                    aria-describedby={inventoryHelpId}
                    className="w-full px-3 py-2.5 pr-14 bg-white border border-[#d9c6b0] rounded-xl text-sm text-[#2D241E] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/20 focus:border-[#8C6D58] transition-colors disabled:bg-stone-50 disabled:cursor-not-allowed"
                    placeholder="20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-stone-500 pointer-events-none">
                    %
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-400">เลือกด่วน:</span>
                  {[10, 20, 30, 50].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      onClick={() => handleVariancePreset(percent)}
                      disabled={isLoading || isLoadError || isSaving || !isOwner}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/30 ${
                        parsedVariance === percent
                          ? 'bg-[#8C6D58] text-white border-[#8C6D58]'
                          : 'bg-[#FAF7F2] text-stone-600 border-[#E8DFD5] hover:border-[#8C6D58]'
                      } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                    >
                      {percent}%{percent === 20 ? ' (มาตรฐาน)' : ''}
                    </button>
                  ))}
                </div>

                <p
                  id={inventoryHelpId}
                  className="text-xs text-stone-500 leading-relaxed flex items-start gap-1.5"
                >
                  <Info className="w-3.5 h-3.5 text-[#8C6D58] shrink-0 mt-0.5" />
                  <span>
                    บันทึกประวัติความปลอดภัย (Audit Log) เมื่อยอดตรวจนับจริงต่างจากระบบเกิน % ที่กำหนด (และต่างเกิน 1 หน่วย)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          {(error || success) && (
            <div
              role="alert"
              className={`px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 transition-all ${
                error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {error ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span className="flex-1 leading-relaxed">{error || success}</span>
            </div>
          )}

          {/* Action Button */}
          {isOwner && (
            <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD5]/60">
              <span className="text-xs text-stone-400">
                {hasChanges ? 'มีข้อมูลที่ยังไม่ได้บันทึก' : 'การตั้งค่าเป็นปัจจุบันแล้ว'}
              </span>
              <button
                type="submit"
                disabled={isLoading || isLoadError || isSaving || !hasChanges}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8C6D58] hover:bg-[#7a5c45] active:scale-[0.99] text-white text-sm font-medium rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าการทำงาน'}</span>
              </button>
            </div>
          )}
        </form>
      </section>

      {/* Confirmation Modal สำหรับการเปลี่ยนเวลาตัดรอบวันขาย */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-hour-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-kanit"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#E8DFD5] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 id="confirm-hour-title" className="text-base font-semibold text-[#2D241E]">
                  ยืนยันการเปลี่ยนเวลาเริ่มวันขาย?
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  กำลังจะเปลี่ยนเวลาเริ่มวันขายใหม่เป็น <strong>{businessDayStartHour}:00 น.</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                aria-label="ปิดกล่องข้อความ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
              <strong>ข้อควรระวัง:</strong> การเปลี่ยนเวลานี้จะมีผลต่อการคำนวณวันขายของระบบทันที
              หากร้านอาหารมีกะพนักงานที่กำลังเปิดขายอยู่ อาจทำให้ระบบมองว่ากะปัจจุบันไม่ตรงกับวันขายใหม่
              และส่งผลต่อการเปิดบิลหรือคิดเงิน
              <br />
              <br />
              <span className="font-medium text-amber-950">
                👉 แนะนำให้ทำการเปลี่ยนหลังจากปิดกะรอบวันเรียบร้อยแล้วเท่านั้น
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-4 py-2 border border-[#d9c6b0] text-stone-700 hover:bg-[#FAF7F2] text-sm rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8C6D58] hover:bg-[#7a5c45] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'ยืนยันและบันทึก'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
