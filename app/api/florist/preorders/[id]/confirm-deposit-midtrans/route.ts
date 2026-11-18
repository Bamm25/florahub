import { confirmPreOrderMidtransPayment } from "@/lib/supply-chain/preorder-midtrans-routes";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return confirmPreOrderMidtransPayment(request, id, "DP");
}
