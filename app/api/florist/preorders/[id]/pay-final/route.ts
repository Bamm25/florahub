import { createPreOrderSnapPayment } from "@/lib/supply-chain/preorder-midtrans-routes";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return createPreOrderSnapPayment(request, id, "FINAL");
}
