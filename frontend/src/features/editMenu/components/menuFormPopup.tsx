import { useRef, useState } from 'react';
import { Upload, Link2, Trash2, Utensils, X, ImagePlus } from 'lucide-react';
import type { Category, MenuItem } from '../types/menu.types';

export interface MenuFormValues {
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    category_id?: string;
}

interface Props {
    item?: MenuItem;
    categories?: Category[];
    defaultCategoryId?: string;
    onSubmit: (values: MenuFormValues) => Promise<boolean>;
    onClose: () => void;
    isSubmitting: boolean;
    error: string | null;
}

/**
 * ย่อขนาดและบีบอัดรูปภาพฝั่ง Client ด้วย HTML5 Canvas (สูงสุด 600x450px, WebP/JPEG 0.82)
 * เพื่อให้ขนาด Data URL เล็ก (~20-60KB) โหลดเร็ว และใช้งานตอน Offline PWA ได้ทันที
 */
async function compressImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพที่รองรับ'));
            img.onload = () => {
                const maxW = 600;
                const maxH = 450;
                let { width, height } = img;
                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('เบราว์เซอร์ไม่รองรับการประมวลผลรูปภาพ'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                let dataUrl = canvas.toDataURL('image/webp', 0.82);
                if (!dataUrl.startsWith('data:image/webp')) {
                    dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                }
                resolve(dataUrl);
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

export default function MenuFormPopup({
    item,
    categories = [],
    defaultCategoryId,
    onSubmit,
    onClose,
    isSubmitting,
    error,
}: Props) {
    const isEdit = item !== undefined;
    const [name, setName] = useState(item?.name ?? '');
    const [description, setDescription] = useState(item?.description ?? '');
    const [price, setPrice] = useState(item ? String(item.price) : '');
    const [categoryId, setCategoryId] = useState(
        item?.category_id ?? defaultCategoryId ?? categories[0]?.category_id ?? '',
    );
    const [imageUrl, setImageUrl] = useState<string>(item?.image_url ?? '');
    const [imageMode, setImageMode] = useState<'upload' | 'url'>(
        item?.image_url && !item.image_url.startsWith('data:') ? 'url' : 'upload',
    );
    const [isDragging, setIsDragging] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [previewBroken, setPreviewBroken] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const priceNumber = Number(price);
    const isPriceValid = price.trim() !== '' && !Number.isNaN(priceNumber) && priceNumber >= 0;
    const canSubmit = name.trim() !== '' && isPriceValid && !isSubmitting;

    const handleFileSelect = async (file?: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setImageError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setImageError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 10MB');
            return;
        }
        setImageError(null);
        setPreviewBroken(false);
        try {
            const compressed = await compressImageFile(file);
            setImageUrl(compressed);
        } catch (err) {
            setImageError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่สำเร็จ');
        }
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        await handleFileSelect(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedImg = imageUrl.trim();
        const ok = await onSubmit({
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
            price: priceNumber,
            image_url: trimmedImg === '' ? null : trimmedImg,
            category_id: categoryId || undefined,
        });
        if (ok) {
            onClose();
        }
    };

    const hasPreview = imageUrl.trim() !== '' && !previewBroken;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[1px]"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="menu-form-title"
                className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 font-kanit"
            >
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 id="menu-form-title" className="text-lg font-semibold text-[#2D241E]">
                            {isEdit ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
                        </h2>
                        <p className="text-xs text-[#8A7A6B]">
                            กำหนดรูปภาพ ชื่อเมนู ราคา และรายละเอียดสำหรับแสดงหน้าร้าน
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        aria-label="ปิดหน้าต่าง"
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-[#FAF7F2] hover:text-[#2D241E]"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* ── ส่วนจัดการรูปภาพเมนูอาหาร ─────────────────────────── */}
                    <div className="rounded-2xl border border-[#E8DFD5] bg-[#FAF7F2] p-3.5">
                        <div className="mb-2.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-[#4A4038]">
                                รูปเมนูอาหาร (ไม่บังคับ)
                            </span>
                            <div className="inline-flex rounded-lg border border-[#d9c6b0] bg-white p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setImageMode('upload')}
                                    className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                                        imageMode === 'upload'
                                            ? 'bg-[#8C6D58] text-white'
                                            : 'text-[#6B5A49] hover:text-[#2D241E]'
                                    }`}
                                >
                                    <Upload size={12} aria-hidden="true" />
                                    อัปโหลดไฟล์
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImageMode('url')}
                                    className={`flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                                        imageMode === 'url'
                                            ? 'bg-[#8C6D58] text-white'
                                            : 'text-[#6B5A49] hover:text-[#2D241E]'
                                    }`}
                                >
                                    <Link2 size={12} aria-hidden="true" />
                                    วางลิงก์ URL
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {/* กรอบพรีวิว 4:3 */}
                            <div className="relative aspect-4/3 w-full shrink-0 overflow-hidden rounded-xl border border-[#d9c6b0] bg-linear-to-br from-[#F3ECE1] to-[#E6DBC9] sm:w-36">
                                {hasPreview ? (
                                    <img
                                        src={imageUrl}
                                        alt="พรีวิวเมนูอาหาร"
                                        onError={() => setPreviewBroken(true)}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#9C8671]">
                                        <Utensils className="h-6 w-6" aria-hidden="true" />
                                        <span className="text-[11px]">
                                            {previewBroken ? 'โหลดรูปไม่สำเร็จ' : 'ยังไม่มีรูป'}
                                        </span>
                                    </div>
                                )}
                                {imageUrl.trim() !== '' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImageUrl('');
                                            setPreviewBroken(false);
                                            setImageError(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        title="ลบรูปภาพ"
                                        aria-label="ลบรูปภาพ"
                                        className="absolute top-1.5 right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-[#2D241E]/75 text-white transition-colors hover:bg-red-600"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>

                            {/* พื้นที่อัปโหลด หรือ ช่องวาง URL */}
                            <div className="min-w-0 flex-1">
                                {imageMode === 'upload' ? (
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDragging(true);
                                        }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors ${
                                            isDragging
                                                ? 'border-[#8C6D58] bg-[#EFE8DC]'
                                                : 'border-[#d9c6b0] bg-white hover:border-[#8C6D58] hover:bg-[#FAF7F2]/60'
                                        }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                                        />
                                        <ImagePlus
                                            className="mb-1.5 h-5 w-5 text-[#8C6D58]"
                                            aria-hidden="true"
                                        />
                                        <p className="text-xs font-medium text-[#2D241E]">
                                            คลิกเลือกไฟล์ หรือลากรูปมาวางที่นี่
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-[#8A7A6B]">
                                            JPG, PNG, WebP (ย่อขนาดอัตโนมัติ)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label
                                            htmlFor="menu-image-url"
                                            className="block text-xs font-medium text-[#4A4038]"
                                        >
                                            ลิงก์รูปภาพ (URL)
                                        </label>
                                        <input
                                            id="menu-image-url"
                                            type="url"
                                            value={imageUrl.startsWith('data:') ? '' : imageUrl}
                                            onChange={(e) => {
                                                setPreviewBroken(false);
                                                setImageError(null);
                                                setImageUrl(e.target.value);
                                            }}
                                            placeholder="https://example.com/food.jpg"
                                            className="w-full rounded-xl border border-[#d9c6b0] bg-white px-3 py-2 text-xs text-[#2D241E] outline-none transition-colors focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/15"
                                        />
                                        <p className="text-[11px] text-[#8A7A6B]">
                                            วางลิงก์รูปอาหารโดยตรง หรือสลับไปอัปโหลดจากเครื่อง
                                        </p>
                                    </div>
                                )}
                                {imageError && (
                                    <p role="alert" className="mt-1.5 text-xs text-red-600">
                                        {imageError}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                        <label className="flex flex-col gap-1.5 text-sm text-stone-600 sm:col-span-2">
                            <span>
                                ชื่อเมนู <span className="text-red-500">*</span>
                            </span>
                            <input
                                autoFocus
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={150}
                                placeholder="เช่น ข้าวผัดหมู"
                                className="rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-xs outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
                            />
                        </label>

                        <label className="flex flex-col gap-1.5 text-sm text-stone-600">
                            <span>
                                ราคา (บาท) <span className="text-red-500">*</span>
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                className="rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-xs outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
                            />
                        </label>
                    </div>

                    {isEdit && categories.length > 0 && (
                        <label className="flex flex-col gap-1.5 text-sm text-stone-600">
                            หมวดหมู่เมนู
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="cursor-pointer rounded-xl border border-[#d9c6b0]/80 bg-white px-3 py-2.5 text-[#2D241E] shadow-xs outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.category_id} value={cat.category_id}>
                                        {cat.name} {!cat.is_active ? '(ปิดหมวด)' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="flex flex-col gap-1.5 text-sm text-stone-600">
                        คำอธิบาย (ไม่บังคับ)
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={1000}
                            rows={2}
                            placeholder="เช่น เสิร์ฟพร้อมไข่ดาว แตงกวา พริกน้ำปลา"
                            className="resize-none rounded-xl border border-[#d9c6b0]/80 px-3 py-2.5 text-[#2D241E] shadow-xs outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
                        />
                    </label>

                    {error && (
                        <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                            {error}
                        </p>
                    )}

                    <div className="mt-1 flex gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 cursor-pointer rounded-xl border border-[#d9c6b0] py-2.5 text-[#2D241E] transition-all duration-200 enabled:hover:bg-[#FAF7F2] enabled:active:scale-[0.98] disabled:opacity-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="flex-1 cursor-pointer rounded-xl bg-[#8C6D58] py-2.5 font-semibold text-white shadow-xs transition-all duration-200 enabled:hover:bg-[#7a5c45] enabled:hover:shadow-md enabled:active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเมนู'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
