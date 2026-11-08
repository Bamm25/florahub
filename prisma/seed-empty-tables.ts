import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedEmptyTables() {
  console.log('🌱 Seeding empty tables with realistic data...\n');

  // Get existing data
  const customers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });
  const florists = await prisma.user.findMany({ where: { role: 'FLORIST' } });
  const supplier = await prisma.user.findFirst({ where: { role: 'SUPPLIER' } });
  const orders = await prisma.order.findMany({ include: { items: true, user: true } });
  const products = await prisma.product.findMany();

  if (customers.length === 0 || florists.length === 0 || !supplier) {
    throw new Error('Please run seed-more.ts first!');
  }

  // 1. Create Shipments (untuk orders yang PROCESSING/SHIPPED/DELIVERED)
  console.log('📦 Creating shipments...');
  
  const deliveredOrders = orders.filter(o => ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(o.status));
  
  for (let i = 0; i < Math.min(deliveredOrders.length, 3); i++) {
    const order = deliveredOrders[i];
    
    const existing = await prisma.shipment.findFirst({ where: { orderId: order.id } });
    if (!existing) {
      const status = order.status === 'PROCESSING' ? 'PENDING' : 
                     order.status === 'SHIPPED' ? 'IN_TRANSIT' : 'DELIVERED';
      
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          trackingNumber: `TRACK${Date.now()}${i}`,
          courier: ['JNE', 'SiCepat', 'J&T Express'][i % 3],
          status: status,
          estimatedDelivery: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)), // 3 days from now
          shippedAt: order.status !== 'PROCESSING' ? new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)) : null,
          deliveredAt: order.status === 'DELIVERED' ? new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)) : null,
        },
      });
      console.log(`  ✅ Shipment for order ${order.orderNumber}`);
    }
  }

  // 2. Create Reviews (untuk orders DELIVERED dengan shipment)
  console.log('⭐ Creating reviews...');
  
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  
  for (let i = 0; i < Math.min(completedOrders.length, 5); i++) {
    const order = completedOrders[i];
    
    for (const item of order.items.slice(0, 1)) { // Review 1 item per order
      const existing = await prisma.review.findFirst({
        where: { productId: item.productId, userId: order.userId }
      });
      
      if (!existing) {
        const ratings = [5, 5, 4, 5, 4];
        const comments = [
          'Bunganya sangat segar dan indah! Packaging rapi, pengiriman cepat. Recommended!',
          'Kualitas bunga premium, sesuai dengan gambar. Penerima sangat senang. Thank you!',
          'Bagus tapi agak lama sampainya. Overall puas dengan kualitas bunganya.',
          'Bunga cantik, wangi, dan tahan lama. Florist responsif. Pasti order lagi!',
          'Memuaskan! Bunga fresh dan wrapping mewah. Cocok untuk hadiah special occasion.',
        ];
        
        await prisma.review.create({
          data: {
            productId: item.productId,
            userId: order.userId,
            orderId: order.id,
            rating: ratings[i % ratings.length],
            comment: comments[i % comments.length],
            isVerified: true,
          },
        });
        console.log(`  ✅ Review from ${order.user.name}`);
      }
    }
  }

  // 3. Create CouponUsage
  console.log('🎟️ Creating coupon usage records...');
  
  const coupons = await prisma.coupon.findMany();
  const ordersWithCoupon = orders.filter(o => Math.random() > 0.5).slice(0, 3);
  
  for (let i = 0; i < ordersWithCoupon.length && i < coupons.length; i++) {
    const order = ordersWithCoupon[i];
    const coupon = coupons[i % coupons.length];
    
    const existing = await prisma.couponUsage.findFirst({
      where: { couponId: coupon.id, orderId: order.id }
    });
    
    if (!existing) {
      await prisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId: order.customerId,
          orderId: order.id,
        },
      });
      console.log(`  ✅ ${coupon.code} used by customer`);
    }
  }

  // 4. Create Notifications
  console.log('🔔 Creating notifications...');
  
  const notifications = [
    // Florist notifications
    { userId: florists[0].id, type: 'ORDER_CREATED', title: 'Pesanan Baru Masuk!', message: 'Order baru dengan total Rp 450.000 telah masuk. Segera proses pesanan.', link: '/florist/orders', isRead: false },
    { userId: florists[0].id, type: 'PAYMENT_SUCCESS', title: 'Pembayaran Diterima!', message: 'Pembayaran untuk order telah dikonfirmasi. Siap untuk dikirim.', link: '/florist/orders', isRead: false },
    { userId: florists[0].id, type: 'LOW_STOCK_ALERT', title: 'Stok Rendah!', message: 'Stok produk Buket Mawar Merah hanya tersisa 3 unit. Segera restock.', link: '/florist/inventory', isRead: true },
    // Customer notifications
    { userId: customers[0].id, type: 'ORDER_CONFIRMED', title: 'Pesanan Dikonfirmasi', message: 'Pesanan Anda telah dikonfirmasi dan sedang diproses oleh florist.', link: '/orders', isRead: false },
    { userId: customers[0].id, type: 'SHIPMENT_UPDATE', title: 'Pesanan Dikirim!', message: 'Pesanan Anda telah dikirim. No. Resi: TRACK123456789. Estimasi tiba 2 hari.', link: '/orders', isRead: false },
    { userId: customers[1].id, type: 'ORDER_DELIVERED', title: 'Pesanan Tiba!', message: 'Pesanan Anda telah sampai di tujuan. Jangan lupa beri review ya!', link: '/orders', isRead: true },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif as any });
  }
  console.log(`  ✅ ${notifications.length} notifications created`);

  // 5. Create FloristInventory
  console.log('📊 Creating florist inventory...');
  
  for (const florist of florists.slice(0, 2)) {
    const floristProducts = products.filter(p => p.floristId === florist.id).slice(0, 5);
    
    for (const product of floristProducts) {
      const existing = await prisma.floristInventory.findFirst({
        where: { floristId: florist.id, productId: product.id }
      });
      
      if (!existing) {
        await prisma.floristInventory.create({
          data: {
            floristId: florist.id,
            productId: product.id,
            quantity: product.stock,
            minStock: 5,
            maxStock: 50,
            reorderPoint: 10,
            lastRestocked: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)), // 7 days ago
          },
        });
      }
    }
    console.log(`  ✅ Inventory for ${florist.name}`);
  }

  // 6. Create Stock (Supplier inventory)
  console.log('🌾 Creating supplier stocks...');
  
  const flowerTypes = [
    { name: 'Mawar Merah Fresh', description: 'Mawar merah import grade A', category: 'Mawar', unit: 'tangkai', pricePerUnit: 15000, quantity: 500 },
    { name: 'Tulip Belanda Mix', description: 'Tulip warna warni import Belanda', category: 'Tulip', unit: 'tangkai', pricePerUnit: 25000, quantity: 300 },
    { name: 'Anggrek Bulan Putih', description: 'Anggrek bulan lokal premium', category: 'Anggrek', unit: 'pot', pricePerUnit: 150000, quantity: 50 },
    { name: 'Lily Putih Oriental', description: 'Lily putih harum', category: 'Lily', unit: 'tangkai', pricePerUnit: 18000, quantity: 200 },
    { name: 'Sunflower Jumbo', description: 'Bunga matahari ukuran jumbo', category: 'Sunflower', unit: 'tangkai', pricePerUnit: 20000, quantity: 150 },
  ];

  for (const flower of flowerTypes) {
    await prisma.stock.create({
      data: {
        supplierId: supplier.id,
        name: flower.name,
        description: flower.description,
        category: flower.category,
        unit: flower.unit,
        pricePerUnit: flower.pricePerUnit,
        quantity: flower.quantity,
        minStock: 50,
        harvestDate: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)),
        expiryDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)),
      },
    });
  }
  console.log(`  ✅ ${flowerTypes.length} stock items created`);

  // 7. Create HarvestAnnouncement
  console.log('📢 Creating harvest announcements...');
  
  const announcements = [
    { title: 'Panen Mawar Merah November', description: 'Tersedia 1000 tangkai mawar merah premium grade A. Panen fresh hari ini!', harvestDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), quantity: 1000, pricePerUnit: 15000, category: 'Mawar', isActive: true },
    { title: 'Pre-Order Tulip Desember', description: 'Tulip import Belanda berbagai warna. Ready mid Desember. Limited stock!', harvestDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), quantity: 500, pricePerUnit: 28000, category: 'Tulip', isActive: true },
  ];

  for (const ann of announcements) {
    await prisma.harvestAnnouncement.create({
      data: {
        supplierId: supplier.id,
        ...ann,
      },
    });
  }
  console.log(`  ✅ ${announcements.length} harvest announcements created`);

  // 8. Create HarvestPreOrder
  console.log('🛒 Creating harvest pre-orders...');
  
  const harvestAnnouncements = await prisma.harvestAnnouncement.findMany();
  
  for (let i = 0; i < Math.min(florists.length, harvestAnnouncements.length); i++) {
    const florist = florists[i];
    const announcement = harvestAnnouncements[i];
    
    await prisma.harvestPreOrder.create({
      data: {
        harvestAnnouncementId: announcement.id,
        floristId: florist.id,
        quantity: 100,
        totalPrice: announcement.pricePerUnit * 100,
        status: ['PENDING', 'CONFIRMED'][i % 2] as any,
        notes: 'Mohon dikemas dengan baik. Untuk event wedding.',
      },
    });
    console.log(`  ✅ Pre-order from ${florist.name}`);
  }

  // 9. Create StockTransaction
  console.log('💸 Creating stock transactions...');
  
  const stocks = await prisma.stock.findMany();
  const preOrders = await prisma.harvestPreOrder.findMany();
  
  for (const preOrder of preOrders) {
    await prisma.stockTransaction.create({
      data: {
        stockId: stocks[0].id, // Simplified: use first stock
        floristId: preOrder.floristId,
        type: 'PURCHASE',
        quantity: preOrder.quantity,
        pricePerUnit: preOrder.totalPrice / preOrder.quantity,
        totalPrice: preOrder.totalPrice,
        notes: `Pre-order purchase - ${preOrder.notes}`,
      },
    });
  }
  console.log(`  ✅ ${preOrders.length} stock transactions created`);

  console.log('\n🎉 All empty tables seeded successfully!\n');
  
  // Final check
  console.log('📊 Final count:');
  const counts = {
    Shipment: await prisma.shipment.count(),
    Review: await prisma.review.count(),
    CouponUsage: await prisma.couponUsage.count(),
    Notification: await prisma.notification.count(),
    FloristInventory: await prisma.floristInventory.count(),
    Stock: await prisma.stock.count(),
    HarvestAnnouncement: await prisma.harvestAnnouncement.count(),
    HarvestPreOrder: await prisma.harvestPreOrder.count(),
    StockTransaction: await prisma.stockTransaction.count(),
  };
  
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`   ${table}: ${count} rows`);
  });
}

seedEmptyTables()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
