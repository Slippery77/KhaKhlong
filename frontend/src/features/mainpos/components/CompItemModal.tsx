import ItemActionModal from "./ItemActionModal";

interface CompItemModalProps {
  isOpen: boolean;
  itemName: string;
  quantity: number;
  onClose: () => void;
  onConfirm: (payload: { reason: string; approverPin: string }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
}

/** Comp รายการ (ให้ฟรี 100%) — ต้องอนุมัติด้วย PIN ผู้จัดการ/เจ้าของร้าน */
export default function CompItemModal({
  isOpen,
  itemName,
  quantity,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}: CompItemModalProps) {
  return (
    <ItemActionModal
      isOpen={isOpen}
      variant="comp"
      itemName={itemName}
      quantity={quantity}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      error={error}
    />
  );
}
