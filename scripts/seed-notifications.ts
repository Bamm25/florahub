import prisma from "../lib/prisma";
import { NotificationType } from "@prisma/client";

async function seedNotifications() {
  console.log("🔔 Seeding test notifications...");

  // Find florist user
  const florist = await prisma.user.findFirst({
    where: { role: "FLORIST" },
  });

  if (!florist) {
    console.error("❌ No florist user found. Please run seed first.");
    return;
  }

  console.log(`✅ Found florist: ${florist.email}`);

  // Create test notifications
  const notifications: Array<{
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    link: string;
    isRead: boolean;
    readAt?: Date;
    createdAt?: Date;
  }> = [
    {
      userId: florist.id,
      title: "Pesanan Baru Masuk!",
      message: "Order #ORD-20261107-001 telah masuk dengan total Rp 850.000. Segera proses pesanan.",
      type: NotificationType.ORDER_CREATED,
      link: "/florist/orders",
      isRead: false,
    },
    {
      userId: florist.id,
      title: "Pembayaran Diterima!",
      message: "Order #ORD-20261107-001 telah dibayar. Segera proses dan kirimkan pesanan.",
      type: NotificationType.PAYMENT_SUCCESS,
      link: "/florist/orders",
      isRead: false,
    },
    {
      userId: florist.id,
      title: "Stok Rendah!",
      message: "Stok Mawar Merah hanya tersisa 5 tangkai. Segera lakukan restock (minimum: 10 tangkai).",
      type: NotificationType.LOW_STOCK_ALERT,
      link: "/florist/inventory",
      isRead: false,
    },
    {
      userId: florist.id,
      title: "Pre-Order Anda Dikonfirmasi!",
      message: "Supplier Tani Bunga telah menerima pre-order Anda untuk 100 tangkai Tulip Belanda.",
      type: NotificationType.PREORDER_CONFIRMED,
      link: "/florist/preorders",
      isRead: false,
    },
    {
      userId: florist.id,
      title: "Pesanan Baru Masuk!",
      message: "Order #ORD-20261106-015 telah masuk dengan total Rp 1.250.000. Segera proses pesanan.",
      type: NotificationType.ORDER_CREATED,
      link: "/florist/orders",
      isRead: true,
      readAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    });
  }

  console.log(`✅ Created ${notifications.length} test notifications`);
}

seedNotifications()
  .catch((error) => {
    console.error("❌ Error seeding notifications:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
