import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Adding comprehensive seed data...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create additional users
  console.log('👥 Creating users...');
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@florahub.com' },
    update: {},
    create: {
      name: 'Admin FloraHub',
      email: 'admin@florahub.com',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '081234567899',
      isActive: true,
    },
  });

  const supplier = await prisma.user.upsert({
    where: { email: 'supplier@farm.com' },
    update: {},
    create: {
      name: 'Tani Bunga Sejahtera',
      email: 'supplier@farm.com',
      password: hashedPassword,
      role: 'SUPPLIER',
      phone: '081234567898',
      isActive: true,
    },
  });

  const florist2 = await prisma.user.upsert({
    where: { email: 'florist2@shop.com' },
    update: {},
    create: {
      name: 'Bunga Raya Shop',
      email: 'florist2@shop.com',
      password: hashedPassword,
      role: 'FLORIST',
      phone: '081234567891',
      isActive: true,
    },
  });

  const florist3 = await prisma.user.upsert({
    where: { email: 'florist3@shop.com' },
    update: {},
    create: {
      name: 'Flora Garden Store',
      email: 'florist3@shop.com',
      password: hashedPassword,
      role: 'FLORIST',
      phone: '081234567892',
      isActive: true,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@test.com' },
    update: {},
    create: {
      name: 'Siti Nurhaliza',
      email: 'customer2@test.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      phone: '081298765433',
      isActive: true,
    },
  });

  const customer3 = await prisma.user.upsert({
    where: { email: 'customer3@test.com' },
    update: {},
    create: {
      name: 'Ahmad Rizki',
      email: 'customer3@test.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      phone: '081298765434',
      isActive: true,
    },
  });

  const customer4 = await prisma.user.upsert({
    where: { email: 'customer4@test.com' },
    update: {},
    create: {
      name: 'Dewi Kartika',
      email: 'customer4@test.com',
      password: hashedPassword,
      role: 'CUSTOMER',
      phone: '081298765435',
      isActive: true,
    },
  });

  console.log('✅ Users created: 1 admin, 1 supplier, 2 florists, 3 customers');

  // 2. Create addresses
  console.log('📍 Creating addresses...');
  
  const addresses = [
    { userId: customer2.id, label: 'Rumah', recipientName: 'Siti Nurhaliza', phone: '081298765433', fullAddress: 'Jl. Merdeka No. 45', city: 'Bandung', province: 'Jawa Barat', postalCode: '40115', isDefault: true },
    { userId: customer3.id, label: 'Rumah', recipientName: 'Ahmad Rizki', phone: '081298765434', fullAddress: 'Jl. Ahmad Yani No. 89', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60234', isDefault: true },
    { userId: customer3.id, label: 'Kantor', recipientName: 'Ahmad Rizki', phone: '081298765434', fullAddress: 'Gedung Plaza Surabaya Lt. 5', city: 'Surabaya', province: 'Jawa Timur', postalCode: '60271', isDefault: false },
    { userId: customer4.id, label: 'Rumah', recipientName: 'Dewi Kartika', phone: '081298765435', fullAddress: 'Jl. Gatot Subroto No. 123', city: 'Yogyakarta', province: 'DI Yogyakarta', postalCode: '55224', isDefault: true },
  ];

  for (const addr of addresses) {
    const existing = await prisma.address.findFirst({
      where: { userId: addr.userId, label: addr.label }
    });
    if (!existing) {
      await prisma.address.create({ data: addr });
    }
  }

  console.log('✅ Addresses created');

  // 3. Create additional categories
  console.log('🌸 Creating categories...');
  
  const sunflower = await prisma.flowerCategory.upsert({
    where: { slug: 'sunflower' },
    update: {},
    create: {
      name: 'Sunflower',
      slug: 'sunflower',
      description: 'Bunga matahari cerah dan ceria',
      image: 'https://images.unsplash.com/photo-1597848212624-e530bb4a74c2',
    },
  });

  const carnation = await prisma.flowerCategory.upsert({
    where: { slug: 'carnation' },
    update: {},
    create: {
      name: 'Carnation',
      slug: 'carnation',
      description: 'Bunga anyelir tahan lama',
      image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0',
    },
  });

  console.log('✅ Categories created');

  // 4. Get existing data
  const florist1 = await prisma.user.findUnique({ where: { email: 'florist@shop.com' } });
  if (!florist1) throw new Error('Please run main seed first: npx prisma db seed');

  const mawar = await prisma.flowerCategory.findUnique({ where: { slug: 'mawar' } });
  const tulip = await prisma.flowerCategory.findUnique({ where: { slug: 'tulip' } });
  const anggrek = await prisma.flowerCategory.findUnique({ where: { slug: 'anggrek' } });
  const buket = await prisma.flowerCategory.findUnique({ where: { slug: 'buket-campuran' } });

  // 5. Create additional products
  console.log('🌹 Creating products...');

  const products = [
    { name: 'Buket Sunflower Happiness', slug: 'buket-sunflower-happiness', description: 'Buket 7 tangkai sunflower segar dengan wrapping kertas coklat. Cocok untuk gift ulang tahun atau get well soon.', price: 225000, stock: 15, image: 'https://images.unsplash.com/photo-1597848212624-e530bb4a74c2', images: ['https://images.unsplash.com/photo-1597848212624-e530bb4a74c2'], categoryId: sunflower.id, floristId: florist1.id, isActive: true, isFeatured: true, tags: ['sunflower', 'birthday'], weight: 450 },
    { name: 'Rangkaian Carnation Pink', slug: 'rangkaian-carnation-pink', description: 'Rangkaian 12 tangkai carnation pink dengan baby breath. Tahan lama hingga 2 minggu.', price: 195000, stock: 18, image: 'https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0', images: ['https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0'], categoryId: carnation.id, floristId: florist1.id, isActive: true, isFeatured: false, tags: ['carnation', 'pink'], weight: 400 },
    { name: 'Buket Mawar Putih Elegant', slug: 'buket-mawar-putih-elegant', description: 'Buket 20 tangkai mawar putih premium dengan wrapping satin. Sempurna untuk wedding.', price: 450000, stock: 8, image: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11', images: ['https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11'], categoryId: mawar!.id, floristId: florist1.id, isActive: true, isFeatured: true, tags: ['mawar', 'wedding'], weight: 650 },
    { name: 'Standing Flower Congratulations', slug: 'standing-flower-congratulations', description: 'Standing flower mewah dengan mix mawar, lily, gerbera. Tinggi 1.8m.', price: 950000, stock: 5, image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946', images: ['https://images.unsplash.com/photo-1490750967868-88aa4486c946'], categoryId: buket!.id, floristId: florist2.id, isActive: true, isFeatured: true, tags: ['standing-flower', 'congratulations'], weight: 3500 },
    { name: 'Box Flower Tulip Rainbow', slug: 'box-flower-tulip-rainbow', description: 'Box berisi 30 tangkai tulip warna-warni import Belanda dalam box luxury.', price: 680000, stock: 6, image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102', images: ['https://images.unsplash.com/photo-1520763185298-1b434c919102'], categoryId: tulip!.id, floristId: florist2.id, isActive: true, isFeatured: false, tags: ['tulip', 'box-flower'], weight: 950 },
    { name: 'Buket Mini Rose Gold', slug: 'buket-mini-rose-gold', description: 'Hand bouquet mini dengan 5 tangkai mawar peach, baby breath, wrapping rose gold.', price: 125000, stock: 25, image: 'https://images.unsplash.com/photo-1591886960571-74d43a9d4166', images: ['https://images.unsplash.com/photo-1591886960571-74d43a9d4166'], categoryId: mawar!.id, floristId: florist3.id, isActive: true, isFeatured: false, tags: ['mini-bouquet', 'rose-gold'], weight: 250 },
    { name: 'Anggrek Bulan Premium Pot', slug: 'anggrek-bulan-premium-pot', description: 'Tanaman anggrek bulan putih dalam pot keramik premium. Berbunga 2-3 bulan.', price: 350000, stock: 10, image: 'https://images.unsplash.com/photo-1560929369-fb4d19e62f52', images: ['https://images.unsplash.com/photo-1560929369-fb4d19e62f52'], categoryId: anggrek!.id, floristId: florist3.id, isActive: true, isFeatured: true, tags: ['anggrek', 'pot'], weight: 1200 },
    { name: 'Bouquet Valentine Special', slug: 'bouquet-valentine-special', description: 'Buket spesial 50 tangkai mawar merah premium, coklat Ferrero, boneka teddy bear.', price: 1250000, stock: 3, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23', images: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23'], categoryId: mawar!.id, floristId: florist3.id, isActive: true, isFeatured: true, tags: ['valentine', 'luxury'], weight: 2000 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }

  console.log('✅ Products created (8 new)');

  // 6. Create coupons
  console.log('🎟️ Creating coupons...');

  const coupons = [
    { code: 'WELCOME50', name: 'Welcome Discount 50%', type: 'PERCENTAGE', value: 50, minPurchase: 200000, maxDiscount: 100000, usageLimit: 100, usageCount: 5, validFrom: new Date('2026-11-01'), validUntil: new Date('2026-12-31'), isActive: true },
    { code: 'WEEKEND20', name: 'Weekend Sale 20%', type: 'PERCENTAGE', value: 20, minPurchase: 150000, maxDiscount: 50000, usageLimit: 200, usageCount: 12, validFrom: new Date('2026-11-01'), validUntil: new Date('2026-11-30'), isActive: true },
    { code: 'FREESHIP', name: 'Free Shipping', type: 'FIXED', value: 15000, minPurchase: 300000, usageLimit: 50, usageCount: 3, validFrom: new Date('2026-11-01'), validUntil: new Date('2026-11-30'), isActive: true },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c as any,
    });
  }

  console.log('✅ Coupons created');

  console.log('\n🎉 Seed completed!\n');
  console.log('📊 Summary:');
  console.log('   - Users: 10 (1 admin, 1 supplier, 3 florists, 5 customers)');
  console.log('   - Products: 15 (7 existing + 8 new)');
  console.log('   - Categories: 7');
  console.log('   - Coupons: 4');
  console.log('   - Addresses: 5');
  console.log('\n🔑 Password: password123 (all users)');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
