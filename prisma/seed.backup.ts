import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data (optional - comment out if you want to keep existing data)
  // await prisma.orderItem.deleteMany();
  // await prisma.order.deleteMany();
  // await prisma.product.deleteMany();
  // await prisma.flowerCategory.deleteMany();
  // await prisma.user.deleteMany();

  // 1. Create/Get Florist User
  console.log('👤 Creating florist user...');
  const floristEmail = 'florist@shop.com';
  let florist = await prisma.user.findUnique({
    where: { email: floristEmail },
  });

  if (!florist) {
    florist = await prisma.user.create({
      data: {
        name: 'Toko Bunga Indah',
        email: floristEmail,
        password: await bcrypt.hash('password123', 10),
        role: 'FLORIST',
        phone: '081234567890',
        isActive: true,
      },
    });
    console.log('✅ Florist user created');
  } else {
    console.log('✅ Florist user already exists');
  }

  // 2. Create Flower Categories
  console.log('🌸 Creating flower categories...');
  const categories = [
    {
      name: 'Mawar',
      slug: 'mawar',
      description: 'Bunga mawar berbagai warna dan jenis',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
    },
    {
      name: 'Anggrek',
      slug: 'anggrek',
      description: 'Bunga anggrek cantik dan elegan',
      image: 'https://images.unsplash.com/photo-1560929369-fb4d19e62f52',
    },
    {
      name: 'Tulip',
      slug: 'tulip',
      description: 'Bunga tulip import berkualitas',
      image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102',
    },
    {
      name: 'Lily',
      slug: 'lily',
      description: 'Bunga lily harum dan indah',
      image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd',
    },
    {
      name: 'Buket Campuran',
      slug: 'buket-campuran',
      description: 'Rangkaian buket berbagai jenis bunga',
      image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364',
    },
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const existing = await prisma.flowerCategory.findUnique({
      where: { slug: cat.slug },
    });
    if (existing) {
      createdCategories.push(existing);
      console.log(`  ⏭️  Category "${cat.name}" already exists`);
    } else {
      const created = await prisma.flowerCategory.create({ data: cat });
      createdCategories.push(created);
      console.log(`  ✅ Created category: ${cat.name}`);
    }
  }

  // 3. Create Products for florist@shop.com
  console.log('🌹 Creating products for florist@shop.com...');
  const products = [
    {
      name: 'Buket Mawar Merah Premium',
      slug: 'buket-mawar-merah-premium',
      description:
        'Buket mawar merah segar pilihan dengan 12 tangkai mawar import kualitas premium. Cocok untuk anniversary, proposal, atau ungkapan cinta.',
      price: 350000,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11',
      images: [
        'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23',
      ],
      categoryId: createdCategories.find((c) => c.slug === 'mawar')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: true,
      tags: ['premium', 'mawar-merah', 'romantis'],
      weight: 500,
    },
    {
      name: 'Rangkaian Anggrek Bulan Putih',
      slug: 'rangkaian-anggrek-bulan-putih',
      description:
        'Rangkaian anggrek bulan putih elegan dalam pot keramik. Tahan lama hingga 2-3 minggu dengan perawatan tepat. Sempurna untuk dekorasi rumah atau kantor.',
      price: 450000,
      stock: 8,
      image: 'https://images.unsplash.com/photo-1560929369-fb4d19e62f52',
      images: ['https://images.unsplash.com/photo-1560929369-fb4d19e62f52'],
      categoryId: createdCategories.find((c) => c.slug === 'anggrek')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: false,
      tags: ['anggrek', 'putih', 'elegan'],
      weight: 1200,
    },
    {
      name: 'Buket Tulip Belanda Mix',
      slug: 'buket-tulip-belanda-mix',
      description:
        'Buket tulip import Belanda dengan 20 tangkai warna-warni cerah. Fresh dari Belanda, cocok untuk hadiah ulang tahun atau ucapan selamat.',
      price: 520000,
      stock: 5,
      image: 'https://images.unsplash.com/photo-1520763185298-1b434c919102',
      images: [
        'https://images.unsplash.com/photo-1520763185298-1b434c919102',
        'https://images.unsplash.com/photo-1490750967868-88aa4486c946',
      ],
      categoryId: createdCategories.find((c) => c.slug === 'tulip')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: true,
      tags: ['tulip', 'import', 'belanda', 'mix-color'],
      weight: 600,
    },
    {
      name: 'Standing Flower Lily Dukacita',
      slug: 'standing-flower-lily-dukacita',
      description:
        'Standing flower dengan lily putih, krisan, dan mawar putih. Tinggi 1.5m dengan karangan bunga elegant untuk turut berduka cita.',
      price: 750000,
      stock: 12,
      image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd',
      images: ['https://images.unsplash.com/photo-1563241527-3004b7be0ffd'],
      categoryId: createdCategories.find((c) => c.slug === 'lily')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: false,
      tags: ['lily', 'standing-flower', 'dukacita'],
      weight: 2500,
    },
    {
      name: 'Buket Wisuda Rose Gold Elegant',
      slug: 'buket-wisuda-rose-gold-elegant',
      description:
        'Buket wisuda cantik dengan kombinasi mawar pink, baby breath, dan wrapping rose gold. Dilengkapi boneka wisuda mini dan greeting card.',
      price: 280000,
      stock: 3,
      image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364',
      images: [
        'https://images.unsplash.com/photo-1561181286-d3fee7d55364',
        'https://images.unsplash.com/photo-1527529482837-4698179dc6ce',
      ],
      categoryId: createdCategories.find((c) => c.slug === 'buket-campuran')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: true,
      tags: ['wisuda', 'buket-campuran', 'rose-gold'],
      weight: 400,
    },
    {
      name: 'Hand Bouquet Gerbera Rainbow',
      slug: 'hand-bouquet-gerbera-rainbow',
      description:
        'Hand bouquet ceria dengan 10 tangkai gerbera warna-warni. Bunga fresh dan tahan lama, cocok untuk gift ulang tahun atau congratulations.',
      price: 185000,
      stock: 20,
      image: 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d',
      images: ['https://images.unsplash.com/photo-1525310072745-f49212b5ac6d'],
      categoryId: createdCategories.find((c) => c.slug === 'buket-campuran')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: false,
      tags: ['gerbera', 'rainbow', 'hand-bouquet'],
      weight: 350,
    },
    {
      name: 'Box Flower Mawar Peach',
      slug: 'box-flower-mawar-peach',
      description:
        'Box flower premium dengan 25 tangkai mawar peach dalam kotak persegi elegan. Tersedia greeting card custom dan pita satin.',
      price: 420000,
      stock: 7,
      image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d',
      images: ['https://images.unsplash.com/photo-1610375461246-83df859d849d'],
      categoryId: createdCategories.find((c) => c.slug === 'mawar')!.id,
      floristId: florist.id,
      isActive: true,
      isFeatured: false,
      tags: ['box-flower', 'mawar-peach', 'premium'],
      weight: 800,
    },
  ];

  const createdProducts = [];
  for (const prod of products) {
    const existing = await prisma.product.findUnique({
      where: { slug: prod.slug },
    });
    if (existing) {
      createdProducts.push(existing);
      console.log(`  ⏭️  Product "${prod.name}" already exists`);
    } else {
      const created = await prisma.product.create({ data: prod });
      createdProducts.push(created);
      console.log(`  ✅ Created product: ${prod.name} (Stock: ${prod.stock})`);
    }
  }

  // 4. Create a test customer
  console.log('👥 Creating test customer...');
  const customerEmail = 'customer@test.com';
  let customer = await prisma.user.findUnique({
    where: { email: customerEmail },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: customerEmail,
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        phone: '081298765432',
        isActive: true,
      },
    });
    console.log('✅ Customer created');
  } else {
    console.log('✅ Customer already exists');
  }

  // 5. Create customer address
  console.log('📍 Creating customer address...');
  const existingAddress = await prisma.address.findFirst({
    where: { userId: customer.id },
  });

  let address;
  if (!existingAddress) {
    address = await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Rumah',
        recipientName: 'Test Customer',
        phone: '081298765432',
        fullAddress: 'Jl. Sudirman No. 123, RT 01/RW 05',
        city: 'Jakarta Selatan',
        province: 'DKI Jakarta',
        postalCode: '12190',
        latitude: -6.2088,
        longitude: 106.8456,
        isDefault: true,
      },
    });
    console.log('✅ Address created');
  } else {
    address = existingAddress;
    console.log('✅ Address already exists');
  }

  // 6. Create sample orders for florist
  console.log('📦 Creating sample orders...');
  
  // Get a few products to create orders
  const productsForOrders = createdProducts.slice(0, 4);
  
  // Order 1 - PAID (needs processing)
  const order1Exists = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-2026110701' },
  });

  if (!order1Exists) {
    const order1Items = [
      {
        productId: productsForOrders[0].id,
        quantity: 2,
        price: productsForOrders[0].price,
        subtotal: productsForOrders[0].price * 2,
      },
    ];

    const order1 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026110701',
        userId: customer.id,
        addressId: address.id,
        subtotal: order1Items[0].subtotal,
        shippingCost: 15000,
        discount: 0,
        totalAmount: order1Items[0].subtotal + 15000,
        status: 'PAID',
        createdAt: new Date('2026-11-07T08:30:00Z'),
        items: {
          create: order1Items,
        },
        payment: {
          create: {
            amount: order1Items[0].subtotal + 15000,
            method: 'bank_transfer',
            status: 'PAID',
            transactionId: 'TRX-2026110701',
            paidAt: new Date('2026-11-07T08:35:00Z'),
          },
        },
      },
    });
    console.log(`  ✅ Created order: ${order1.orderNumber} (PAID)`);
  } else {
    console.log('  ⏭️  Order ORD-2026110701 already exists');
  }

  // Order 2 - PROCESSING
  const order2Exists = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-2026110602' },
  });

  if (!order2Exists) {
    const order2Items = [
      {
        productId: productsForOrders[1].id,
        quantity: 1,
        price: productsForOrders[1].price,
        subtotal: productsForOrders[1].price,
      },
    ];

    const order2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026110602',
        userId: customer.id,
        addressId: address.id,
        subtotal: order2Items[0].subtotal,
        shippingCost: 20000,
        discount: 0,
        totalAmount: order2Items[0].subtotal + 20000,
        status: 'PROCESSING',
        createdAt: new Date('2026-11-06T14:20:00Z'),
        items: {
          create: order2Items,
        },
        payment: {
          create: {
            amount: order2Items[0].subtotal + 20000,
            method: 'e_wallet',
            status: 'PAID',
            transactionId: 'TRX-2026110602',
            paidAt: new Date('2026-11-06T14:22:00Z'),
          },
        },
      },
    });
    console.log(`  ✅ Created order: ${order2.orderNumber} (PROCESSING)`);
  } else {
    console.log('  ⏭️  Order ORD-2026110602 already exists');
  }

  // Order 3 - READY_TO_SHIP
  const order3Exists = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-2026110503' },
  });

  if (!order3Exists) {
    const order3Items = [
      {
        productId: productsForOrders[2].id,
        quantity: 1,
        price: productsForOrders[2].price,
        subtotal: productsForOrders[2].price,
      },
      {
        productId: productsForOrders[3].id,
        quantity: 1,
        price: productsForOrders[3].price,
        subtotal: productsForOrders[3].price,
      },
    ];

    const totalSubtotal = order3Items.reduce((sum, item) => sum + item.subtotal, 0);

    const order3 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2026110503',
        userId: customer.id,
        addressId: address.id,
        subtotal: totalSubtotal,
        shippingCost: 25000,
        discount: 50000,
        totalAmount: totalSubtotal + 25000 - 50000,
        status: 'READY_TO_SHIP',
        createdAt: new Date('2026-11-05T10:15:00Z'),
        items: {
          create: order3Items,
        },
        payment: {
          create: {
            amount: totalSubtotal + 25000 - 50000,
            method: 'bank_transfer',
            status: 'PAID',
            transactionId: 'TRX-2026110503',
            paidAt: new Date('2026-11-05T10:20:00Z'),
          },
        },
      },
    });
    console.log(`  ✅ Created order: ${order3.orderNumber} (READY_TO_SHIP)`);
  } else {
    console.log('  ⏭️  Order ORD-2026110503 already exists');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Florist: ${florist.email}`);
  console.log(`   - Categories: ${createdCategories.length}`);
  console.log(`   - Products: ${createdProducts.length}`);
  console.log(`   - Customer: ${customer.email}`);
  console.log(`   - Sample orders: 3`);
  console.log('\n🔑 Login credentials:');
  console.log(`   Florist: ${floristEmail} / password123`);
  console.log(`   Customer: ${customerEmail} / password123`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
