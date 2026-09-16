import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
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
      description: "Bunga mawar segar pilihan",
    },
  });
  const categoryLily = await prisma.flowerCategory.create({
    data: {
      name: "Lily",
      description: "Bunga lily putih harum dan elegan",
    },
  });
  console.log("Created FlowerCategories");

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

  console.log("Created User");

  // 4. Create Product
  const productMawar = await prisma.product.create({
    data: {
      name: "Mawar Merah Premium",
      description:
        "Mawar merah segar berkualitas premium, cocok untuk berbagai acara",
      price: 150000,
      stock: 50,
      category: { connect: { id: categoryMawar.id } },
      florist: {
        connect: { id: supplier.id },
      },
      image: "https://via.placeholder.com/300?text=Mawar+Merah",
      isActive: true,
    },
  });

  const productLily = await prisma.product.create({
    data: {
      name: "Lily Putih Segar",
      description: "Bunga lily putih harum dan elegan, tahan lama",
      price: 120000,
      stock: 30,
      category: { connect: { id: categoryLily.id } },
      florist: { connect: { id: supplier.id } },
      image: "https://via.placeholder.com/300?text=Lily+Putih",
      isActive: true,
    },
  });

  console.log("Created Products");

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
