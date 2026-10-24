import { useState } from "react";
import { ArrowRight, Store, Phone, MapPin } from "lucide-react";

interface restaurant_formstate {
    restaurant_name: string;
    tenant_slug: string;
    phone: string;
    house_number: string;
    moo: string;
    soi: string;
    road: string;
    subdistrict: string;
    district: string;
    province: string;
    postal_code: string;
}

//สร้าง props เพื่อให้ต้องรับ function ชื่อ onNext จาก component แม่ (Register_page) เพื่อให้สามารถเรียกใช้งานได้เมื่อ form ถูก submit สำเร็จ
type Props = {
    initialValues?: Partial<restaurant_formstate>;
    onNext: (data: restaurant_formstate) => void;
};

export function Register_RestaurantForm({ initialValues, onNext }: Props) {
    const [formState, setFormState] = useState<restaurant_formstate>({
        restaurant_name: initialValues?.restaurant_name ?? "",
        tenant_slug: initialValues?.tenant_slug ?? "",
        phone: initialValues?.phone ?? "",
        house_number: initialValues?.house_number ?? "",
        moo: initialValues?.moo ?? "",
        soi: initialValues?.soi ?? "",
        road: initialValues?.road ?? "",
        subdistrict: initialValues?.subdistrict ?? "",
        district: initialValues?.district ?? "",
        province: initialValues?.province ?? "",
        postal_code: initialValues?.postal_code ?? "",
    });

    const handleChange = (field: keyof restaurant_formstate, value: string) => {
        setFormState((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    const [errors, setError] = useState<Record<string, string>>({});
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newErrors = {
            restaurant_name: formState.restaurant_name.trim() === "" ? "กรุณากรอกชื่อร้าน" : "",
            tenant_slug: formState.tenant_slug.trim() === "" ? "กรุณากรอก Tenant Slug" : "",
            phone: formState.phone.trim() === "" ? "กรุณากรอกเบอร์โทรศัพท์" : "",
            house_number: formState.house_number.trim() === "" ? "กรุณากรอกบ้านเลขที่" : "",
            subdistrict: formState.subdistrict.trim() === "" ? "กรุณากรอกตำบล" : "",
            district: formState.district.trim() === "" ? "กรุณากรอกอำเภอ" : "",
            province: formState.province.trim() === "" ? "กรุณากรอกจังหวัด" : "",
            postal_code: formState.postal_code.trim() === "" ? "กรุณากรอกรหัสไปรษณีย์" : "",
        };
        setError(newErrors);
        const hasErrors = Object.values(newErrors).some((msg) => msg !== "");
        if (hasErrors) {
            return;
        }
        onNext(formState);
    };

    const inputClass = (field: string) =>
        `h-12 w-full rounded-xl border bg-white px-4 text-[#2D241E] placeholder:text-[#9B8E82] transition-colors duration-200 focus:outline-none focus:ring-2 ${
            errors[field]
                ? "border-[#D98C7E] focus:border-[#A33B2A] focus:ring-[#A33B2A]/20"
                : "border-[#d9c6b0] focus:border-[#8C6D58] focus:ring-[#8C6D58]/20"
        }`;
    const labelClass = "mb-2 block text-sm font-medium text-[#2D241E]";
    const errorClass = "mt-1 text-sm text-[#A33B2A]";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* ── ข้อมูลร้าน ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-[#2D241E]">
                <Store className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                <h2 className="text-base font-semibold">ข้อมูลร้านอาหาร</h2>
            </div>

            <div>
                <label className={labelClass} htmlFor="restaurant_name">
                    ชื่อร้านอาหาร
                </label>
                <input
                    id="restaurant_name"
                    type="text"
                    placeholder="เช่น ครัวคุณแม่"
                    value={formState.restaurant_name}
                    onChange={(e) => handleChange("restaurant_name", e.target.value)}
                    className={inputClass("restaurant_name")}
                />
                {errors.restaurant_name && (
                    <p className={errorClass}>{errors.restaurant_name}</p>
                )}
            </div>

            <div>
                <label className={labelClass} htmlFor="tenant_slug">
                    Tenant Slug
                </label>
                <input
                    id="tenant_slug"
                    type="text"
                    placeholder="เช่น my-restaurant"
                    value={formState.tenant_slug}
                    onChange={(e) => handleChange("tenant_slug", e.target.value)}
                    className={inputClass("tenant_slug")}
                />
                <p className="mt-1 text-xs text-[#7A6A5C]">
                    จะใช้เป็นที่อยู่สำหรับเข้าสู่ระบบ เช่น my-restaurant/login
                </p>
                {errors.tenant_slug && <p className={errorClass}>{errors.tenant_slug}</p>}
            </div>

            <div>
                <label className={labelClass} htmlFor="phone">
                    หมายเลขโทรศัพท์
                </label>
                <div className="relative">
                    <input
                        id="phone"
                        type="tel"
                        placeholder="0xx-xxx-xxxx"
                        value={formState.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        className={inputClass("phone") + " pl-11"}
                    />
                    <Phone
                        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B8E82]"
                        aria-hidden="true"
                    />
                </div>
                {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            {/* ── ที่อยู่ร้าน ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 border-t border-[#E8DFD5] pt-5 text-[#2D241E]">
                <MapPin className="h-4 w-4 text-[#8C6D58]" aria-hidden="true" />
                <h2 className="text-base font-semibold">ที่อยู่ร้านอาหาร</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                    <label className={labelClass} htmlFor="house_number">
                        บ้านเลขที่
                    </label>
                    <input
                        id="house_number"
                        type="text"
                        placeholder="เช่น 123"
                        value={formState.house_number}
                        onChange={(e) => handleChange("house_number", e.target.value)}
                        className={inputClass("house_number")}
                    />
                    {errors.house_number && (
                        <p className={errorClass}>{errors.house_number}</p>
                    )}
                </div>
                <div>
                    <label className={labelClass} htmlFor="moo">
                        หมู่
                    </label>
                    <input
                        id="moo"
                        type="text"
                        placeholder="1"
                        value={formState.moo}
                        onChange={(e) => handleChange("moo", e.target.value)}
                        className={inputClass("moo")}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor="soi">
                        ซอย
                    </label>
                    <input
                        id="soi"
                        type="text"
                        placeholder="เช่น ซอยสุขุมวิท 1"
                        value={formState.soi}
                        onChange={(e) => handleChange("soi", e.target.value)}
                        className={inputClass("soi")}
                    />
                </div>
                <div>
                    <label className={labelClass} htmlFor="road">
                        ถนน
                    </label>
                    <input
                        id="road"
                        type="text"
                        placeholder="เช่น ถนนสุขุมวิท"
                        value={formState.road}
                        onChange={(e) => handleChange("road", e.target.value)}
                        className={inputClass("road")}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor="subdistrict">
                        ตำบล
                    </label>
                    <input
                        id="subdistrict"
                        type="text"
                        placeholder="ตำบล"
                        value={formState.subdistrict}
                        onChange={(e) => handleChange("subdistrict", e.target.value)}
                        className={inputClass("subdistrict")}
                    />
                    {errors.subdistrict && (
                        <p className={errorClass}>{errors.subdistrict}</p>
                    )}
                </div>
                <div>
                    <label className={labelClass} htmlFor="district">
                        อำเภอ
                    </label>
                    <input
                        id="district"
                        type="text"
                        placeholder="อำเภอ"
                        value={formState.district}
                        onChange={(e) => handleChange("district", e.target.value)}
                        className={inputClass("district")}
                    />
                    {errors.district && <p className={errorClass}>{errors.district}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass} htmlFor="province">
                        จังหวัด
                    </label>
                    <input
                        id="province"
                        type="text"
                        placeholder="จังหวัด"
                        value={formState.province}
                        onChange={(e) => handleChange("province", e.target.value)}
                        className={inputClass("province")}
                    />
                    {errors.province && <p className={errorClass}>{errors.province}</p>}
                </div>
                <div>
                    <label className={labelClass} htmlFor="postal_code">
                        รหัสไปรษณีย์
                    </label>
                    <input
                        id="postal_code"
                        type="text"
                        inputMode="numeric"
                        placeholder="เช่น 12345"
                        value={formState.postal_code}
                        onChange={(e) => handleChange("postal_code", e.target.value)}
                        className={inputClass("postal_code")}
                    />
                    {errors.postal_code && (
                        <p className={errorClass}>{errors.postal_code}</p>
                    )}
                </div>
            </div>

            <button
                className="mt-2 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#8C6D58] text-lg font-semibold text-white transition-colors duration-200 hover:bg-[#7a5c45] focus:outline-none focus:ring-2 focus:ring-[#8C6D58]/40 focus:ring-offset-2 active:scale-[0.98]"
                type="submit"
            >
                ถัดไป: ข้อมูลเจ้าของร้าน
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
        </form>
    );
}
