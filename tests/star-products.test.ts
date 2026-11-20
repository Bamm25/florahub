import test from "node:test";
import assert from "node:assert/strict";
import {
  getStarProducts,
  VALID_STAR_ORDER_STATUSES,
  type StarProductsDb,
} from "../lib/star-products";
import {
  getPublicStoreShowcaseData,
  getStoreDetailMetrics,
  type StoreMetricsDb,
} from "../lib/public-store-metrics";

function createProductFixture(overrides: {
  id: string;
  floristId: string;
  shopName: string;
  city: string;
  name: string;
  price: number;
  isFeatured?: boolean;
}) {
  const now = new Date("2026-11-18T10:00:00Z");
  return {
    id: overrides.id,
    name: overrides.name,
    slug: overrides.id,
    description: `Deskripsi ${overrides.name}`,
    price: overrides.price,
    stock: 12,
    image: `https://images.unsplash.com/${overrides.id}`,
    images: [],
    categoryId: "cat-mawar",
    floristId: overrides.floristId,
    isActive: true,
    isFeatured: overrides.isFeatured ?? false,
    tags: [],
    weight: 500,
    createdAt: now,
    updatedAt: now,
    category: {
      id: "cat-mawar",
      name: "Mawar",
      slug: "mawar",
    },
    florist: {
      id: overrides.floristId,
      name: overrides.shopName,
      floristProfile: {
        shopName: overrides.shopName,
        logo: null,
        defaultAddress: {
          city: overrides.city,
          province: "Jawa Timur",
        },
      },
    },
  };
}

test("getStarProducts mengurutkan produk terlaris lintas seluruh florist & tidak mencampur item tanpa pembelian", async () => {
  const capturedWhere: unknown[] = [];
  const allProducts = [
    createProductFixture({
      id: "prod-florist-a",
      floristId: "florist-a",
      shopName: "Studio Mawar",
      city: "Surabaya",
      name: "Buket Mawar Senja",
      price: 350000,
    }),
    createProductFixture({
      id: "prod-florist-b",
      floristId: "florist-b",
      shopName: "Kebun Malang",
      city: "Malang",
      name: "Rangkaian Peony Pagi",
      price: 420000,
    }),
    createProductFixture({
      id: "prod-unpurchased",
      floristId: "florist-c",
      shopName: "Florist Baru",
      city: "Sidoarjo",
      name: "Buket Belum Terjual",
      price: 250000,
      isFeatured: true,
    }),
  ];

  const fakeDb = {
    orderItem: {
      groupBy: async (args: {
        where: { order: { status: { in: string[] } } };
      }) => {
        capturedWhere.push(args.where);
        assert.deepEqual(args.where.order.status.in, [
          ...VALID_STAR_ORDER_STATUSES,
        ]);
        assert.equal(args.where.order.status.in.includes("PENDING"), false);
        assert.equal(args.where.order.status.in.includes("CANCELLED"), false);
        return [
          { productId: "prod-florist-a", _sum: { quantity: 7 }, _count: { _all: 4 } },
          { productId: "prod-florist-b", _sum: { quantity: 14 }, _count: { _all: 9 } },
        ];
      },
    },
    product: {
      findMany: async (args: { where: { id?: { in: string[] } } }) =>
        allProducts.filter((p) => args.where.id?.in.includes(p.id)),
    },
    review: {
      groupBy: async () => [
        { productId: "prod-florist-b", _avg: { rating: 4.9 }, _count: { _all: 11 } },
      ],
    },
  } as unknown as StarProductsDb;

  const result = await getStarProducts(fakeDb, { limit: 5 });
  assert.equal(capturedWhere.length, 1);
  assert.equal(result.mode, "best-selling");
  // Meski limit=5, hanya 2 produk yang pernah dibeli yang dikembalikan
  assert.deepEqual(
    result.products.map((p) => p.id),
    ["prod-florist-b", "prod-florist-a"],
  );
  assert.equal(result.products[0].soldCount, 14);
  assert.equal(result.products[0].orderCount, 9);
  assert.equal(result.products[0].averageRating, 4.9);
  assert.equal(result.products[1].soldCount, 7);
});

test("getStarProducts memakai fallback featured tanpa memalsukan soldCount jika belum ada transaksi valid", async () => {
  const featured = createProductFixture({
    id: "prod-featured",
    floristId: "florist-a",
    shopName: "Studio Mawar",
    city: "Surabaya",
    name: "Buket Signature",
    price: 300000,
    isFeatured: true,
  });

  const fakeDb = {
    orderItem: {
      groupBy: async () => [],
    },
    product: {
      findMany: async () => [featured],
    },
    review: {
      groupBy: async () => [],
    },
  } as unknown as StarProductsDb;

  const result = await getStarProducts(fakeDb, { limit: 5 });
  assert.equal(result.mode, "featured-fallback");
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].soldCount, 0);
  assert.equal(result.products[0].orderCount, 0);
});

test("getPublicStoreShowcaseData & getStoreDetailMetrics menghitung galeri, kategori, harga terendah, penjualan, dan rating berbobot", async () => {
  const fakeDb = {
    product: {
      findMany: async () => [
        {
          id: "p1",
          floristId: "store-1",
          image: "https://images.unsplash.com/p1",
          price: 250000,
          category: { name: "Mawar" },
        },
        {
          id: "p2",
          floristId: "store-1",
          image: "https://images.unsplash.com/p2",
          price: 180000,
          category: { name: "Tulip" },
        },
        {
          id: "p3",
          floristId: "store-1",
          image: "https://images.unsplash.com/p3",
          price: 320000,
          category: { name: "Mawar" },
        },
      ],
    },
    orderItem: {
      groupBy: async () => [
        { productId: "p1", _sum: { quantity: 3 } },
        { productId: "p3", _sum: { quantity: 10 } },
      ],
    },
    review: {
      groupBy: async () => [
        { productId: "p1", _avg: { rating: 4.0 }, _count: { _all: 1 } },
        { productId: "p3", _avg: { rating: 5.0 }, _count: { _all: 3 } },
      ],
    },
  } as unknown as StoreMetricsDb;

  const showcase = await getPublicStoreShowcaseData(fakeDb, ["store-1"]);
  const storeMetrics = showcase["store-1"];
  assert.ok(storeMetrics);
  assert.equal(storeMetrics.minPrice, 180000);
  assert.equal(storeMetrics.totalSold, 13);
  assert.equal(storeMetrics.reviewCount, 4);
  // Weighted avg = (4*1 + 5*3) / 4 = 4.8 (rounded to 1 decimal: 4.75 -> 4.8)
  assert.equal(storeMetrics.averageRating, 4.8);
  assert.deepEqual(storeMetrics.categories, ["Mawar", "Tulip"]);
  // p3 (terlaris) tampil pertama di previewImages
  assert.equal(storeMetrics.previewImages[0], "https://images.unsplash.com/p3");

  const detail = await getStoreDetailMetrics(fakeDb, ["p1", "p2", "p3"]);
  assert.equal(detail.starProductId, "p3");
  assert.equal(detail.totalSold, 13);
  assert.equal(detail.minPrice, 180000);
  assert.deepEqual(detail.categories, [
    { name: "Mawar", count: 2 },
    { name: "Tulip", count: 1 },
  ]);
  assert.equal(detail.byProductId["p3"]?.soldCount, 10);
});
