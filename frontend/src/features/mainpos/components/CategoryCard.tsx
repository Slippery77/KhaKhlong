interface CategoryCardProps {
    name: string;
    isActive: boolean;
    onClick: () => void;
    variant?: 'vertical' | 'pill';
}

export default function CategoryCard({ name, isActive, onClick, variant = 'vertical' }: CategoryCardProps) {
    if (variant === 'pill') {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer font-kanit select-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8C6D58] ${
                    isActive
                        ? "bg-[#8C6D58] text-white shadow-xs font-semibold"
                        : "bg-white text-[#7A6B5F] border border-[#E2D6C5] hover:bg-[#FAF7F2] hover:text-stone-900"
                }`}
            >
                {name}
            </button>
        );
    }

    return (
        <div
            onClick={onClick}
            className={`w-28 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none transition-all duration-200 font-kanit ${
                isActive
                    ? "bg-[#AA8971] text-white shadow-sm"
                    : "text-[#7A6B5F] hover:bg-[#EFE8DD]/70 hover:text-stone-800"
            }`}
        >
            <span className="text-l font-medium tracking-wide">
                {name}
            </span>
        </div>
    );
}
