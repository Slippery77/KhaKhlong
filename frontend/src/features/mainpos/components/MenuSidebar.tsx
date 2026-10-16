import CategoryCard from "./CategoryCard"
import { UtensilsCrossed, IceCreamCone, Croissant, CupSoda } from "lucide-react"
import type { Category } from "../types/item.types";

// TODO (หมวดจริงจาก API)
//   - ลบ useState mockup ข้างล่าง แล้วรับ categories เป็น prop จาก MainPOS
//     (MainPOS เป็นคนเรียก useFullMenu ที่เดียว ไม่ต้องเรียก API ซ้ำในนี้)
//   - API ไม่มี icon → ทำตัวเลือก icon เอง เช่น
//       const ICONS: Record<string, React.ReactNode> = { 'เครื่องดื่ม': <CupSoda />, 'ของหวาน': <IceCreamCone /> ... }
//       icon = ICONS[c.name] ?? <UtensilsCrossed />   ← หมวดที่ไม่รู้จักใช้ icon กลาง
//   - เทียบ isActive ด้วย category_id แทน title และ onSelectCategory(c.category_id)
//   - interface Category ข้างล่างจะชนชื่อกับ type ของ API → เปลี่ยนชื่อเป็น SidebarCategory หรือใช้ของ pos.types



interface Props {
    categories:Category[];
    seletedCategory: string,
    onSelectCategory: (categoryTitle: string) => void;
}
export default function MenuSidebar({categories,seletedCategory,onSelectCategory}:Props) {

    return (
        <div className="flex flex-col items-center gap-3 w-full font-kanit">
            {categories.map(c => (
                <CategoryCard 
                key={c.category_id} 
                name={c.name} 
                icon={<UtensilsCrossed/>}
                isActive={seletedCategory === c.category_id} 
                onClick={() => onSelectCategory(c.category_id)} />
            ))}
        </div>
    )
}