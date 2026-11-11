import * as z from "zod";

// Auth
// Register schema untuk semua role (customer, florist, supplier)
export const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(100),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  phone: z.string().regex(/^\d{10,15}$/, "No HP harus 10-15 digit"),
  role: z.enum(["CUSTOMER", "FLORIST", "SUPPLIER"]),
});

// Customer Address
// Buat address baru
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

// Update address (semua field optional)
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

// Checkout
// Customer checkout order
export const checkoutSchema = z.object({
  addressId: z.string().min(1, "Address ID tidak valid").optional(),
  shippingCost: z.number().min(0, "Ongkir tidak boleh negatif"),
  couponCode: z.string().min(3).toUpperCase().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1, "Product ID tidak valid"),
      quantity: z.number().int().min(1, "Quantity minimal 1"),
      price: z.number().min(0, "Harga tidak boleh negatif"),
    })
  ).min(1, "Cart tidak boleh kosong"),
});

// Coupons
// Admin create coupon
export const createCouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]),
  value: z.number().min(0, "Nilai tidak boleh negatif"),
  minPurchase: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  usagePerUser: z.number().int().min(1).default(1),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
  isActive: z.boolean().default(true),
});

// Admin update coupon (semua field optional kecuali code)
export const updateCouponSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(["PERCENTAGE", "FIXED", "FREE_SHIPPING"]).optional(),
  value: z.number().min(0).optional(),
  minPurchase: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  usagePerUser: z.number().int().min(1).optional(),
  validFrom: z.iso.datetime().optional(),
  validUntil: z.iso.datetime().optional(),
  isActive: z.boolean().optional(),
});

// Product schemas
// Create product
export const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").max(100),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  stock: z.number().int().min(0, "Stok tidak boleh negatif"),
  categoryId: z.string().min(1, "Category ID tidak valid"),
  image: z.url("URL gambar tidak valid").optional(),
  isActive: z.boolean().default(true),
});

// Update product (semua field optional)
export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().min(1).optional(),
  image: z.url().optional(),
  isActive: z.boolean().optional(),
});

// Review schemas
// Create review
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

// Update review
export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
  images: z.array(z.url()).max(5).optional(),
});

// Category schemas
// Create category
export const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(50),
  slug: z
    .string()
    .min(1, "Slug wajib diisi")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug harus lowercase, angka, dan dash saja"),
  description: z.string().max(500).optional(),
  image: z.url().optional(),
});

// Update category
export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  image: z.url().optional(),
});

// Florist inventory schemas
// Create inventory
export const createInventorySchema = z.object({
  stockId: z.string().min(1, "Stock ID tidak valid"),
  quantity: z.number().min(0, "Quantity tidak boleh negatif"),
  location: z.string().min(1, "Lokasi wajib diisi").max(100),
  notes: z.string().max(500).optional(),
});

// Update inventory
export const updateInventorySchema = z.object({
  quantity: z.number().min(0).optional(),
  location: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Florist product component schemas
// Create product component
export const createProductComponentSchema = z.object({
  inventoryId: z.string().length(25, "Inventory ID harus CUID 25 karakter"), // ID inventory Prisma bertipe CUID
  quantity: z.number().min(0.01, "Quantity harus lebih dari 0"),
});

// Update product component
export const updateProductComponentSchema = z.object({
  quantity: z.number().min(0.01).optional(),
});

// Supplier stock schemas
// Create stock
export const createStockSchema = z.object({
  name: z.string().min(1, "Nama stock wajib diisi").max(100),
  variety: z.string().min(1, "Varietas wajib diisi").max(100),
  unit: z.string().min(1, "Unit wajib diisi").max(20),
  pricePerUnit: z.number().min(0, "Harga tidak boleh negatif"),
  quantity: z.number().min(0, "Quantity tidak boleh negatif"),
});

// Update stock
export const updateStockSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  variety: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  pricePerUnit: z.number().min(0).optional(),
  minimumOrder: z.number().min(1).optional(),
  description: z.string().max(1000).optional(),
  image: z.url().optional(),
});

// Supplier harvest announcement schemas
// Create harvest announcement
export const createHarvestAnnouncementSchema = z.object({
  flowerName: z.string().min(1, "Nama bunga wajib diisi").max(100),
  variety: z.string().max(100).optional(),
  estimatedQuantity: z.number().min(1, "Quantity minimal 1"),
  pricePerUnit: z.number().min(0, "Harga tidak boleh negatif"),
  harvestDate: z.iso.datetime(),
  description: z.string().min(10, "Deskripsi minimal 10 karakter").optional(),
  location: z.string().max(200).optional(),
  image: z.url().optional(),
});

// Update harvest announcement
export const updateHarvestAnnouncementSchema = z.object({
  flowerName: z.string().min(1).max(100).optional(),
  variety: z.string().max(100).optional(),
  estimatedQuantity: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0).optional(),
  harvestDate: z.iso.datetime().optional(),
  description: z.string().min(10).optional(),
  location: z.string().max(200).optional(),
  image: z.url().optional(),
  isActive: z.boolean().optional(),
});

// Preorder schemas
// Create preorder
export const createPreorderSchema = z.object({
  harvestAnnouncementId: z.string().min(1, "Harvest announcement ID tidak valid"),
  quantity: z.number().min(1, "Quantity minimal 1"),
  notes: z.string().max(500).nullable().optional(),
});

// Update preorder
export const updatePreorderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "FULFILLED"]),
  cancelReason: z.string().min(10, "Alasan pembatalan minimal 10 karakter").optional(),
});

// Purchase & shipment schemas
// Create purchase
export const createPurchaseSchema = z.object({
  stockId: z.string().min(1, "Stock ID tidak valid"),
  quantity: z.number().min(1, "Quantity minimal 1"),
  notes: z.string().max(500).optional(),
});

// Update purchase
export const updatePurchaseSchema = z.object({
  paymentProof: z.url("URL bukti bayar tidak valid"),
});

// Create shipment
export const createShipmentSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
  courier: z.string().min(1, "Nama kurir wajib diisi").max(50),
  service: z.string().max(20).nullable().optional(),
  trackingNumber: z.string().max(100).nullable().optional(),
  estimatedDays: z.number().int().min(1).nullable().optional(),
  weight: z.number().min(0.01, "Berat minimal 0.01 kg").nullable().optional(),
});

// Update shipment
export const updateShipmentStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  courier: z.string().min(1).max(50).optional(),
  service: z.string().max(20).nullable().optional(),
  trackingNumber: z.string().max(100).nullable().optional(),
  estimatedDays: z.number().int().min(1).nullable().optional(),
  weight: z.number().min(0.01).nullable().optional(),
});

// Update sale
export const updateSaleSchema = z.object({
  status: z.enum(["PAID", "CANCELLED"]).optional(),
  deliveredAt: z.iso.datetime().optional(),
});

// Payment
// Create payment for order
export const createPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID tidak valid"),
});

// Cart item schemas
// Create cart item
export const createCartItemSchema = z.object({
  productId: z.string().min(1, "Product ID tidak valid"),
  quantity: z.number().int().min(1, "Quantity minimal 1"),
});

// Update cart item
export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantity minimal 1"),
});

// Validate coupon
export const validateCouponSchema = z.object({
  code: z.string().min(3, "Kode kupon minimal 3 karakter").toUpperCase(),
  subtotal: z.number().min(0, "Subtotal tidak boleh negatif"),
  shippingCost: z.number().min(0, "Ongkir tidak boleh negatif").optional(),
});

// Admin update user
export const updateUserSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(100).optional(),
  email: z.email("Email tidak valid").optional(),
  phone: z
    .string()
    .regex(/^\d{10,15}$/, "No HP harus 10-15 digit")
    .optional(),
  role: z.enum(["CUSTOMER", "FLORIST", "SUPPLIER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

// Notification schemas
export const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID tidak valid"),
  title: z.string().min(1, "Judul wajib diisi").max(200),
  message: z.string().min(1, "Pesan wajib diisi").max(1000),
  type: z.string().max(50).optional(),
  link: z.string().max(500).optional(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean(),
});
