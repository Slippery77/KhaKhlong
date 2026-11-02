import { useState } from 'react';
import { useSales } from '../context/SalesContext';
import { TrendingUp, Calendar, Clock, ChevronDown } from 'lucide-react';
import type { TimeFilter } from '../types/sales.types';

export default function SalesHeader() {
    const {
        filter,
        setFilter,
        viewMode,
        setViewMode,
        startDate,
        endDate,
        setDateRange,
        selectedShiftId,
        setSelectedShiftId,
        availableShifts,
        isLoadingShifts
    } = useSales();

    const [customStart, setCustomStart] = useState(startDate);
    const [customEnd, setCustomEnd] = useState(endDate);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const filterOptions: { label: string; value: TimeFilter }[] = [
        { label: 'วันนี้', value: 'TODAY' },
        { label: 'สัปดาห์', value: 'WEEK' },
        { label: 'เดือน', value: 'MONTH' },
    ];

    const handleApplyDateRange = (e: React.FormEvent) => {
        e.preventDefault();
        if (customStart && customEnd) {
            setDateRange(customStart, customEnd);
            setShowDatePicker(false);
        }
    };

    const handleClearDateRange = () => {
        setCustomStart('');
        setCustomEnd('');
        setDateRange('', '');
        setShowDatePicker(false);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-kanit">
            {/* Title & Icon */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white border border-[#E8DFD5] shadow-xs flex items-center justify-center text-[#8C6D58]">
                    <TrendingUp className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-[#2D241E]">
                        รายงานยอดขาย
                    </h1>
                    <p className="text-xs text-stone-500 mt-0.5">
                        ตรวจสอบสรุปรายรับ-รายจ่าย ประวัติบิล และประสิทธิภาพการขาย
                    </p>
                </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
                {/* View Mode Toggle: ช่วงเวลา vs ตามกะ */}
                <div className="inline-flex bg-stone-200/60 p-1 rounded-full">
                    <button
                        type="button"
                        onClick={() => setViewMode('PERIOD')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${viewMode === 'PERIOD'
                                ? 'bg-[#8C6D58] text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                    >
                        ช่วงเวลา
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('SHIFT')}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${viewMode === 'SHIFT'
                                ? 'bg-[#8C6D58] text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        ตามกะ
                    </button>
                </div>

                {viewMode === 'PERIOD' ? (
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Quick Period Filter Pills */}
                        <div className="inline-flex bg-stone-200/60 p-1 rounded-full gap-1">
                            {filterOptions.map((opt) => {
                                const isActive = !startDate && filter === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            setCustomStart('');
                                            setCustomEnd('');
                                            setFilter(opt.value);
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${isActive
                                                ? 'bg-white text-[#2D241E] shadow-xs'
                                                : 'text-stone-600 hover:text-stone-900'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Range Button & Popover */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${startDate && endDate
                                        ? 'bg-[#8C6D58]/10 border-[#8C6D58] text-[#8C6D58]'
                                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                                    }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                {startDate && endDate ? `${startDate} ~ ${endDate}` : 'เลือกวันที่'}
                                <ChevronDown className="w-3 h-3 text-stone-400" />
                            </button>

                            {showDatePicker && (
                                <form
                                    onSubmit={handleApplyDateRange}
                                    className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 z-50 flex flex-col gap-3 font-kanit"
                                >
                                    <div className="text-xs font-semibold text-[#2D241E]">กำหนดช่วงวันที่</div>
                                    <div className="flex flex-col gap-2">
                                        <div>
                                            <label className="text-[11px] text-stone-500 block mb-1">วันที่เริ่มต้น</label>
                                            <input
                                                type="date"
                                                value={customStart}
                                                onChange={(e) => setCustomStart(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-hidden focus:border-[#8C6D58]"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-stone-500 block mb-1">วันที่สิ้นสุด</label>
                                            <input
                                                type="date"
                                                value={customEnd}
                                                onChange={(e) => setCustomEnd(e.target.value)}
                                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stone-200 focus:outline-hidden focus:border-[#8C6D58]"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                                        <button
                                            type="button"
                                            onClick={handleClearDateRange}
                                            className="text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                                        >
                                            รีเซ็ต
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowDatePicker(false)}
                                                className="px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                                            >
                                                ยกเลิก
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-3 py-1 text-xs bg-[#8C6D58] text-white rounded-lg hover:bg-[#7a5c45] transition-colors cursor-pointer"
                                            >
                                                ค้นหา
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Shift Selector Dropdown */
                    <div className="flex items-center gap-2">
                        {isLoadingShifts ? (
                            <div className="text-xs text-stone-400 py-1.5 px-3 bg-white rounded-xl border border-stone-200">
                                กำลังโหลดกะ...
                            </div>
                        ) : !Array.isArray(availableShifts) || availableShifts.length === 0 ? (
                            <div className="text-xs text-stone-400 py-1.5 px-3 bg-white rounded-xl border border-stone-200">
                                ไม่พบข้อมูลกะ
                            </div>
                        ) : (
                            <div className="relative">
                                <select
                                    value={selectedShiftId}
                                    onChange={(e) => setSelectedShiftId(e.target.value)}
                                    aria-label="เลือกกะที่ต้องการดูรายงาน"
                                    className="appearance-none bg-white border border-stone-200/90 text-[#2D241E] text-xs rounded-xl pl-3 pr-8 py-2 font-medium shadow-2xs hover:border-[#8C6D58] focus:outline-hidden focus:ring-2 focus:ring-[#8C6D58]/20 cursor-pointer"
                                >
                                    {availableShifts.map((s) => {
                                        const openTime = s.openedAt ? new Date(s.openedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
                                        const closeTime = s.closedAt ? new Date(s.closedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'ยังเปิดอยู่';
                                        return (
                                            <option key={s.shiftId} value={s.shiftId}>
                                                {s.businessDate} ({openTime} - {closeTime}) • {s.openedBy}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
