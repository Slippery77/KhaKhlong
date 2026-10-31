
interface CategoryCardProps {
    name: string;
    isActive: boolean;
    onClick: () => void;
}

export default function CategoryCard({ name, isActive, onClick }: CategoryCardProps) {
    return (
        <div
            onClick={onClick}
            className={`w-28 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none transition-all duration-200 font-kanit ${isActive
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