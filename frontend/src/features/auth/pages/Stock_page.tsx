import { useState } from "react"
import Header from "../../../components/Header"
import { Package, Plus, Pencil, Trash2, AlertTriangle, Search ,Minus} from "lucide-react"

interface Ingredients {
    id : number,
    name: string
    amount: number
    unit: string
    minimun: number
    priceperunit: number
}

export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState<string>("")
    const [openAddIngredientMenu, setOpenAddIngredientMenu] = useState<boolean>(false)
    const [editingId , setEditingId] = useState<number | null >(null);
    const [adjustStockId , setadjustStockId] = useState<number | null>(null);
    const [tempAmount , settempAmount] = useState<number>(0);

    const [formData, setFormData] = useState<Ingredients>({
        id : 0 ,
        name: '',
        amount: 0,
        unit: 'กก.',
        minimun: 0,
        priceperunit: 0
    })

    const [ingredients, setIngredients] = useState<Ingredients[]>([
        {id:1 , name: 'หมูสามชั้น', amount: 5, unit: 'กก.', minimun: 2, priceperunit: 180 },
        {id:2 , name: 'ไก่', amount: 8, unit: 'กก.', minimun: 3, priceperunit: 90 },
        {id:3 , name: 'กุ้งแช่แข็ง', amount: 2, unit: 'กก.', minimun: 2, priceperunit: 220 },
        {id:4 , name: 'ปลาหมึก', amount: 3, unit: 'กก.', minimun: 1, priceperunit: 160 },
        {id:5 , name: 'ไข่ไก่', amount: 120, unit: 'ชิ้น', minimun: 30, priceperunit: 5 },
        {id:6 , name: 'ข้าวสาร', amount: 25, unit: 'กก.', minimun: 10, priceperunit: 28 },
        {id:7 , name: 'น้ำมันพืช', amount: 4, unit: 'ลิตร', minimun: 2, priceperunit: 55 },
        {id:8 , name: 'กระเทียม', amount: 1.5, unit: 'กก.', minimun: 0.5, priceperunit: 70 },
    ])

    const lowStockIngredient = ingredients.filter((item) => item.amount <= item.minimun)
    const isStocklow = lowStockIngredient.length > 0

    function onAddtoIngredients(data: Ingredients) {
        if (!data.name.trim()) {
            alert("กรุณาระบุชื่อวัตถุดิบ")
            return
        }
        const isDuplicate = ingredients.find((item) => item.name === data.name)
        if (isDuplicate || data.amount < 0 || data.minimun < 0 || data.priceperunit < 0) {
            alert("ข้อมูลผิดพลาด โปรดตรวจสอบดูอีกครั้ง")
            return
        }
        setIngredients((prev) => [
            ...prev,
            {
                id:Date.now(),
                name:data.name,
                amount:data.amount,
                unit:data.unit,
                minimun:data.minimun,
                priceperunit:data.priceperunit
            }
        ])

        setFormData({
            id : 0,
            name: '',
            amount: 0,
            unit: 'กก.',
            minimun: 0,
            priceperunit: 0
        })
        setOpenAddIngredientMenu(false)
    }

    function onDeleteFormIngredients (id:number) {
        setIngredients((prev)=>{
            const updateIngredient = prev.filter((item)=>item.id!==id)
            return updateIngredient;
        })
    }

    function onUpdateIngredient (data:Ingredients) {
        if (!data.name.trim()) {
            alert("กรุณาระบุชื่อวัตถุดิบ")
            return
        }
        const isDuplicate = ingredients.find((item) => item.name === data.name && item.id !== data.id)
        if (isDuplicate || data.amount < 0 || data.minimun < 0 || data.priceperunit <0) {
            alert("ข้อมูลผิดพลาด โปรดตรวจสอบดูอีกครั้ง")
            return
        }
        setIngredients((prev)=>
            prev.map((i)=> (i.id === data.id ? 
                {...i, 
                    name:data.name,
                    amount:data.amount,
                    unit:data.unit,
                    minimun:data.minimun,
                    priceperunit:data.priceperunit
                } : i))
        )
        setFormData({
            id : 0,
            name: '',
            amount: 0,
            unit: 'กก.',
            minimun: 0,
            priceperunit: 0
        })

        setEditingId(null);

    }

    function onadjustAmount (id:number , newAmount:number) {
        if(newAmount<0){
            alert("จำนวนวัตถุดิบติดลบ โปรดลองใหม่อีกครั้ง")
            return;
        }
        setIngredients((prev)=>
            prev.map((item)=> item.id===id ? {
                ...item,
                amount:newAmount
            } : item)
        )
    }
    

    const filteredIngredients = ingredients.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen w-full bg-[#FAF7F2] font-kanit text-[#2D241E] flex flex-col select-none">
            <Header />

            {/* เนื้อหาเต็มความกว้างจอ (Full Width) */}
            <main className="flex-1 w-full px-8 py-6 flex flex-col">
                {/* หัวข้อและปุ่มเพิ่มวัตถุดิบ */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <Package className="w-6 h-6 text-[#8C6D58]" />
                        <h1 className="text-lg font-bold text-[#2D241E]">วัตถุดิบ / สต็อก</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {isStocklow && (
                            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C27803] text-white text-sm font-medium shadow-2xs">
                                <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                                <span>ใกล้หมด {lowStockIngredient.length} รายการ</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setOpenAddIngredientMenu((prev) => !prev)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8C6D58] hover:bg-[#785D48] text-white text-sm font-medium transition-colors shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>เพิ่มวัตถุดิบ</span>
                        </button>
                    </div>
                </div>

                {/* ช่องค้นหาวัตถุดิบ */}
                <div className="mb-6">
                    <div className="relative w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหาวัตถุดิบ..."
                            className="w-full pl-9 pr-4 py-2 bg-white rounded-full border border-stone-200/90 text-sm text-[#2D241E] placeholder:text-stone-400 focus:outline-none focus:border-[#8C6D58] focus:ring-1 focus:ring-[#8C6D58]/30 transition-all shadow-2xs"
                        />
                    </div>
                </div>

                {/* ตารางรายการวัตถุดิบขยายเต็มหน้าจอ */}
                <div className="w-full overflow-x-auto flex-1">
                    {/* ส่วนหัวของตาราง */}
                    <div className="grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(220px,auto)] items-center gap-6 px-4 py-3.5 text-sm font-medium text-stone-600 border-b border-[#E8DFD5]">
                        <span>วัตถุดิบ</span>
                        <span>จำนวน</span>
                        <span>หน่วย</span>
                        <span>ขั้นต่ำ</span>
                        <span>ราคา/หน่วย</span>
                        <span></span>
                    </div>

                    {/* ฟอร์มเพิ่มวัตถุดิบ (แสดงเมื่อกดปุ่มเพิ่ม) */}
                    {openAddIngredientMenu && (
                        <div className="grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(220px,auto)] items-center gap-6 px-4 py-3.5 border-b border-[#E8DFD5] bg-[#FAF7F2]">
                            <div>
                                <input
                                    title="ชื่อวัตถุดิบ"
                                    type="text"
                                    placeholder="ชื่อวัตถุดิบ"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full max-w-sm bg-white border-2 border-[#C4A88E] rounded-xl px-4 py-2 text-sm text-[#2D241E] placeholder:text-stone-400 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <input
                                    title="จำนวน"
                                    type="number"
                                    placeholder="0"
                                    value={formData.amount === 0 ? '' : formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                    className="w-28 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                />
                            </div>

                            <div>
                                <select
                                    title="หน่วย"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="w-28 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58] cursor-pointer"
                                >
                                    <option value="กก.">กก.</option>
                                    <option value="กรัม">กรัม</option>
                                    <option value="ลิตร">ลิตร</option>
                                    <option value="มล.">มล.</option>
                                    <option value="ชิ้น">ชิ้น</option>
                                    <option value="กล่อง">กล่อง</option>
                                    <option value="ถุง">ถุง</option>
                                </select>
                            </div>

                            <div>
                                <input
                                    title="ขั้นต่ำ"
                                    type="number"
                                    placeholder="0"
                                    value={formData.minimun === 0 ? '' : formData.minimun}
                                    onChange={(e) => setFormData({ ...formData, minimun: Number(e.target.value) })}
                                    className="w-28 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                />
                            </div>

                            <div>
                                <input
                                    title="ราคา/หน่วย"
                                    type="number"
                                    placeholder="0"
                                    value={formData.priceperunit === 0 ? '' : formData.priceperunit}
                                    onChange={(e) => setFormData({ ...formData, priceperunit: Number(e.target.value) })}
                                    className="w-32 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => onAddtoIngredients(formData)}
                                    className="px-4 py-2 bg-[#8C6D58] hover:bg-[#785D48] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer shadow-2xs"
                                >
                                    เพิ่ม
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOpenAddIngredientMenu(false)}
                                    className="px-3.5 py-2 bg-[#EFE8DC] hover:bg-[#E5DCCF] text-stone-600 text-sm font-medium rounded-xl transition-colors cursor-pointer"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    )}

                    {/* รายการวัตถุดิบ */}
                    <div className="divide-y divide-[#E8DFD5]/70">
                        {filteredIngredients.map((item) => {
                            const isLow = item.amount <= item.minimun
                            const isEditing = editingId === item.id
                            

                            if(!isEditing){
                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(220px,auto)] items-center gap-6 px-4 py-4 hover:bg-white/40 transition-colors text-sm"
                                    >
                                    <div className="flex items-center gap-2">
                                            {isLow && (
                                                <AlertTriangle className="w-4 h-4 text-[#C27803] shrink-0 stroke-[2.2]" />
                                            )}
                                            <span className="font-normal text-[#2D241E]">{item.name}</span>
                                        </div>

                                        <div>
                                            <span className={`font-semibold ${isLow ? "text-rose-500" : "text-[#2D241E]"}`}>
                                                {item.amount}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-stone-600">{item.unit}</span>
                                        </div>

                                        <div>
                                            <span className="text-stone-600">{item.minimun}</span>
                                        </div>

                                        <div>
                                            <span className="text-stone-600">฿{item.priceperunit}</span>
                                        </div>

                                        <div className="flex items-center justify-end gap-2.5">
                                            <button
                                                type="button"
                                                className="px-3.5 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#DECDBB] hover:bg-[#EFE8DC] text-[#7A5E3F] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                                                onClick={() => {
                                                    setadjustStockId(item.id)
                                                    settempAmount(item.amount)
                                                    setEditingId(null)
                                                }}
                                            >
                                                ปรับสต็อก
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-[#EFE8DC]/60 rounded-lg transition-colors cursor-pointer"
                                                title="แก้ไข"
                                                onClick={() => {
                                                    setEditingId(item.id)
                                                    setFormData(item)
                                                    setadjustStockId(null)
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                title="ลบ"
                                                onClick={()=>onDeleteFormIngredients(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {adjustStockId === item.id && (
                                            <div className="col-span-full flex items-center gap-3 pt-3 pb-1 border-t border-[#E8DFD5]/60 text-sm">
                                                <span className="font-normal text-[#2D241E]">
                                                    ปรับ {item.name} ({item.amount} {item.unit})
                                                </span>

                                                <div className="flex items-center border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => settempAmount((prev) => Math.max(0, prev - 1))}
                                                        className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>

                                                    <input
                                                        type="number"
                                                        value={tempAmount}
                                                        onChange={(e) => settempAmount(Math.max(0, Number(e.target.value)))}
                                                        className="w-16 py-1 text-center font-medium text-[#2D241E] text-sm border-x border-stone-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() => settempAmount((prev) => prev + 1)}
                                                        className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors cursor-pointer"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <span className="text-stone-600">{item.unit}</span>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onadjustAmount(item.id, tempAmount)
                                                        setadjustStockId(null)
                                                    }}
                                                    className="px-3 py-1 bg-[#8C6D58] hover:bg-[#785D48] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs ml-1"
                                                >
                                                    ตกลง
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setadjustStockId(null)}
                                                    className="text-stone-500 hover:text-stone-700 text-xs font-medium transition-colors cursor-pointer"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            if(isEditing){
                                return (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.2fr)_minmax(220px,auto)] items-center gap-6 px-4 py-3.5 border-b border-[#E8DFD5] bg-[#FAF7F2]">
                                        <div>
                                            <input
                                                title="ชื่อวัตถุดิบ"
                                                type="text"
                                                placeholder={item.name}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value , id:item.id })}
                                                className="w-full max-w-sm bg-white border-2 border-[#C4A88E] rounded-xl px-4 py-2 text-sm text-[#2D241E] placeholder:text-stone-400 focus:outline-none"
                                                autoFocus
                                            />
                                        </div>

                                        <div>
                                            <input
                                                title="จำนวน"
                                                type="number"
                                                placeholder={(item.amount).toString()}
                                                value={formData.amount === 0 ? '' : formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                className="w-28 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                            />
                                        </div>

                                        <div>
                                            <select
                                                title="หน่วย"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                className="w-28 bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58] cursor-pointer"
                                            >
                                                <option value="กก.">กก.</option>
                                                <option value="กรัม">กรัม</option>
                                                <option value="ลิตร">ลิตร</option>
                                                <option value="มล.">มล.</option>
                                                <option value="ชิ้น">ชิ้น</option>
                                                <option value="กล่อง">กล่อง</option>
                                                <option value="ถุง">ถุง</option>
                                            </select>
                                        </div>

                                        <div>
                                            <input
                                                title="ขั้นต่ำ"
                                                type="number"
                                                placeholder={(item.minimun).toString()}
                                                value={formData.minimun ===0 ? '':formData.minimun}
                                                onChange={(e) => setFormData({ ...formData, minimun: Number(e.target.value) })}
                                                className="w-28 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                            />
                                        </div>

                                        <div>
                                            <input
                                                title="ราคา/หน่วย"
                                                type="number"
                                                placeholder={(item.priceperunit).toString()}
                                                value={formData.priceperunit === 0 ? '' : formData.priceperunit}
                                                onChange={(e) => setFormData({ ...formData, priceperunit: Number(e.target.value) })}
                                                className="w-32 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-sm text-[#2D241E] focus:outline-none focus:border-[#8C6D58]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateIngredient(formData)}
                                                className="px-4 py-2 bg-[#8C6D58] hover:bg-[#785D48] text-white text-sm font-medium rounded-xl transition-colors cursor-pointer shadow-2xs"
                                            >
                                                บันทึก
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingId(null)
                                                    setFormData({
                                                        id : 0,
                                                        name: '',
                                                        amount: 0,
                                                        unit: 'กก.',
                                                        minimun: 0,
                                                        priceperunit: 0
                                                    })
                                                }}
                                                className="px-3.5 py-2 bg-[#EFE8DC] hover:bg-[#E5DCCF] text-stone-600 text-sm font-medium rounded-xl transition-colors cursor-pointer"
                                            >
                                                ยกเลิก
                                            </button>
                                        </div>
                                    </div>
                                )
                            }
                        })}
                    </div>
                </div>
            </main>
        </div>
    )
}