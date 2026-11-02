# Graph Report - florahub  (2026-10-31)

## Corpus Check
- 305 files · ~151,800 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 1, .ico 1, .css 1)

## Summary
- 426 nodes · 797 edges · 52 communities (18 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 48
- Community 49
- Community 50
- Community 51

## God Nodes (most connected - your core abstractions)
1. `next` - 55 edges
2. `requireAuth()` - 48 edges
3. `zod` - 34 edges
4. `compilerOptions` - 16 edges
5. `cn` - 12 edges
6. `Product` - 10 edges
7. `@prisma/client` - 10 edges
8. `@base-ui/react` - 10 edges
9. `ProductCard()` - 9 edges
10. `react` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ProductCardProps` --references--> `Product`  [EXTRACTED]
  components/customer/ProductCard.tsx → types/index.ts
- `ProductGridProps` --references--> `Product`  [EXTRACTED]
  components/customer/ProductGrid.tsx → types/index.ts
- `GET()` --calls--> `requireAuth()`  [EXTRACTED]
  app/api/supplier/sales/route.ts → lib/middleware/requireAuth.ts
- `CartStore` --references--> `CartItem`  [EXTRACTED]
  lib/stores/cartStore.ts → types/index.ts
- `CartStore` --references--> `Product`  [EXTRACTED]
  lib/stores/cartStore.ts → types/index.ts

## Import Cycles
- None detected.

## Communities (52 total, 34 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (29): HomePage(), fetchProducts(), ProductCard(), ProductCardProps, ProductGrid(), ProductGridProps, Badge(), badgeVariants (+21 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (9): RouteParams, createAuditLog(), createShipmentSchema, createStockSchema, updateCouponSchema, updateShipmentStatusSchema, updateStockSchema, @prisma/client@^7.10.0 (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (21): dependencies, @base-ui/react@^1.9.0, date-fns@^4.4.0, @hookform/resolvers@^6.0.0, next@^16.4.3, next-auth@^4.24.15, pg@^8.23.0, @prisma/adapter-pg@^7.10.0 (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): devDependencies, @mermaid-js/mermaid-cli@^11.17.0, puppeteer@^25.12.0, tailwindcss@^4, @tailwindcss/postcss@^4, tsx@^4.23.13, @types/bcryptjs@^2.4.6, @types/node@^20 (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (6): Button(), buttonVariants, DialogContent(), DialogFooter(), DialogOverlay(), DialogPortal()

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (13): bcryptjs@^3.0.3, react-hook-form@^7.91.0, zustand@^5.0.16, typescript@^5, name, prisma, seed, private (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (3): GET(), requireAuth(), checkoutSchema

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (5): SelectContent(), SelectScrollDownButton(), SelectScrollUpButton(), lucide-react@^1.61.0, lucide-react

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (4): handler, authOptions, AuthResult, next-auth

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (5): RouteParams, createNotificationSchema, updateNotificationSchema, updatePreorderSchema, updateUserSchema

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (4): geistMono, geistSans, inter, metadata

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (3): cn@^0.5.0, @base-ui/react, cn

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (4): TabsList(), tabsListVariants, class-variance-authority@^0.7.1, class-variance-authority

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (4): snap, createPaymentSchema, midtrans-client@^1.4.3, midtrans-client

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.3.5, eslint, eslint-config-next

### Community 27 - "Community 27"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

## Knowledge Gaps
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 6` to `Community 0`, `Community 1`, `Community 3`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 13`, `Community 15`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`?**
  _High betweenness centrality (0.308) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Community 30` to `Community 1`, `Community 3`, `Community 8`, `Community 13`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`, `Community 37`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`?**
  _High betweenness centrality (0.101) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 14` to `Community 0`, `Community 7`, `Community 8`, `Community 10`, `Community 16`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._