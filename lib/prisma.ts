import { createRequire } from "node:module";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const REQUIRED_HARVEST_FIELDS = [
  "transferredToStockQty",
  "transferredStockId",
  "transferredAt",
] as const;

const ALLOWED_PAYMENT_FIELDS = new Set<string>([
  "id",
  "orderId",
  "amount",
  "method",
  "status",
  "transactionId",
  "paymentUrl",
  "expiryTime",
  "paidAt",
  "paymentProof",
  "createdAt",
  "updatedAt",
  "order",
]);

type RuntimeModelFields = Array<{ name: string }>;
type PrismaClientWithRuntime = PrismaClient & {
  _runtimeDataModel?: {
    models?: {
      User?: {
        fields?: RuntimeModelFields;
      };
      PasswordResetToken?: {
        fields?: RuntimeModelFields;
      };
      HarvestAnnouncement?: {
        fields?: RuntimeModelFields;
      };
      Payment?: {
        fields?: RuntimeModelFields;
      };
    };
  };
};

function sanitizeRuntimeSchema(client: PrismaClient): void {
  const paymentModel = (client as PrismaClientWithRuntime)._runtimeDataModel
    ?.models?.Payment;
  if (Array.isArray(paymentModel?.fields)) {
    paymentModel.fields = paymentModel.fields.filter((field) =>
      ALLOWED_PAYMENT_FIELDS.has(field.name),
    );
  }
}

function hasLatestRuntimeSchema(client: PrismaClient): boolean {
  const models = (client as PrismaClientWithRuntime)._runtimeDataModel?.models;
  const userFields = models?.User?.fields;
  if (Array.isArray(userFields)) {
    const userNames = new Set(userFields.map((field) => field.name));
    if (!userNames.has("passwordChangedAt")) {
      return false;
    }
  }

  if (models && !models.PasswordResetToken?.fields) {
    return false;
  }

  const harvestFields = models?.HarvestAnnouncement?.fields;
  if (Array.isArray(harvestFields)) {
    const harvestNames = new Set(harvestFields.map((field) => field.name));
    if (
      !REQUIRED_HARVEST_FIELDS.every((fieldName) => harvestNames.has(fieldName))
    ) {
      return false;
    }
  }

  const paymentFields = models?.Payment?.fields;
  if (Array.isArray(paymentFields)) {
    if (paymentFields.some((field) => !ALLOWED_PAYMENT_FIELDS.has(field.name))) {
      return false;
    }
  }

  return true;
}

function createFreshPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const initialClient = new PrismaClient({ adapter });

  if (
    process.env.NODE_ENV === "production" ||
    hasLatestRuntimeSchema(initialClient)
  ) {
    sanitizeRuntimeSchema(initialClient);
    return initialClient;
  }

  // Muat ulang modul PrismaClient bila next dev masih memegang cache sebelum prisma generate.
  try {
    void initialClient.$disconnect().catch(() => {});
    const req = createRequire(path.join(process.cwd(), "package.json"));
    for (const cacheKey of Object.keys(req.cache)) {
      if (/[\\/](?:@prisma|\.prisma)[\\/]client[\\/]/.test(cacheKey)) {
        delete req.cache[cacheKey];
      }
    }
    const prismaPkgName = ["@prisma", "client"].join("/");
    const freshModule = req(prismaPkgName) as {
      PrismaClient: new (options: { adapter: PrismaPg }) => PrismaClient;
    };
    const freshClient = new freshModule.PrismaClient({ adapter });
    sanitizeRuntimeSchema(freshClient);
    return freshClient;
  } catch {
    sanitizeRuntimeSchema(initialClient);
    return initialClient;
  }
}

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
};

const cachedPrisma = globalForPrisma.prisma;
if (cachedPrisma) {
  sanitizeRuntimeSchema(cachedPrisma);
  if (!hasLatestRuntimeSchema(cachedPrisma)) {
    void cachedPrisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
}

// Inisialisasi klien Prisma database singleton untuk penggunaan global aplikasi
const prisma = globalForPrisma.prisma || createFreshPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  image: true,
  isActive: true,
} as const;

export { isPrismaUniqueError } from "./prisma-errors";

export default prisma;
