// Deklarasi modul untuk pustaka klien Midtrans
declare module "midtrans-client" {
  // Kelas pembungkus antarmuka transaksi Midtrans Snap
  export class Snap {
    constructor(config: {
      isProduction: boolean;
      serverKey: string;
      clientKey: string;
    });

    createTransaction(params: {
      transaction_details: {
        order_id: string;
        gross_amount: number;
      };
      item_details?: Array<{
        id: string;
        price: number;
        quantity: number;
        name: string;
      }>;
      customer_details?: {
        first_name?: string;
        email?: string;
        phone?: string;
      };
    }): Promise<{
      token: string;
      redirect_url: string;
    }>;
  }
}
