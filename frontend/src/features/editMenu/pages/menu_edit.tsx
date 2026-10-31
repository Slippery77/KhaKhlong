import Header from '../../../components/Header';
import SettingNavBar from '../../../components/settingNavBar';
import ListMenuEdit, { type MenuStatusFilter } from '../components/listMenu';
import SidebarCategory from '../components/sidebarCategory';
import {
    useAdminMenu,
    useCreateCategory,
    useEditMenu,
    useMenuItemStatus,
    useCreateMenu,
    useEditCategory,
    uselinkModifier,
} from '../hooks/useAdminMenu';
import type { Category, MenuItem } from '../types/menu.types';
import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import MenuFormPopup, { type MenuFormValues } from '../components/menuFormPopup';
import LinkModifierPopup from '../components/linkModifier';

export function MenuEdit() {
    const { categories, modifier, isLoading, error, reload } = useAdminMenu();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<MenuStatusFilter>('all');
    const [search, setSearch] = useState('');
    const { createCategory, isSubmitting, error: createError } = useCreateCategory();
    const { setAvailability, disable, enable, error: statusError } = useMenuItemStatus();
    const { editMenuItem, isSubmitting: submitEdit, error: editMenuError } = useEditMenu();
    const { createMenuItem, isSubmitting: submitCreate, error: createMenuError } = useCreateMenu();
    const {
        editCategoryName,
        disable: disableCategory,
        enable: enableCategory,
        isSubmitting: submitCategory,
        error: editCategoryError,
    } = useEditCategory();
    const [linkItem, setLinkItem] = useState<MenuItem | null>(null);
    const { link, isSubmitting: submitLink, error: linkError } = uselinkModifier();

    const [formItem, setFormItem] = useState<MenuItem | undefined>();
    const [showForm, setShowForm] = useState(false);

    if (isLoading) return <p className="p-8 font-kanit text-sm text-stone-500">กำลังโหลด...</p>;
    if (error) return <p className="p-8 font-kanit text-sm text-red-600">{error}</p>;

    const selected = categories.find((c) => c.category_id === selectedId) ?? categories[0];
    const items = selected?.items ?? [];
    const availableCount = items.filter((m) => m.is_active && m.is_available).length;
    const soldOutCount = items.filter((m) => m.is_active && !m.is_available).length;
    const inactiveCount = items.filter((m) => !m.is_active).length;

    const handleAdd = async (name: string) => {
        const created = await createCategory(name);
        if (created) {
            await reload();
            setSelectedId(created.category_id);
        }
        return !!created;
    };

    const handleToggleAvailable = async (item: MenuItem) => {
        const toggle = await setAvailability(item.menu_item_id, !item.is_available);
        if (toggle) {
            await reload();
        }
    };

    const handleDisable = async (item: MenuItem) => {
        const toggle = await disable(item.menu_item_id);
        if (toggle) {
            await reload();
        }
    };

    const handleEnable = async (item: MenuItem) => {
        const toggle = await enable(item.menu_item_id);
        if (toggle) {
            await reload();
        }
    };

    const handleEditMenu = (item: MenuItem) => {
        setFormItem(item);
        setShowForm(true);
    };

    const handleSubmitMenu = async (value: MenuFormValues) => {
        if (!formItem) {
            if (!selected) return false;
            const createMenu = await createMenuItem(
                selected.category_id,
                value.name,
                value.description,
                value.price,
                value.image_url,
            );
            if (createMenu) {
                await reload();
            }
            return !!createMenu;
        }

        const currentImg = formItem.image_url ?? null;
        const editMenu = await editMenuItem(
            formItem.menu_item_id,
            value.name !== formItem.name ? value.name : undefined,
            value.description !== formItem.description ? value.description : undefined,
            value.price !== formItem.price ? value.price : undefined,
            value.category_id && value.category_id !== formItem.category_id
                ? value.category_id
                : undefined,
            value.image_url !== currentImg ? value.image_url : undefined,
        );
        if (editMenu) {
            await reload();
        }
        return editMenu;
    };

    const handleRenameCategory = async (categoryId: string, name: string) => {
        const ok = await editCategoryName(categoryId, name);
        if (ok) await reload();
        return ok;
    };

    const handleToggleCategory = async (category: Category) => {
        const ok = category.is_active
            ? await disableCategory(category.category_id)
            : await enableCategory(category.category_id);
        if (ok) {
            await reload();
        }
        return ok;
    };

    const handleLinkModifiers = async (ids: string[]) => {
        if (!linkItem) return false;
        const ok = await link(linkItem.menu_item_id, ids);
        if (ok) await reload();
        return ok;
    };

    const filterTabs: { id: MenuStatusFilter; label: string; count: number }[] = [
        { id: 'all', label: 'ทั้งหมด', count: items.length },
        { id: 'available', label: 'พร้อมขาย', count: availableCount },
        { id: 'sold_out', label: 'หมดวันนี้', count: soldOutCount },
        { id: 'inactive', label: 'เลิกขาย', count: inactiveCount },
    ];

    return (
        <div className="flex h-dvh flex-col font-kanit">
            <Header />
            <SettingNavBar />
            <div className="flex min-h-0 flex-1">
                <SidebarCategory
                    categories={categories}
                    selectedId={selected?.category_id ?? null}
                    onSelect={setSelectedId}
                    onAdd={handleAdd}
                    isSubmitting={isSubmitting}
                    error={createError}
                    onRenameCategory={handleRenameCategory}
                    onToggleCategory={handleToggleCategory}
                    editIsSubmitting={submitCategory}
                    editError={editCategoryError}
                />
                <main className="flex-1 overflow-y-auto bg-[#FAF7F2] p-6 lg:p-8">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-[#2D241E]">
                                {selected?.name ?? 'ยังไม่มีหมวดหมู่'}
                            </h1>
                            {/* ปุ่มตัวกรองสถานะแบบคลิกได้ด่วน */}
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {filterTabs.map((tab) => {
                                    const active = statusFilter === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setStatusFilter(tab.id)}
                                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                                                active
                                                    ? 'border-[#8C6D58] bg-[#8C6D58] text-white shadow-xs'
                                                    : 'border-[#d9c6b0]/80 bg-white text-[#5C4E43] hover:bg-[#EFE8DC]/60'
                                            }`}
                                        >
                                            <span>{tab.label}</span>
                                            <span
                                                className={`rounded-full px-1.5 py-0.2 text-[11px] tabular-nums ${
                                                    active
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-[#FAF7F2] text-[#8C6D58]'
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="relative">
                                <Search
                                    size={15}
                                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#9B8E82]"
                                />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อเมนู หรือคำอธิบาย..."
                                    className="w-64 rounded-xl border border-[#d9c6b0]/80 bg-white py-2 pr-8 pl-9 text-sm text-[#2D241E] shadow-xs outline-none transition-all duration-200 focus:border-[#8C6D58] focus:ring-2 focus:ring-[#8C6D58]/10 hover:border-[#c4b09a]"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        aria-label="ล้างคำค้นหา"
                                        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-stone-400 hover:text-[#2D241E]"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setFormItem(undefined);
                                    setShowForm(true);
                                }}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#8C6D58] px-4 py-2 font-medium text-white shadow-xs transition-all duration-200 hover:bg-[#7a5c45] hover:shadow-md active:scale-[0.98]"
                            >
                                <Plus size={18} />
                                เพิ่มเมนู
                            </button>
                        </div>
                    </div>

                    {showForm && (
                        <MenuFormPopup
                            item={formItem}
                            categories={categories}
                            defaultCategoryId={selected?.category_id}
                            onSubmit={handleSubmitMenu}
                            onClose={() => setShowForm(false)}
                            isSubmitting={formItem ? submitEdit : submitCreate}
                            error={formItem ? editMenuError : createMenuError}
                        />
                    )}

                    {statusError && <p className="mb-2 text-sm text-red-600">{statusError}</p>}

                    <ListMenuEdit
                        menuItem={items}
                        statusFilter={statusFilter}
                        search={search}
                        onToggleAvailable={handleToggleAvailable}
                        onDisable={handleDisable}
                        onEnable={handleEnable}
                        onEdit={handleEditMenu}
                        onLinkModifiers={setLinkItem}
                    />

                    {linkItem && (
                        <LinkModifierPopup
                            item={linkItem}
                            modifierGroups={modifier}
                            onSubmit={handleLinkModifiers}
                            onClose={() => setLinkItem(null)}
                            isSubmitting={submitLink}
                            error={linkError}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}
