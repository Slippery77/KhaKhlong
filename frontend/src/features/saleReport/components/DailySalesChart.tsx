import { useMemo, useState } from 'react';
import { useSales } from '../context/SalesContext';

export default function DailySalesChart() {
    const { chartData, chartTitle, metrics } = useSales();
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Compute max for y-axis ticks (round up to nearest 100 or 360)
    const { maxVal, yTicks } = useMemo(() => {
        const highestSale = Math.max(...chartData.map((d) => d.totalSales), 0);
        let max = 360;
        if (highestSale > 360) {
            max = Math.ceil(highestSale / 100) * 100;
        }

        const ticks = [
            max,
            Math.round(max * 0.75),
            Math.round(max * 0.5),
            Math.round(max * 0.25),
            0,
        ];
        return { maxVal: max, yTicks: ticks };
    }, [chartData]);

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs flex flex-col font-kanit">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D241E]">
                    {chartTitle}
                </h3>
                <span className="text-xs font-medium text-stone-500 bg-stone-100/80 px-2.5 py-0.5 rounded-full">
                    {metrics.totalBillsCount} บิล
                </span>
            </div>

            {/* Chart Area */}
            <div className="relative h-52 flex pt-2 pb-1">
                {/* Y-Axis labels */}
                <div className="w-11 flex flex-col justify-between items-start text-[10px] text-stone-400 select-none pb-5">
                    {yTicks.map((tick, idx) => (
                        <span key={idx} className="leading-none">
                            ฿{tick}
                        </span>
                    ))}
                </div>

                {/* Graph grid & bars */}
                <div className="flex-1 flex flex-col relative">
                    {/* Horizontal gridlines */}
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-5">
                        {yTicks.map((_, idx) => (
                            <div
                                key={idx}
                                className="w-full border-b border-stone-100/90"
                            />
                        ))}
                    </div>

                    {/* Bars Container */}
                    <div className="flex-1 flex items-end justify-between gap-1.5 pb-5 z-10">
                        {chartData.map((item, idx) => {
                            const barHeightPercent = maxVal > 0 ? (item.totalSales / maxVal) * 100 : 0;
                            const isHovered = hoveredIndex === idx;

                            return (
                                <div
                                    key={`${item.label}-${idx}`}
                                    onMouseEnter={() => setHoveredIndex(idx)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                                >
                                    {/* Tooltip on hover */}
                                    {isHovered && item.totalSales > 0 && (
                                        <div className="absolute -top-10 bg-[#2D241E] text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-30 animate-in fade-in duration-100 pointer-events-none">
                                            <span>฿{item.totalSales.toLocaleString()}</span>
                                            <span className="text-stone-300 text-[10px] ml-1">
                                                ({item.billCount} บิล)
                                            </span>
                                        </div>
                                    )}

                                    {/* Bar Pillar */}
                                    <div
                                        className="w-full max-w-[28px] rounded-t-md transition-all duration-300 relative"
                                        style={{
                                            height: `${Math.max(barHeightPercent, item.totalSales > 0 ? 4 : 0)}%`,
                                            backgroundColor:
                                                item.totalSales > 0
                                                    ? isHovered
                                                        ? '#8C6D58'
                                                        : item.isHighlight
                                                        ? '#A68874'
                                                        : '#C4B29E'
                                                    : 'transparent',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* X-Axis labels */}
                    <div className="absolute bottom-0 inset-x-0 flex justify-between text-[11px] text-stone-500 pt-1 select-none">
                        {chartData.map((item, idx) => (
                            <div
                                key={`${item.label}-${idx}`}
                                className={`flex-1 text-center truncate px-0.5 ${
                                    item.isHighlight ? 'font-semibold text-[#8C6D58]' : ''
                                }`}
                                title={item.label}
                            >
                                {item.label.replace('สัปดาห์ที่ ', 'สัปดาห์ ')}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
