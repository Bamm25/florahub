import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkAllTables() {
  console.log('🔍 Checking all tables for data...\n');

  const tableCounters: Record<string, () => Promise<number>> = {
    User: () => prisma.user.count(),
    Address: () => prisma.address.count(),
    FlowerCategory: () => prisma.flowerCategory.count(),
    Product: () => prisma.product.count(),
    Order: () => prisma.order.count(),
    OrderItem: () => prisma.orderItem.count(),
    Payment: () => prisma.payment.count(),
    Shipment: () => prisma.shipment.count(),
    Review: () => prisma.review.count(),
    Coupon: () => prisma.coupon.count(),
    CouponUsage: () => prisma.couponUsage.count(),
    Notification: () => prisma.notification.count(),
    FloristInventory: () => prisma.floristInventory.count(),
    Stock: () => prisma.stock.count(),
    HarvestAnnouncement: () => prisma.harvestAnnouncement.count(),
    HarvestPreOrder: () => prisma.harvestPreOrder.count(),
    StockTransaction: () => prisma.stockTransaction.count(),
  };

  const results: Record<string, number> = {};

  for (const [table, countFn] of Object.entries(tableCounters)) {
    try {
      const count = await countFn();
      results[table] = count;
      
      if (count === 0) {
        console.log(`❌ ${table}: 0 rows (EMPTY)`);
      } else {
        console.log(`✅ ${table}: ${count} rows`);
      }
    } catch (error) {
      console.log(`⚠️  ${table}: Error checking - ${(error as Error).message}`);
    }
  }

  console.log('\n📊 Summary:');
  const emptyTables = Object.entries(results).filter(([, count]) => count === 0);
  
  if (emptyTables.length === 0) {
    console.log('✅ All tables have data!');
  } else {
    console.log(`❌ Empty tables (${emptyTables.length}):`);
    emptyTables.forEach(([table]) => console.log(`   - ${table}`));
  }

  return results;
}

checkAllTables()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
