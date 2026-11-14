import prisma from "@/lib/prisma";

// The conditional transition and inventory increment MUST commit together. A losing
// webhook/track/manual-receipt request cannot credit the same shipment twice.
export async function fulfillPreOrderToInventory(preOrderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.harvestPreOrder.findUnique({
      where: { id: preOrderId }, include: { announcement: true },
    });
    if (!order || !order.biteshipOrderId || !["PAID", "SHIPPED"].includes(order.status)) return null;
    const claimed = await tx.harvestPreOrder.updateMany({
      where: { id: preOrderId, status: { in: ["PAID", "SHIPPED"] }, biteshipOrderId: { not: null } },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    if (!claimed.count) return null;

    let stock = await tx.stock.findFirst({
      where: {
        supplierId: order.announcement.supplierId,
        name: order.announcement.flowerName,
        variety: order.announcement.variety || "Standar",
      },
    });
    if (!stock) {
      stock = await tx.stock.create({
        data: {
          supplierId: order.announcement.supplierId,
          name: order.announcement.flowerName,
          variety: order.announcement.variety || "Standar",
          quantity: 0, unit: "tangkai", pricePerUnit: order.pricePerUnit,
          harvestDate: order.announcement.harvestDate,
          location: order.announcement.location || "Kebun Mitra",
          isAvailable: true,
        },
      });
    }
    return tx.floristInventory.upsert({
      where: { floristId_stockId: { floristId: order.floristId, stockId: stock.id } },
      create: {
        floristId: order.floristId, stockId: stock.id, quantity: order.quantity,
        location: "Gudang Bunga Florist", lastRestockDate: new Date(),
      },
      update: { quantity: { increment: order.quantity }, lastRestockDate: new Date() },
    });
  });
}

export async function fulfillSaleToInventory(transactionId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.stockTransaction.findUnique({ where: { id: transactionId } });
    if (!sale || !sale.biteshipOrderId || !["PAID", "SHIPPED"].includes(sale.status)) return null;
    const claimed = await tx.stockTransaction.updateMany({
      where: { id: transactionId, status: { in: ["PAID", "SHIPPED"] }, biteshipOrderId: { not: null } },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    if (!claimed.count) return null;
    return tx.floristInventory.upsert({
      where: { floristId_stockId: { floristId: sale.floristId, stockId: sale.stockId } },
      create: {
        floristId: sale.floristId, stockId: sale.stockId, quantity: sale.quantity,
        location: "Gudang Bunga Florist", lastRestockDate: new Date(),
      },
      update: { quantity: { increment: sale.quantity }, lastRestockDate: new Date() },
    });
  });
}
