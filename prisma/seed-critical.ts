import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedCriticalTables() {
  console.log('🌱 Seeding critical tables for frontend testing...\n');

  try {
    // Get existing data
    const orders = await prisma.order.findMany({ 
      where: { status: { in: ['PROCESSING', 'SHIPPED', 'DELIVERED'] } },
      include: { items: true, user: true }
    });
    const products = await prisma.product.findMany();
    const florists = await prisma.user.findMany({ where: { role: 'FLORIST' } });

    // 1. Shipments - Critical for order tracking
    console.log('📦 Creating shipments...');
    let shipmentCount = 0;
    
    for (const order of orders.slice(0, 3)) {
      const existing = await prisma.shipment.findFirst({ where: { orderId: order.id } });
      if (!existing) {
        await prisma.shipment.create({
          data: {
            orderId: order.id,
            trackingNumber: `JNE${Date.now()}${shipmentCount}`,
            courier: ['JNE', 'SiCepat', 'J&T Express'][shipmentCount % 3],
            status: order.status === 'DELIVERED' ? 'DELIVERED' : order.status === 'SHIPPED' ? 'SHIPPED' : 'PENDING',
            shippingCost: 15000,
            shippedAt: order.status !== 'PROCESSING' ? new Date() : null,
            deliveredAt: order.status === 'DELIVERED' ? new Date() : null,
          },
        });
        shipmentCount++;
      }
    }
    console.log(`  ✅ ${shipmentCount} shipments created`);

    // 2. Reviews - Important for product pages
    console.log('⭐ Creating reviews...');
    let reviewCount = 0;
    
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');
    for (const order of deliveredOrders.slice(0, 3)) {
      for (const item of order.items.slice(0, 1)) {
        const existing = await prisma.review.findFirst({
          where: { productId: item.productId, userId: order.userId }
        });
        
        if (!existing) {
          const ratings = [5, 4, 5];
          const comments = [
            'Bunganya segar dan indah! Packaging rapi. Recommended!',
            'Kualitas premium, sesuai gambar. Penerima sangat senang!',
            'Bunga cantik, wangi, dan tahan lama. Pasti order lagi!',
          ];
          
          await prisma.review.create({
            data: {
              productId: item.productId,
              userId: order.userId,
              orderId: order.id,
              rating: ratings[reviewCount % 3],
              comment: comments[reviewCount % 3],
              isVerified: true,
            },
          });
          reviewCount++;
        }
      }
    }
    console.log(`  ✅ ${reviewCount} reviews created`);

    // 3. Notifications - Important for both roles
    console.log('🔔 Creating notifications...');
    
    const notifications = [
      { userId: florists[0].id, type: 'ORDER_CREATED', title: 'Pesanan Baru!', message: 'Order baru Rp 450K telah masuk.', link: '/florist/orders', isRead: false },
      { userId: florists[0].id, type: 'PAYMENT_SUCCESS', title: 'Pembayaran Diterima', message: 'Order telah dibayar, siap kirim.', link: '/florist/orders', isRead: false },
      { userId: florists[0].id, type: 'LOW_STOCK_ALERT', title: 'Stok Rendah', message: 'Stok Buket Mawar tersisa 3 unit.', link: '/florist/inventory', isRead: true },
    ];

    for (const notif of notifications) {
      await prisma.notification.create({ data: notif as any });
    }
    console.log(`  ✅ ${notifications.length} notifications created`);

    console.log('\n🎉 Critical tables seeded!\n');
    
    // Summary
    const finalCounts = {
      Shipment: await prisma.shipment.count(),
      Review: await prisma.review.count(),
      Notification: await prisma.notification.count(),
    };
    
    console.log('📊 Final counts (critical tables):');
    Object.entries(finalCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} rows`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

seedCriticalTables()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    await prisma.$disconnect();
    process.exit(1);
  });
