declare module 'promptpay-qr' {
  export default function generatePayload(
    promptpayId: string,
    options?: { amount?: number }
  ): string;
}
