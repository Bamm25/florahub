import midtransClient from "midtrans-client";

const Snap = (midtransClient as any).Snap;

// Inisialisasi klien Midtrans Snap untuk pemrosesan transaksi pembayaran
export const snap = new Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
});
