import * as z from "zod";

// Skema validasi pendaftaran pengguna baru untuk semua peran
export const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  phone: z.string().regex(/^\d{10,15}$/, "No HP harus 10-15 digit"),
  role: z.enum(["CUSTOMER", "FLORIST", "SUPPLIER"]),
});

// Skema validasi pembuatan alamat pengiriman baru
export const createAddressSchema = z.object({
  label: z.string().min(1, "Label wajib diisi").max(50),
  recipientName: z.string().min(3, "Nama penerima minimal 3 karakter"),
  phone: z.string().regex(/^\d{10,15}$/, "No HP harus 10-15 digit"),
  fullAddress: z.string().min(10, "Alamat lengkap minimal 10 karakter"),
  city: z.string().min(1, "Kota wajib diisi"),
  province: z.string().min(1, "Provinsi wajib diisi"),
  postalCode: z.string().regex(/^\d{5,8}$/, "Kode pos harus 5-8 digit"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

// Skema validasi pembaruan data alamat pengiriman
export const updateAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  recipientName: z.string().min(3).optional(),
  phone: z
    .string()
    .regex(/^\d{10,15}$/)
    .optional(),
  fullAddress: z.string().min(10).optional(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  postalCode: z
    .string()
    .regex(/^\d{5,8}$/)
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().optional(),
});

// Skema validasi data pesanan saat proses checkout pelanggan
export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Address ID tidak valid").optional(),
  shippingCost: z.number().min(0, "Ongkir tidak boleh negatif"),
  couponCode: z.string().min(3).toUpperCase().optional(),
  notes: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID tidak valid"),
        quantity: z.number().int().min(1, "Quantity minimal 1"),
        price: z.number().min(0, "Harga tidak boleh negatif"),
      }),
    )
    .min(1, "Cart tidak boleh kosong"),
});

// Skema validasi pembuatan kupon diskon baru oleh admin
export const createCouponSchema = z.object({
  code: z.string().trim().min(3, "Kode minimal 3 karakter").max(20).toUpperCase(),
  name: z.string().trim().min(1, "Nama kupon wajib diisi").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0, "Nilai tidak boleh negatif"),
  minPurchase: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usagePerUser: z.number().int().min(1).default(1),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
  applicableFor: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().default(true),
});

// Skema validasi pembaruan data kupon diskon oleh admin
export const updateCouponSchema = z.object({
  code: z.string().trim().min(3, "Kode minimal 3 karakter").max(20).toUpperCase().optional(),
  name: z.string().trim().min(1, "Nama kupon wajib diisi").max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).optional(),
  value: z.number().min(0).optional(),
  minPurchase: z.number().min(0).nullable().optional(),
  maxDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usagePerUser: z.number().int().min(1).optional(),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
  applicableFor: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
});

// Skema validasi penambahan produk baru oleh florist
export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(100),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  categoryId: z.string().min(1, "Category ID tidak valid"),
  image: z.url("URL gambar tidak valid").optional(),
  isActive: z.boolean().default(true),
});

// Skema validasi pembaruan data produk oleh florist
export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().min(1).optional(),
  image: z.url().optional(),
  isActive: z.boolean().optional(),
});

// Skema validasi penulisan ulasan dan penilaian produk oleh pelanggan
export const createReviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, "Rating minimal 1")
    .max(5, "Rating maksimal 5"),
  comment: z
    .string()
    .min(10, "Komentar minimal 10 karakter")
    .max(1000)
    .optional(),
  images: z.array(z.url()).max(5, "Maksimal 5 gambar").optional(),
});

// Skema validasi pembaruan ulasan dan penilaian produk oleh pelanggan
export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
  images: z.array(z.url()).max(5).optional(),
});

// Skema validasi pembuatan kategori produk baru
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(50),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug harus lowercase, angka, dan dash saja"),
  description: z.string().trim().max(500).nullable().optional(),
  image: z.url().nullable().optional(),
  isActive: z.boolean().default(true),
});

// Skema validasi pembaruan data kategori produk
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(50).optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug wajib diisi")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug harus lowercase, angka, dan dash saja")
    .optional(),
  description: z.string().trim().max(500).nullable().optional(),
  image: z.url().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Skema validasi penambahan stok inventaris florist
export const createInventorySchema = z.object({
  stockId: z.string().min(1, "Stock ID tidak valid"),
  quantity: z.number().min(0, "Quantity tidak boleh negatif"),
  location: z.string().min(1, "Lokasi wajib diisi").max(100),
  notes: z.string().max(500).optional(),
});

// Skema validasi pembaruan data inventaris florist
export const updateInventorySchema = z.object({
  quantity: z.number().min(0).optional(),
  location: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Skema validasi pembuatan komponen bahan baku produk florist
export const createProductComponentSchema = z.object({
  inventoryId: z.string().length(25, "Inventory ID harus CUID 25 karakter"), // ID inventory Prisma bertipe CUID
  quantity: z.number().min(0.01, "Quantity harus lebih dari 0"),
});

// Skema validasi pembaruan jumlah komponen bahan baku produk
export const updateProductComponentSchema = z.object({
  quantity: z.number().min(0.01).optional(),
});

// Skema validasi pendaftaran stok pasokan baru oleh supplier
export const createStockSchema = z.object({
  name: z.string().min(1, "Nama stock wajib diisi").max(100),
  variety: z.string().min(1, "Varietas wajib diisi").max(100),
  unit: z.string().min(1, "Unit wajib diisi").max(20),
  pricePerUnit: z.number().int().min(0, "Harga tidak boleh negatif"),
  quantity: z.number().int().min(0, "Quantity tidak boleh negatif"),
});

// Skema validasi pembaruan data stok pasokan oleh supplier
export const updateStockSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  variety: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  pricePerUnit: z.number().int().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

// Skema validasi pembuatan pengumuman panen oleh supplier
export const createHarvestAnnouncementSchema = z.object({
  flowerName: z.string().min(1, "Nama bunga wajib diisi").max(100),
  variety: z.string().max(100).optional(),
  estimatedQuantity: z.number().int().min(1, "Quantity minimal 1"),
  pricePerUnit: z.number().int().min(0, "Harga tidak boleh negatif"),
  harvestDate: z.iso.datetime(),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").optional(),
  location: z.string().max(200).optional(),
  image: z.url().optional(),
});

// Skema validasi pembaruan data pengumuman panen oleh supplier
export const updateHarvestAnnouncementSchema = z.object({
  flowerName: z.string().min(1).max(100).optional(),
  variety: z.string().max(100).optional(),
  estimatedQuantity: z.number().int().min(0).optional(),
  pricePerUnit: z.number().int().min(0).optional(),
  harvestDate: z.iso.datetime().optional(),
  description: z.string().min(10).optional(),
  location: z.string().max(200).optional(),
  image: z.url().optional(),
  isActive: z.boolean().optional(),
});

// Skema validasi pembuatan pesanan prapesan dari pengumuman panen
export const createPreorderSchema = z.object({
  harvestAnnouncementId: z
    .string()
    .min(1, "Harvest announcement ID tidak valid"),
  quantity: z.number().int().positive("Quantity minimal 1"),
  notes: z.string().max(500).nullable().optional(),
});

// Skema validasi persetujuan/penolakan pesanan prapesan
export const updatePreorderSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  cancelReason: z
    .string()
    .min(10, "Alasan pembatalan minimal 10 karakter")
    .optional(),
});

// Skema validasi pembuatan pembelian pasokan bunga
export const createPurchaseSchema = z.object({
  stockId: z.string().min(1, "Stock ID tidak valid"),
  quantity: z.number().int().positive("Quantity minimal 1"),
  notes: z.string().max(500).optional(),
});

// Skema validasi pengunggahan bukti bayar pembelian pasokan bunga
export const updatePurchaseSchema = z.object({
  paymentProof: z.url("URL bukti bayar tidak valid"),
});

// Skema validasi pembuatan data pengiriman pesanan florist
export const createShipmentSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
  courier: z.string().min(1, "Nama kurir wajib diisi").max(50),
  service: z.string().max(20).nullable().optional(),
  trackingNumber: z.string().max(100).nullable().optional(),
  estimatedDays: z.number().int().min(1).nullable().optional(),
  weight: z.number().min(0.01, "Berat minimal 0.01 kg").nullable().optional(),
});

// Skema validasi pembaruan status dan informasi pengiriman pesanan
export const updateShipmentStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ]),
  courier: z.string().min(1).max(50).optional(),
  service: z.string().max(20).nullable().optional(),
  trackingNumber: z.string().max(100).nullable().optional(),
  estimatedDays: z.number().int().min(1).nullable().optional(),
  weight: z.number().min(0.01).nullable().optional(),
});

// Skema validasi pembaruan status transaksi penjualan
export const updateSaleSchema = z.object({
  status: z.enum(["PAID", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  courier: z.string().max(100).optional(),
  trackingNumber: z.string().max(100).optional(),
  deliveredAt: z.iso.datetime().optional(),
});

// Skema validasi pembuatan data transaksi pembayaran
export const createPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
});

// Skema validasi penambahan item ke dalam keranjang belanja
export const createCartItemSchema = z.object({
  productId: z.string().min(1, "Product ID tidak valid"),
  quantity: z.number().int().min(1, "Quantity minimal 1"),
});

// Skema validasi pembaruan kuantitas item dalam keranjang belanja
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity minimal 1"),
});

// Skema validasi pemeriksaan kode kupon belanja
export const validateCouponSchema = z.object({
  code: z.string().min(3, "Kode kupon minimal 3 karakter").toUpperCase(),
  subtotal: z.number().min(0, "Subtotal tidak boleh negatif"),
  shippingCost: z.number().min(0, "Ongkir tidak boleh negatif").optional(),
});

// Form admin ini hanya mengubah status akun. Koreksi identitas memerlukan alur
// tersendiri agar sesi dan alamat email login tetap sinkron.
export const updateUserSchema = z
  .object({
    isActive: z.boolean(),
    reasonCode: z.enum([
      "POLICY_VIOLATION",
      "USER_REQUEST",
      "ACCOUNT_RECOVERY",
    ]),
  })
  .strict();

// Skema validasi pembuatan notifikasi sistem untuk pengguna
export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID tidak valid"),
  title: z.string().min(1, "Judul wajib diisi").max(200),
  message: z.string().min(1, "Pesan wajib diisi").max(1000),
  type: z.string().max(50).optional(),
  link: z.string().max(500).optional(),
});

// Skema validasi pembaruan status keterbacaan notifikasi
export const updateNotificationSchema = z.object({
  isRead: z.boolean(),
});

// Skema validasi query daftar pengguna admin
export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["ADMIN", "SUPPLIER", "FLORIST", "CUSTOMER"]).optional(),
  search: z.string().trim().max(100).optional(),
});

// Skema validasi pembaruan profil pelanggan
export const updateCustomerProfileSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(100),
  phone: z.string().regex(/^\d{10,15}$/, "No HP harus 10-15 digit"),
});

// Skema validasi pembaruan profil toko florist
export const updateFloristProfileSchema = z.object({
  shopName: z.string().min(3).max(200).optional(),
  shopDescription: z.string().max(1000).optional().nullable(),
  logo: z.url().max(500).optional().nullable(),
  banner: z.url().max(500).optional().nullable(),
});

// Skema validasi kuantitas produksi produk florist
export const produceProductSchema = z.object({
  quantity: z.number().int().positive("Jumlah harus lebih dari 0"),
});

// Skema validasi pembuatan bahan baku mandiri oleh florist
export const createRawMaterialSchema = z.object({
  name: z.string().min(2, "Nama bahan baku minimal 2 karakter"),
  category: z.string().default("Bunga Segar"),
  variety: z.string().optional().nullable(),
  quantity: z.number().int().min(0, "Stok awal tidak boleh negatif"),
  unit: z.string().default("tangkai"),
  pricePerUnit: z
    .number()
    .int()
    .min(0, "Harga modal per unit tidak boleh negatif"),
  minThreshold: z.number().int().min(0).default(10),
  location: z.string().optional().nullable(),
});

// Skema validasi pembaruan bahan baku atau penyesuaian stok florist
export const updateRawMaterialSchema = z.object({
  action: z.enum(["UPDATE_DETAILS", "ADJUST_STOCK"]).default("UPDATE_DETAILS"),
  name: z.string().min(2, "Nama minimal 2 karakter").optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  pricePerUnit: z.number().int().min(0).optional(),
  minThreshold: z.number().int().min(0).optional(),
  location: z.string().optional().nullable(),
  adjustmentType: z.enum(["ADD", "SUBTRACT", "SET"]).optional(),
  amount: z.number().int().min(0).optional(),
  reason: z.string().optional(),
});

// Skema validasi query daftar pesanan B2C untuk monitoring admin
export const adminOrderStatusEnum = z.enum([
  "PENDING",
  "PAID",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: adminOrderStatusEnum.optional(),
  isPreorder: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().max(100).optional(),
});

// Skema validasi query rantai pasok B2B (Direct Sales & Harvest Pre-Order) untuk monitoring admin
export const adminDirectSupplyStatusEnum = z.enum([
  "PENDING",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const adminPreOrderSupplyStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
]);

export const adminSupplyQuerySchema = z
  .object({
    type: z.enum(["DIRECT", "PREORDER"]).default("DIRECT"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().trim().optional(),
    search: z.string().trim().max(100).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.status) return;
    if (
      val.type === "DIRECT" &&
      !adminDirectSupplyStatusEnum.safeParse(val.status).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Status transaksi stok langsung tidak valid",
      });
    }
    if (
      val.type === "PREORDER" &&
      !adminPreOrderSupplyStatusEnum.safeParse(val.status).success
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Status pre-order panen tidak valid",
      });
    }
  });

// Skema validasi query daftar kupon promosi untuk admin
export const adminCouponQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().max(100).optional(),
});

// Skema validasi query daftar kategori bunga
export const adminCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  isActive: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateRawMaterialInput = z.infer<typeof createRawMaterialSchema>;
export type UpdateRawMaterialInput = z.infer<typeof updateRawMaterialSchema>;
export type UpdateCustomerProfileInput = z.infer<
  typeof updateCustomerProfileSchema
>;
export type UpdateFloristProfileInput = z.infer<
  typeof updateFloristProfileSchema
>;
export type AdminUserQueryInput = z.infer<typeof adminUserQuerySchema>;
export type AdminOrderQueryInput = z.infer<typeof adminOrderQuerySchema>;
export type AdminSupplyQueryInput = z.infer<typeof adminSupplyQuerySchema>;
export type AdminCouponQueryInput = z.infer<typeof adminCouponQuerySchema>;
export type AdminCategoryQueryInput = z.infer<typeof adminCategoryQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
