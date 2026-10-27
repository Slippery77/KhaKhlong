export { default as ReceiptModal } from './components/ReceiptModal';
export { default as ReceiptPaper } from './components/ReceiptPaper';
export { useReceipt } from './hooks/useReceipt';
export { receiptApi } from './api/receipt.api';
export type {
  ReceiptData,
  ReceiptLine,
  ReceiptPrintResult,
  ReceiptStore,
  ReceiptTable,
} from './types/receipt.types';
