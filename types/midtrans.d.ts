// Type Midtrans Snap global object

interface MidtransTransactionResult {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: string;
  fraud_status?: string;
  pdf_url?: string;
  finish_redirect_url?: string;
}

interface Window {
  snap: {
    pay: (
      token: string,
      options?: {
        onSuccess?: (result: MidtransTransactionResult) => void;
        onPending?: (result: MidtransTransactionResult) => void;
        onError?: (result: MidtransTransactionResult) => void;
        onClose?: () => void;
      },
    ) => void;
  };
}
