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

  const tables = [
    'User',
    'Address',
    'FlowerCategory',
    'Product',
    'Order',
    'OrderItem',
    'Payment',
    'Shipment',
    'Review',
    'Coupon',
    'CouponUsage',
    'Notification',
    'FloristInventory',
    'Stock',
    'HarvestAnnouncement',
    'HarvestPreOrder',
    'StockTransaction',
  ];

  const results: Record<string, number> = {};

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
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
  const emptyTables = Object.entries(results).filter(([_, count]) => count === 0);
  
  if (emptyTables.length === 0) {
    console.log('✅ All tables have data!');
  } else {
    console.log(`❌ Empty tables (${emptyTables.length}):`);
    emptyTables.forEach(([table, _]) => console.log(`   - ${table}`));
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
