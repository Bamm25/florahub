import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedReviews() {
  console.log('⭐ Seeding product reviews...\n');

  const products = await prisma.product.findMany().then(p => p.slice(0, 10));
  const customers = await prisma.user.findMany({ where: { role: 'CUSTOMER' } });

  const reviews = [
    { rating: 5, comment: 'Bunganya sangat segar dan indah! Packaging rapi, pengiriman cepat. Recommended!' },
    { rating: 5, comment: 'Kualitas bunga premium, sesuai dengan gambar. Penerima sangat senang. Thank you!' },
    { rating: 4, comment: 'Bagus tapi agak lama sampainya. Overall puas dengan kualitas bunganya.' },
    { rating: 5, comment: 'Bunga cantik, wangi, dan tahan lama. Florist responsif. Pasti order lagi!' },
    { rating: 4, comment: 'Memuaskan! Bunga fresh dan wrapping mewah. Cocok untuk hadiah special occasion.' },
    { rating: 5, comment: 'Excellent! Bunga lebih bagus dari foto. Delivery tepat waktu. Highly recommended!' },
    { rating: 5, comment: 'Perfect untuk anniversary! Istri saya sangat suka. Terima kasih FloraHub!' },
    { rating: 4, comment: 'Bunga cantik dan segar. Harga sedikit mahal tapi worth it untuk kualitasnya.' },
    { rating: 5, comment: 'Selalu puas belanja disini. Bunga selalu fresh, service excellent. The best!' },
    { rating: 5, comment: 'Bunganya wangi banget! Tahan lama sampai seminggu. Harga reasonable untuk kualitas premium.' },
  ];

  let count = 0;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const customer = customers[i % customers.length];
    const review = reviews[i % reviews.length];
    
    await prisma.review.create({
      data: {
        productId: product.id,
        userId: customer.id,
        rating: review.rating,
        comment: review.comment,
        isVerified: true,
      },
    });
    count++;
  }

  console.log(`✅ ${count} reviews created\n`);
  console.log('📊 Review distribution:');
  console.log(`   5 stars: ${reviews.filter(r => r.rating === 5).length * Math.ceil(products.length / reviews.length)}`);
  console.log(`   4 stars: ${reviews.filter(r => r.rating === 4).length * Math.ceil(products.length / reviews.length)}`);
}

seedReviews()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
