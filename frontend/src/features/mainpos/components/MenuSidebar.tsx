import CategoryCard from "./CategoryCard"
import type { Category } from "../types/item.types";

interface Props {
    categories: Category[];
    seletedCategory: string;
    onSelectCategory: (categoryTitle: string) => void;
    isLoading?: boolean;
}

export default function MenuSidebar({
    categories,
    seletedCategory,
    onSelectCategory,
    isLoading = false,
}: Props) {
    if (isLoading && categories.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 w-full font-kanit" aria-busy="true">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="w-28 h-20 rounded-2xl bg-[#EDE3D6]/70 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3 w-full font-kanit">
            {categories.map((c) => (
                <CategoryCard
                    key={c.category_id}
                    name={c.name}
                    isActive={seletedCategory === c.category_id}
                    onClick={() => onSelectCategory(c.category_id)}
                />
            ))}
        </div>
    );
}
