import ItemActionModal from "./ItemActionModal";

interface VoidItemModalProps {
  isOpen: boolean;
  itemName: string;
  quantity: number;
  onClose: () => void;
  onConfirm: (payload: { reason: string; approverPin: string }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
}

/** ยกเลิกรายการ (VOID) — ทุกครั้งต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน */
export default function VoidItemModal({
  isOpen,
  itemName,
  quantity,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: VoidItemModalProps) {
  return (
    <ItemActionModal
      isOpen={isOpen}
      variant="void"
      itemName={itemName}
      quantity={quantity}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      error={error}
    />
  );
}
