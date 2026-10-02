import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seed...");

  // 1. Clear existing data
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.flowerCategory.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create FlowerCategory
  const categoryMawar = await prisma.flowerCategory.create({
    data: {
      name: "Mawar",
      slug: "mawar",
      description: "Bunga mawar segar pilihan",
      isActive: true,
    },
  });
  const categoryLily = await prisma.flowerCategory.create({
    data: {
      name: "Lily",
      slug: "lily",
      description: "Bunga lily putih harum dan elegan",
      isActive: true,
    },
  });
  const categoryAnggrek = await prisma.flowerCategory.create({
    data: {
      name: "Anggrek",
      slug: "anggrek",
      description: "Bunga anggrek eksotis dan tahan lama",
      isActive: true,
    },
  });
  console.log("✅ Created 3 FlowerCategories");

  const hashedPassword = await bcrypt.hash("password123", 10);
  // 3. Create User (4 role)
  const admin = await prisma.user.create({
    data: {
      name: "Admin FloraHub",
      email: "admin@florahub.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Budi Customer",
      email: "budi@mail.com",
      password: hashedPassword,
      role: "CUSTOMER",
    },
  });

  const florist = await prisma.user.create({
    data: {
      name: "Florist Shop",
      email: "florist@shop.com",
      password: hashedPassword,
      role: "FLORIST",
    },
  });

  const supplier = await prisma.user.create({
    data: {
      name: "Supplier Farm",
      email: "supplier@farm.com",
      password: hashedPassword,
      role: "SUPPLIER",
    },
  });

  console.log("✅ Created 4 Users (Admin, Customer, Florist, Supplier)");

  // 4. Create Product
  const productMawar = await prisma.product.create({
    data: {
      name: "Mawar Merah Premium",
      slug: "mawar-merah-premium",
      description:
        "Mawar merah segar berkualitas premium, cocok untuk berbagai acara",
      price: 150000,
      stock: 50,
      category: { connect: { id: categoryMawar.id } },
      florist: {
        connect: { id: florist.id },
      },
      image: "https://via.placeholder.com/300?text=Mawar+Merah",
      isActive: true,
    },
  });

  const productLily = await prisma.product.create({
    data: {
      name: "Lily Putih Segar",
      slug: "lily-putih-segar",
      description: "Bunga lily putih harum dan elegan, tahan lama",
      price: 120000,
      stock: 30,
      category: { connect: { id: categoryLily.id } },
      florist: { connect: { id: florist.id } },
      image: "https://via.placeholder.com/300?text=Lily+Putih",
      isActive: true,
    },
  });

  const productAnggrek = await prisma.product.create({
    data: {
      name: "Anggrek Bulan Eksotis",
      slug: "anggrek-bulan-eksotis",
      description: "Anggrek bulan putih eksotis, tahan lama hingga 2 minggu",
      price: 200000,
      stock: 20,
      category: { connect: { id: categoryAnggrek.id } },
      florist: { connect: { id: florist.id } },
      image: "https://via.placeholder.com/300?text=Anggrek+Bulan",
      isActive: true,
    },
  });

  console.log("✅ Created 3 Products (Mawar Merah, Lily Putih, Anggrek Bulan)");

  console.log("\n🎉 Seed completed successfully!");
  console.log("📊 Summary:");
  console.log("   - FlowerCategories: 3");
  console.log("   - Users: 4 (Admin, Customer, Florist, Supplier)");
  console.log("   - Products: 3");
  console.log("\n🔑 Login credentials:");
  console.log("   Email: admin@florahub.com | Password: password123");
  console.log("   Email: budi@mail.com | Password: password123");
  console.log("   Email: florist@shop.com | Password: password123");
  console.log("   Email: supplier@farm.com | Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
