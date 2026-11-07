# Graph Report - florahub  (2026-11-04)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 527 nodes · 1091 edges · 46 communities (34 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cfd2b397`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Customer UI & Pages
- Product & Reviews
- Admin Management
- API Routes Core
- Order Management
- Component System
- Dependencies
- Dev Tools
- TypeScript Config
- Florist & Supplier
- Utilities 10
- Utilities 11
- Utilities 12
- Utilities 13
- Utilities 14
- Utilities 15
- Utilities 16
- Utilities 18
- Utilities 20
- Utilities 21
- Utilities 22
- Utilities 23
- Utilities 24
- Utilities 25
- Utilities 26
- Utilities 27
- Utilities 28
- Utilities 29
- Utilities 30
- Utilities 31
- Utilities 32
- Utilities 33
- Utilities 34
- Utilities 35
- Utilities 36
- Utilities 37
- Utilities 38
- Utilities 39
- Utilities 40
- Utilities 41
- Utilities 42
- Utilities 43
- Utilities 44
- Utilities 45

## God Nodes (most connected - your core abstractions)
1. `requireAuth()` - 120 edges
2. `next` - 71 edges
3. `zod` - 34 edges
4. `react` - 24 edges
5. `lucide-react` - 23 edges
6. `next-auth` - 17 edges
7. `compilerOptions` - 16 edges
8. `useCartStore` - 13 edges
9. `cn` - 12 edges
10. `createAuditLog()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/admin/coupons/route.ts → lib/middleware/requireAuth.ts
- `POST()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/admin/coupons/route.ts → lib/middleware/requireAuth.ts
- `PATCH()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/admin/users/[id]/route.ts → lib/middleware/requireAuth.ts
- `PATCH()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/supplier/preorders/[id]/route.ts → lib/middleware/requireAuth.ts
- `POST()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/customer/checkout/route.ts → lib/middleware/requireAuth.ts

## Import Cycles
- None detected.

## Communities (46 total, 12 thin omitted)

### Community 0 - "Customer UI & Pages"
Cohesion: 0.06
Nodes (42): CartPage(), Address, CheckoutPage(), loadAddresses(), CustomerLayout(), Address, AddressManagementPage(), loadAddresses() (+34 more)

### Community 1 - "Product & Reviews"
Cohesion: 0.06
Nodes (37): HomePage(), fetchProducts(), ProductDetail, ProductDetailPage(), fetchData(), ProductCard(), ProductCardProps, ProductGrid() (+29 more)

### Community 2 - "Admin Management"
Cohesion: 0.09
Nodes (26): GET(), GET(), GET(), GET(), DELETE(), GET(), PUT(), RouteParms (+18 more)

### Community 3 - "API Routes Core"
Cohesion: 0.08
Nodes (24): POST(), DELETE(), PATCH(), POST(), POST(), DELETE(), PUT(), POST() (+16 more)

### Community 4 - "Order Management"
Cohesion: 0.15
Nodes (19): OrderDetail, OrderDetailPage(), loadOrder(), OrderDetail, OrderTrackingPage(), loadTrackingData(), TimelineEvent, OrderHistoryPage() (+11 more)

### Community 5 - "Component System"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, date-fns@^4.4.0, lucide-react@^1.61.0, next@^16.4.3, next-auth@^4.24.15, pg@^8.23.0, @prisma/adapter-pg@^7.10.0, react@19.2.8 (+12 more)

### Community 7 - "Dev Tools"
Cohesion: 0.11
Nodes (19): devDependencies, @mermaid-js/mermaid-cli@^11.17.0, puppeteer@^25.12.0, tailwindcss@^4, @tailwindcss/postcss@^4, tsx@^4.23.13, @types/bcryptjs@^2.4.6, @types/node@^20 (+11 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 9 - "Florist & Supplier"
Cohesion: 0.18
Nodes (12): PUT(), GET(), POST(), DELETE(), GET(), PUT(), GET(), POST() (+4 more)

### Community 10 - "Utilities 10"
Cohesion: 0.21
Nodes (6): Button(), buttonVariants, DialogContent(), DialogFooter(), DialogOverlay(), DialogPortal()

### Community 11 - "Utilities 11"
Cohesion: 0.15
Nodes (10): GET(), POST(), PATCH(), PATCH(), RouteParams, createCouponSchema, updatePreorderSchema, updateUserSchema (+2 more)

### Community 12 - "Utilities 12"
Cohesion: 0.27
Nodes (7): handler, POST(), GET(), authOptions, AuthResult, checkoutSchema, next-auth

### Community 13 - "Utilities 13"
Cohesion: 0.17
Nodes (11): bcryptjs@^3.0.3, @hookform/resolvers@^6.0.0, tw-animate-css@^1.4.0, name, prisma, seed, private, version (+3 more)

### Community 14 - "Utilities 14"
Cohesion: 0.22
Nodes (7): geistMono, geistSans, inter, metadata, RootLayout(), AuthProvider(), AuthProviderProps

### Community 15 - "Utilities 15"
Cohesion: 0.24
Nodes (3): SelectContent(), SelectScrollDownButton(), SelectScrollUpButton()

### Community 16 - "Utilities 16"
Cohesion: 0.25
Nodes (4): @base-ui/react@^1.9.0, cn@^0.5.0, @base-ui/react, cn

### Community 18 - "Utilities 18"
Cohesion: 0.33
Nodes (5): POST(), snap, createPaymentSchema, midtrans-client@^1.4.3, midtrans-client

### Community 20 - "Utilities 20"
Cohesion: 0.33
Nodes (5): DELETE(), GET(), PUT(), RouteParams, updateCouponSchema

### Community 21 - "Utilities 21"
Cohesion: 0.33
Nodes (4): DELETE(), PUT(), RouteParams, updateHarvestAnnouncementSchema

### Community 23 - "Utilities 23"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.5, eslint, eslint-config-next

### Community 24 - "Utilities 24"
Cohesion: 0.40
Nodes (3): DELETE(), PUT(), updateCategorySchema

### Community 25 - "Utilities 25"
Cohesion: 0.40
Nodes (4): DELETE(), PUT(), RouteParams, updateReviewSchema

### Community 26 - "Utilities 26"
Cohesion: 0.40
Nodes (4): DELETE(), GET(), PUT(), updateInventorySchema

### Community 27 - "Utilities 27"
Cohesion: 0.40
Nodes (3): POST(), RouteParams, createReviewSchema

### Community 28 - "Utilities 28"
Cohesion: 0.40
Nodes (3): DELETE(), PUT(), updateProductSchema

### Community 29 - "Utilities 29"
Cohesion: 0.50
Nodes (4): Badge(), badgeVariants, class-variance-authority@^0.7.1, class-variance-authority

### Community 30 - "Utilities 30"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 32 - "Utilities 32"
Cohesion: 0.50
Nodes (3): GET(), POST(), createAddressSchema

### Community 33 - "Utilities 33"
Cohesion: 0.50
Nodes (3): GET(), POST(), createInventorySchema

### Community 34 - "Utilities 34"
Cohesion: 0.50
Nodes (3): GET(), POST(), createPreorderSchema

### Community 35 - "Utilities 35"
Cohesion: 0.50
Nodes (3): GET(), POST(), createProductComponentSchema

### Community 36 - "Utilities 36"
Cohesion: 0.50
Nodes (3): GET(), PUT(), updatePurchaseSchema

### Community 37 - "Utilities 37"
Cohesion: 0.50
Nodes (3): GET(), POST(), createPurchaseSchema

## Knowledge Gaps
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Product & Reviews` to `Customer UI & Pages`, `Admin Management`, `API Routes Core`, `Order Management`, `Dependencies`, `Florist & Supplier`, `Utilities 11`, `Utilities 12`, `Utilities 13`, `Utilities 14`, `Utilities 18`, `Utilities 20`, `Utilities 21`, `Utilities 24`, `Utilities 25`, `Utilities 26`, `Utilities 27`, `Utilities 28`, `Utilities 32`, `Utilities 33`, `Utilities 34`, `Utilities 35`, `Utilities 36`, `Utilities 37`?**
  _High betweenness centrality (0.361) - this node is a cross-community bridge._
- **Should `Customer UI & Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.0597567424643046 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Customer UI & Pages` to `Product & Reviews`, `Order Management`, `Dependencies`, `Utilities 10`, `Utilities 13`, `Utilities 14`, `Utilities 15`, `Utilities 16`, `Utilities 17`, `Utilities 19`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `Product & Reviews` be split into smaller, more focused modules?**
  _Cohesion score 0.06464646464646465 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Customer UI & Pages` to `Product & Reviews`, `Order Management`, `Dependencies`, `Utilities 10`, `Utilities 13`, `Utilities 15`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Admin Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08527131782945736 - nodes in this community are weakly interconnected._
- **Should `API Routes Core` be split into smaller, more focused modules?**
  _Cohesion score 0.07823613086770982 - nodes in this community are weakly interconnected._