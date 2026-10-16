import { Search, X } from "lucide-react"
import { useState } from "react"

interface SearchBarProps {
    value?: string
    onSearch: (value: string) => void
    placeholder?: string
}

export default function SearchBar({ value, onSearch, placeholder = "ค้นหาชื่อเมนู..." }: SearchBarProps) {
    const [internalText, setInternalText] = useState("")
    const isControlled = value !== undefined
    const searchText = isControlled ? value : internalText

    const handleChange = (newVal: string) => {
        if (!isControlled) {
            setInternalText(newVal)
        }
        onSearch(newVal)
    }

    const handleClear = () => {
        handleChange("")
    }

    return (
        <div className="relative w-full max-w-md flex items-center group">
            <Search className="absolute left-3 w-4 h-4 text-[#A89887] transition-colors group-focus-within:text-[#7A5E3F] pointer-events-none" />

            <input
                type="text"
                value={searchText}
                placeholder={placeholder}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full h-8 pl-9 pr-9 bg-[#F5EFE6]/60 hover:bg-[#F5EFE6] focus:bg-white text-sm text-[#2D241E] placeholder:text-[#A89887] rounded-xl border border-[#DECDBB] focus:border-[#B39371] focus:ring-2 focus:ring-[#B39371]/20 focus:outline-none transition-all font-kanit"
            />

            {searchText && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2.5 p-0.5 rounded-full text-[#A89887] hover:text-[#5C452D] hover:bg-[#E8DDD0] transition-colors cursor-pointer"
                    title="ล้างข้อความ"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    )
}
